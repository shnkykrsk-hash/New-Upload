import { supabase } from "./lib/supabase.js";

// The frontend calls this to find out how many paid ideas a channel currently
// has unlocked. This number only ever goes up from the Razorpay webhook
// (see razorpay-webhook.js) — never from anything the browser tells us.
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { channelKey } = req.query;
  if (!channelKey) {
    return res.status(400).json({ error: "channelKey required" });
  }

  const { data, error } = await supabase
    .from("entitlements")
    .select("ideas_remaining")
    .eq("channel_id", channelKey)
    .maybeSingle();

  if (error) {
    return res.status(500).json({ error: "Something went wrong." });
  }

  return res.status(200).json({ ideasRemaining: data ? data.ideas_remaining : 0 });
}
