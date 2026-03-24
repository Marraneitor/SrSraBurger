// Módulo de seguridad compartido para funciones serverless de Vercel
// Centraliza: CORS, Rate Limiting (best-effort en serverless), Admin Auth

// ── CORS ──────────────────────────────────────────────────────────────────────
// Configura ALLOWED_ORIGIN en Vercel para restringir a tu dominio real.
// Ejemplo: ALLOWED_ORIGIN=https://tu-dominio.vercel.app
const ALLOWED_ORIGIN = (process.env.ALLOWED_ORIGIN || '').trim();

function applyCors(req, res) {
  const origin = ALLOWED_ORIGIN || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  if (origin !== '*') {
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-admin-key');
  res.setHeader('Access-Control-Max-Age', '86400');
}

// ── Rate Limiting (en memoria por instancia serverless) ───────────────────────
// NOTA: En Vercel cada cold start reinicia el Map. Esto protege contra
// ráfagas sostenidas en una misma instancia pero no garantiza límites globales.
// Para rate limiting global usar Upstash Redis u otro store externo.
const _rateLimitMaps = {};

function checkRateLimit(ip, endpoint, { max = 30, windowMs = 60000 } = {}) {
  if (!_rateLimitMaps[endpoint]) _rateLimitMaps[endpoint] = new Map();
  const map = _rateLimitMaps[endpoint];
  const now = Date.now();
  const entry = map.get(ip);
  if (!entry || entry.resetAt < now) {
    map.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= max) return false;
  entry.count++;
  return true;
}

// Limpiar entradas expiradas cada 5 minutos (solo si la instancia vive tanto)
setInterval(() => {
  const now = Date.now();
  for (const endpoint of Object.keys(_rateLimitMaps)) {
    const map = _rateLimitMaps[endpoint];
    for (const [ip, entry] of map) {
      if (entry.resetAt < now) map.delete(ip);
    }
  }
}, 5 * 60 * 1000).unref();

// ── Admin Auth (fail-closed) ──────────────────────────────────────────────────
// Si ADMIN_KEY no está configurada, NIEGA acceso (no falla abierto).
function requireAdminKey(req, res) {
  const expected = (process.env.ADMIN_KEY || '').trim();
  if (!expected) {
    res.status(503).json({ ok: false, error: 'ADMIN_KEY no configurada en el servidor.' });
    return false;
  }
  const provided = String(req.headers['x-admin-key'] || '').trim();
  if (provided && provided === expected) return true;
  res.status(401).json({ ok: false, error: 'No autorizado.' });
  return false;
}

// ── IP helper ─────────────────────────────────────────────────────────────────
function getClientIp(req) {
  return String(req.headers['x-forwarded-for'] || (req.socket && req.socket.remoteAddress) || 'unknown')
    .split(',')[0].trim().replace(/^::ffff:/, '');
}

module.exports = { applyCors, checkRateLimit, requireAdminKey, getClientIp };
