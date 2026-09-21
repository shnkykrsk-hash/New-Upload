import crypto from "crypto";
import { supabase } from "./lib/supabase.js";

// This is the source of truth for "did this person actually pay". Razorpay
// calls this URL directly from their servers after a payment — the browser
// is never involved and can't fake this request, because every call is
// checked against RAZORPAY_WEBHOOK_SECRET before anything is trusted.
//
// Set this URL in the Razorpay dashboard: Settings -> Webhooks
//   URL: https://<your-vercel-domain>/api/razorpay-webhook
//   Active events: payment.captured

export const config = {
  api: { bodyParser: false } // we need the raw body to verify the signature
};

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

const PACK_IDEAS = { "Quick pack": 2, "Week pack": 7, "Bumper pack": 15 };

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).end();
  }

  const rawBody = await readRawBody(req);
  const signature = req.headers["x-razorpay-signature"];
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");

  if (!signature || signature !== expectedSignature) {
    return res.status(400).json({ error: "Invalid signature" });
  }

  const event = JSON.parse(rawBody);

  if (event.event === "payment.captured") {
    const payment = event.payload.payment.entity;
    const orderId = payment.order_id;

    const { data: txn } = await supabase
      .from("transactions")
      .select("*")
      .eq("razorpay_order_id", orderId)
      .maybeSingle();

    // Guard against Razorpay retrying the same webhook delivery — only
    // unlock once per transaction, even if this handler runs twice.
    if (txn && txn.status !== "paid") {
      await supabase
        .from("transactions")
        .update({ status: "paid", razorpay_payment_id: payment.id })
        .eq("razorpay_order_id", orderId);

      const ideasToAdd = PACK_IDEAS[txn.pack_name] || 0;

      const { data: existingEntitlement } = await supabase
        .from("entitlements")
        .select("ideas_remaining")
        .eq("channel_id", txn.channel_id)
        .maybeSingle();

      const newTotal = (existingEntitlement ? existingEntitlement.ideas_remaining : 0) + ideasToAdd;

      await supabase.from("entitlements").upsert({
        channel_id: txn.channel_id,
        ideas_remaining: newTotal,
        updated_at: new Date().toISOString()
      });
    }
  }

  // Always 200 back to Razorpay so it doesn't keep retrying a delivery
  // we've already handled (or don't recognise).
  return res.status(200).json({ received: true });
}
