// Simple forwarder API for Next.js to send payload to WordPress endpoint.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const WP_ENDPOINT = process.env.WP_UPLOAD_ENDPOINT || 'https://your-wordpress-site.com/wp-json/custom-photo/v1/upload';
  try {
    const payload = req.body; // JSON posted from frontend
    const r = await fetch(WP_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!r.ok) {
      const txt = await r.text();
      return res.status(502).json({ ok: false, detail: txt });
    }
    const j = await r.json();
    return res.status(200).json(j);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
