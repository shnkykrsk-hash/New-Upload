import Razorpay from "razorpay";
import { supabase } from "./lib/supabase.js";

// Keep pack prices and idea counts here, server-side only. The frontend
// sends which pack was picked (a name), never an amount — so nobody can
// open dev tools and pay ₹1 for the ₹99 pack.
const PACKS = {
  quick: { label: "Quick pack", amountPaise: 2000, ideas: 2 },
  week: { label: "Week pack", amountPaise: 4900, ideas: 7 },
  bumper: { label: "Bumper pack", amountPaise: 9900, ideas: 15 }
};

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { channelKey, pack } = req.body || {};
  const packInfo = PACKS[pack];

  if (!channelKey || !packInfo) {
    return res.status(400).json({ error: "Invalid channel or pack." });
  }

  let order;
  try {
    order = await razorpay.orders.create({
      amount: packInfo.amountPaise,
      currency: "INR",
      notes: { channelKey, pack }
    });
  } catch (e) {
    return res.status(500).json({ error: "Could not start payment. Try again." });
  }

  const { error } = await supabase.from("transactions").insert({
    channel_id: channelKey,
    razorpay_order_id: order.id,
    pack_name: packInfo.label,
    amount_paise: packInfo.amountPaise,
    status: "created"
  });

  if (error) {
    return res.status(500).json({ error: "Could not record order. Try again." });
  }

  return res.status(200).json({
    orderId: order.id,
    amount: packInfo.amountPaise,
    keyId: process.env.RAZORPAY_KEY_ID,
    packLabel: packInfo.label
  });
}
