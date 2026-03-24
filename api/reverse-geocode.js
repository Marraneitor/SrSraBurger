// Vercel Serverless Function: reverse geocoding proxy via Nominatim (OpenStreetMap)
// Used by cliente-location.js when the user moves the pin.

const { applyCors, checkRateLimit, getClientIp } = require('./_security');

module.exports = async (req, res) => {
  try {
    applyCors(req, res);

    if (req.method === 'OPTIONS') {
      return res.status(200).json({ ok: true });
    }
    if (req.method !== 'GET') {
      return res.status(405).json({ ok: false, error: 'Method not allowed' });
    }

    // Rate limit: máx 30 req/min por IP
    const ip = getClientIp(req);
    if (!checkRateLimit(ip, 'reverse-geocode', { max: 30, windowMs: 60000 })) {
      return res.status(429).json({ ok: false, error: 'Demasiadas solicitudes. Intenta más tarde.' });
    }

    const lat = Number((req.query && (req.query.lat ?? req.query.latitude)) || NaN);
    const lng = Number((req.query && (req.query.lng ?? req.query.lon ?? req.query.longitude)) || NaN);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({ ok: false, error: 'Missing lat/lng' });
    }

    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${encodeURIComponent(
      lat
    )}&lon=${encodeURIComponent(lng)}&zoom=18&addressdetails=1`;

    const r = await fetch(url, {
      headers: {
        'Accept-Language': 'es',
        'User-Agent': 'sr-sra-burger/1.0 (+https://github.com/Marraneitor/SRBURGER)'
      }
    });

    if (!r.ok) return res.status(r.status).json({ ok: false, error: `Upstream ${r.status}` });
    const data = await r.json();
    return res.json({ ok: true, data });
  } catch (e) {
    return res
      .status(500)
      .json({ ok: false, error: e && e.message ? e.message : 'reverse-geocode-failed' });
  }
};
