// Pulls real signal from the channel — recent upload titles, subscriber
// count — so Gemini's suggestions are grounded in what this channel
// actually posts, not just guessed from the URL text.
//
// Needs YOUTUBE_API_KEY. If it's missing, or the channel can't be resolved,
// this returns null and the caller falls back to URL-only guessing —
// nothing else in the flow depends on this succeeding.
export async function fetchChannelContext(channelUrl) {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey || !channelUrl) return null;

  try {
    const withScheme = /^https?:\/\//i.test(channelUrl) ? channelUrl : "https://" + channelUrl;
    const u = new URL(withScheme);
    const path = u.pathname.replace(/^\/+/, "").replace(/\/+$/, "");

    let channelsUrl = null;
    if (path.startsWith("channel/")) {
      const id = path.split("/")[1];
      channelsUrl = "https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails&id=" + id + "&key=" + apiKey;
    } else if (path.startsWith("@")) {
      channelsUrl = "https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails&forHandle=" + encodeURIComponent(path) + "&key=" + apiKey;
    } else if (path.startsWith("c/") || path.startsWith("user/")) {
      const name = path.split("/")[1];
      channelsUrl = "https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails&forUsername=" + encodeURIComponent(name) + "&key=" + apiKey;
    } else {
      return null; // not a recognisable channel URL shape (e.g. a single video link)
    }

    const channelsRes = await fetch(channelsUrl);
    const channelsData = await channelsRes.json();
    const channelItem = channelsData.items && channelsData.items[0];
    if (!channelItem) return null;

    const uploadsPlaylistId = channelItem.contentDetails.relatedPlaylists.uploads;
    const videosRes = await fetch(
      "https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=10&playlistId=" + uploadsPlaylistId + "&key=" + apiKey
    );
    const videosData = await videosRes.json();
    const recentTitles = (videosData.items || []).map(function (v) { return v.snippet.title; });

    return {
      title: channelItem.snippet.title,
      description: (channelItem.snippet.description || "").slice(0, 300),
      subscriberCount: channelItem.statistics ? channelItem.statistics.subscriberCount : null,
      recentTitles: recentTitles
    };
  } catch (e) {
    return null;
  }
}
