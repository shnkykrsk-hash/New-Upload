import { supabase } from "./lib/supabase.js";

// Feedback is always saved to Supabase first — that's the durable record.
// Emailing it to you is a best-effort bonus on top: if RESEND_API_KEY or
// FEEDBACK_TO_EMAIL isn't set, or the email call fails, feedback is still
// safely in the database and nothing here breaks for the user.
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { channelKey, message } = req.body || {};
  const text = typeof message === "string" ? message.trim() : "";

  if (!text) {
    return res.status(400).json({ error: "Feedback message required" });
  }

  const { error } = await supabase.from("feedback").insert({
    channel_id: channelKey || null,
    message: text
  });

  if (error) {
    return res.status(500).json({ error: "Could not save feedback." });
  }

  const resendKey = process.env.RESEND_API_KEY;
  const toEmail = process.env.FEEDBACK_TO_EMAIL;
  if (resendKey && toEmail) {
    try {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + resendKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: process.env.FEEDBACK_FROM_EMAIL || "New Upload <onboarding@resend.dev>",
          to: toEmail,
          subject: "New feedback on New Upload",
          text: "Channel: " + (channelKey || "unknown") + "\n\n" + text
        })
      });
    } catch (e) {
      // Best-effort — feedback is already safely stored above either way.
    }
  }

  return res.status(200).json({ saved: true });
}
