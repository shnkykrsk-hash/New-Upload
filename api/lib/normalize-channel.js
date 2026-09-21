// Turns a pasted YouTube URL into a stable, comparable key so the same
// channel is recognised whether the user pastes /@handle, /channel/UC..,
// with or without https://, with or without a trailing slash, etc.
//
// Note: this is a pragmatic MVP identifier, not the real YouTube channel ID.
// Someone could still get a second free run by pasting a differently-shaped
// URL for the same channel (e.g. a video URL instead of the channel URL).
// Resolving the *true* channel ID needs a YouTube Data API call — swap this
// function out for that later if abuse becomes a real problem.
export function normalizeChannelKey(rawUrl) {
  if (!rawUrl || typeof rawUrl !== "string") return null;
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  try {
    const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : "https://" + trimmed;
    const u = new URL(withScheme);
    const host = u.hostname.toLowerCase().replace(/^www\./, "");
    const path = u.pathname.replace(/\/+$/, "").toLowerCase();
    if (!host.includes("youtube.com") && !host.includes("youtu.be")) return null;
    return host + path;
  } catch (e) {
    return null;
  }
}
