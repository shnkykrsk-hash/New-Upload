import { supabase } from "./lib/supabase.js";
import { generateIdeas } from "./lib/gemini.js";
import { fetchChannelContext } from "./lib/youtube.js";
import { generateThumbnails } from "./lib/thumbnails.js";

// Called after the frontend sees ideas_remaining > 0 (via check-entitlement).
// This is also backend-checked and backend-decremented — the frontend can't
// call this to get free ideas, because it only returns something when the
// database says a paid balance actually exists.
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { channelKey } = req.body || {};
  if (!channelKey) {
    return res.status(400).json({ error: "channelKey required" });
  }

  const { data: entitlement, error } = await supabase
    .from("entitlements")
    .select("ideas_remaining")
    .eq("channel_id", channelKey)
    .maybeSingle();

  if (error) {
    return res.status(500).json({ error: "Something went wrong." });
  }

  const count = entitlement ? entitlement.ideas_remaining : 0;
  if (!count || count <= 0) {
    return res.status(200).json({ redeemed: false, ideas: [] });
  }

  const { data: channelRow } = await supabase
    .from("channels")
    .select("channel_url")
    .eq("channel_id", channelKey)
    .maybeSingle();

  const channelUrl = channelRow ? channelRow.channel_url : channelKey;
  const channelContext = await fetchChannelContext(channelUrl);
  const { ideas, trendingHashtags } = await generateIdeas(channelUrl, count, channelContext);
  const ideasWithThumbnails = ideas.map(function (idea) {
    return { ...idea, thumbnails: generateThumbnails(idea.title) };
  });

  await supabase
    .from("entitlements")
    .update({ ideas_remaining: 0, updated_at: new Date().toISOString() })
    .eq("channel_id", channelKey);

  return res.status(200).json({ redeemed: true, ideas: ideasWithThumbnails, trendingHashtags });
}
