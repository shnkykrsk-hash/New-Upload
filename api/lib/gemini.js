// Generates real video ideas + a shared trending-hashtags list via Gemini,
// grounded in real channel data when available (see lib/youtube.js). If
// GEMINI_API_KEY isn't set, or the call fails, this quietly falls back —
// payment and free-limit logic never depend on this succeeding.
export async function generateIdeas(channelUrl, count, channelContext) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return fallback(count);

  const contextBlock = channelContext
    ? "Channel name: " + channelContext.title + "\n" +
      "Subscribers: " + (channelContext.subscriberCount || "unknown") + "\n" +
      "Recent upload titles: " + (channelContext.recentTitles || []).join(", ") + "\n"
    : "";

  const prompt =
    "You suggest YouTube video ideas.\n" + contextBlock +
    "Channel link: " + channelUrl + "\n" +
    (channelContext
      ? "Base your suggestions on this channel's real recent uploads and niche.\n"
      : "Guess their niche from the channel name/handle in the URL.\n") +
    "Suggest exactly " + count + " distinct next-video ideas, plus a shared list of 6 trending or related hashtags for this niche.\n" +
    "Return ONLY JSON, no prose, no markdown fences, in exactly this shape:\n" +
    '{"ideas": [{"title": string, "tags": [string, string, string], "reasoning": string (one short sentence)}], ' +
    '"trendingHashtags": [string, string, string, string, string, string]}';

  try {
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + apiKey,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" }
        })
      }
    );
    const data = await response.json();
    const text = data && data.candidates && data.candidates[0] && data.candidates[0].content
      ? data.candidates[0].content.parts[0].text
      : null;
    if (!text) return fallback(count);

    const parsed = JSON.parse(text);
    const ideas = Array.isArray(parsed.ideas) ? parsed.ideas.slice(0, count) : [];
    if (!ideas.length) return fallback(count);

    return {
      ideas: ideas.map(function (idea) {
        return {
          title: idea.title || "Video idea for your channel",
          tags: Array.isArray(idea.tags) ? idea.tags.slice(0, 5) : ["#tag"],
          reasoning: idea.reasoning || "Based on your channel's niche."
        };
      }),
      trendingHashtags: Array.isArray(parsed.trendingHashtags) ? parsed.trendingHashtags.slice(0, 8) : []
    };
  } catch (e) {
    return fallback(count);
  }
}

function fallback(count) {
  return {
    ideas: Array.from({ length: count }, function (_, i) {
      return {
        title: "Video idea #" + (i + 1) + " for your channel",
        tags: ["#tag", "#tag", "#tag"],
        reasoning: "Reasoning based on what's working on your channel."
      };
    }),
    trendingHashtags: ["#youtube", "#contentcreator"]
  };
}
