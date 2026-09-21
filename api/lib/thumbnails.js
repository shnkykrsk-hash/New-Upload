// Produces 3 thumbnail *concepts* per idea — bold color background + the
// title as large text, in 3 different layouts/palettes — as inline SVG data
// URIs. No external image API, no cost, no API key: this is a layout/color
// concept to react to, not a photorealistic AI-generated thumbnail. If real
// photo-style thumbnails are wanted later, that needs a paid image model
// (e.g. Gemini's image generation or DALL-E) wired in here instead.
const THEMES = [
  { colors: ["#FF512F", "#F09819"], align: "middle", x: 640 },
  { colors: ["#1B5FC4", "#12B5B0"], align: "end", x: 1220 },
  { colors: ["#8E2DE2", "#4A00E0"], align: "start", x: 60 }
];

export function generateThumbnails(title) {
  return THEMES.map(function (theme, i) {
    return svgThumbnail(title || "Video idea", theme, i);
  });
}

function escapeXml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function wrapLines(text, maxCharsPerLine) {
  const words = String(text).split(" ");
  const lines = [];
  let current = "";
  words.forEach(function (w) {
    const candidate = (current + " " + w).trim();
    if (candidate.length > maxCharsPerLine && current) {
      lines.push(current);
      current = w;
    } else {
      current = candidate;
    }
  });
  if (current) lines.push(current);
  return lines.slice(0, 3);
}

function svgThumbnail(title, theme, idx) {
  const lines = wrapLines(title, 18);
  const lineHeight = 66;
  const startY = 360 - ((lines.length - 1) * lineHeight) / 2;
  const tspans = lines
    .map(function (line, i) {
      return '<tspan x="' + theme.x + '" y="' + (startY + i * lineHeight) + '">' + escapeXml(line) + "</tspan>";
    })
    .join("");

  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">' +
    '<defs><linearGradient id="g' + idx + '" x1="0" y1="0" x2="1" y2="1">' +
    '<stop offset="0%" stop-color="' + theme.colors[0] + '"/>' +
    '<stop offset="100%" stop-color="' + theme.colors[1] + '"/>' +
    "</linearGradient></defs>" +
    '<rect width="1280" height="720" fill="url(#g' + idx + ')"/>' +
    '<text text-anchor="' + theme.align + '" font-family="Arial, sans-serif" font-weight="800" font-size="66" fill="#ffffff">' +
    tspans +
    "</text>" +
    "</svg>";

  const base64 = Buffer.from(svg, "utf8").toString("base64");
  return "data:image/svg+xml;base64," + base64;
}
