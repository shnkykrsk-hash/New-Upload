import { supabase } from "./lib/supabase.js";
import { normalizeChannelKey } from "./lib/normalize-channel.js";
import { generateIdeas } from "./lib/gemini.js";
import { fetchChannelContext } from "./lib/youtube.js";
import { generateThumbnails } from "./lib/thumbnails.js";

// This is the function the whole "same user baar baar free wala use kar lega"
// problem hinges on. The frontend NEVER decides whether free ideas are shown —
// it only asks this endpoint, and this endpoint is the one place that checks
// and writes free_used in the database. A user opening dev tools and calling
// this endpoint directly gets the exact same block a normal user would.
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { channelUrl } = req.body || {};
  const channelKey = normalizeChannelKey(channelUrl);

  if (!channelKey) {
    return res.status(400).json({ error: "Paste a valid YouTube channel link." });
  }

  const { data: existing, error: readError } = await supabase
    .from("channels")
    .select("channel_id, free_used")
    .eq("channel_id", channelKey)
    .maybeSingle();

  if (readError) {
    return res.status(500).json({ error: "Something went wrong. Try again." });
  }

  if (existing && existing.free_used) {
    // Already used — do not generate or return anything free, ever.
    return res.status(200).json({
      allowed: false,
      channelKey,
      reason: "free_used"
    });
  }

  const { error: writeError } = existing
    ? await supabase.from("channels").update({ free_used: true }).eq("channel_id", channelKey)
    : await supabase.from("channels").insert({ channel_id: channelKey, channel_url: channelUrl, free_used: true });

  if (writeError) {
    return res.status(500).json({ error: "Something went wrong. Try again." });
  }

  // Real ideas from Gemini, grounded in the channel's actual recent uploads
  // when YOUTUBE_API_KEY is set, with a built-in fallback either way — the
  // free-limit logic above is unaffected regardless of whether this succeeds.
  const channelContext = await fetchChannelContext(channelUrl);
  const { ideas, trendingHashtags } = await generateIdeas(channelUrl, 2, channelContext);
  const ideasWithThumbnails = ideas.map(function (idea) {
    return { ...idea, thumbnails: generateThumbnails(idea.title) };
  });

  return res.status(200).json({ allowed: true, channelKey, ideas: ideasWithThumbnails, trendingHashtags });
}
