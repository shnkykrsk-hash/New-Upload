// Vercel serverless function: /api/ideas
// Put this file at  api/ideas.js  in your repo.
// Needs env vars in Vercel: GEMINI_API_KEY  (optional: GEMINI_MODEL)

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Use POST' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY is not set' });
  }

  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

  // Channel info sent from the frontend (or fetched via YouTube Data API later)
  const { channelName = '', description = '', recentTitles = [] } = req.body || {};
  if (!channelName && recentTitles.length === 0) {
    return res.status(400).json({ error: 'Send channelName and/or recentTitles' });
  }

  const prompt = `
You are a YouTube growth strategist.
Channel name: ${channelName}
Channel description: ${description}
Recent video titles: ${recentTitles.join(' | ')}

Suggest exactly 2 NEW video ideas this channel should make next.
Return ONLY JSON in this shape:
{
  "ideas": [
    {
      "title": "video title",
      "why": "one line on why this will work",
      "thumbnails": ["thumbnail concept 1", "thumbnail concept 2", "thumbnail concept 3"],
      "hashtags": ["#tag1", "#tag2", "#tag3", "#tag4", "#tag5"]
    }
  ]
}`;

  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json' },
        }),
      }
    );

    if (!r.ok) {
      const detail = await r.text();
      return res.status(502).json({ error: 'Gemini request failed', detail });
    }

    const data = await r.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    const clean = text.replace(/```json|```/g, '').trim();
    return res.status(200).json(JSON.parse(clean));
  } catch (err) {
    return res.status(500).json({ error: 'Server error', detail: String(err) });
  }
};
