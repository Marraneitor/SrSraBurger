// Vercel Serverless Function: /api/admin/botconf
// GET  — devuelve el prompt actual del chatbot
// POST — guarda el prompt personalizado en Firestore
// Requiere env var: FIREBASE_SERVICE_ACCOUNT_JSON

const firebaseAdmin = require('firebase-admin');
const { applyCors, requireAdminKey } = require('../_security');

// ── Firebase Admin ────────────────────────────────────────────────────────────
let _app = null;
function getFirebaseAdminApp() {
  if (_app) return _app;
  const jsonEnv = (process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '').trim();
  if (!jsonEnv) return null;
  try {
    const parsed = JSON.parse(jsonEnv);
    _app = firebaseAdmin.apps && firebaseAdmin.apps.length
      ? firebaseAdmin.app()
      : firebaseAdmin.initializeApp({ credential: firebaseAdmin.credential.cert(parsed) });
    return _app;
  } catch (_) { return null; }
}

// ── Prompt por defecto ────────────────────────────────────────────────────────
const CHATBOT_PROMPT_DEFAULT = `Eres Burgy 🍔, el asistente guía de **Sr. y Sra. Burger** — dark kitchen de hamburguesas artesanales en Minatitlán, Veracruz, México.
Tu función: orientar y resolver dudas sobre la página y el restaurante. NO tomas pedidos — los pedidos se hacen usando el carrito de la web. Sé amable y directo. Responde SIEMPRE en español. Usa emojis con moderación. Sé breve (máx. 4-5 líneas salvo que el tema requiera más).
━━━━ MENÚ Y PRECIOS ━━━━
🍔 HAMBURGUESAS: Sencilla $90 | Premium $105 | BBQ Beacon $115 | Alohawai $120 | Chistorraburger $125 | Salchiburger $125 | Choriargentina $125 | Guacamole $140 | Boneless Burger $150
🌭 HOT DOGS: Hot Dog Jumbo $65
🎁 COMBOS: Combo Duo $190 | Triple Dog $215 | Combo Boneless $215 | Combo Amigos $380 | Combo Familiar $680
🍟 COMPLEMENTOS: Papas Francesas/Gajo M $65/XL $130 | Salchipapas Parmesanas M $90/XL $140 | Aros de Cebolla M $50/XL $95
━━━━ ENVÍO ━━━━
Recoger en local: GRATIS — Coahuila #36, Col. Emiliano Zapata, Minatitlán, Ver.
Envío a domicilio: $8/km, máx. 12 km (se calcula automáticamente en la web).
━━━━ CONTACTO ━━━━
📞 Tel/WhatsApp: 922 159 3688 | Instagram: @srysraburger | TikTok: @srsra.burger
━━━━ RESTRICCIONES ━━━━
NUNCA inventes productos o precios. NUNCA tomes pedidos directamente — redirige al carrito. Si no sabes algo, sugiere llamar al 922 159 3688.`;

// ── Caché en memoria ──────────────────────────────────────────────────────────
let _cache = { text: null, expiresAt: 0 };
const CACHE_TTL = 5 * 60 * 1000;

async function getCachedPrompt(forceReload = false) {
  if (!forceReload && Date.now() < _cache.expiresAt) return _cache.text;
  try {
    const admin = getFirebaseAdminApp();
    if (admin) {
      const db = admin.firestore();
      const snap = await db.collection('settings').doc('chatbot_config').get();
      if (snap.exists && snap.data()?.systemPrompt) {
        const text = String(snap.data().systemPrompt).trim();
        _cache = { text, expiresAt: Date.now() + CACHE_TTL };
        return text;
      }
    }
  } catch (_) {}
  _cache = { text: null, expiresAt: Date.now() + CACHE_TTL };
  return null;
}

// ── Handler ───────────────────────────────────────────────────────────────────
module.exports = async function handler(req, res) {
  applyCors(req, res);

  if (req.method === 'OPTIONS') return res.status(204).end();

  // GET — devuelve el prompt actual
  if (req.method === 'GET') {
    try {
      const custom = await getCachedPrompt();
      return res.json({
        ok: true,
        systemPrompt: custom !== null ? custom : CHATBOT_PROMPT_DEFAULT,
        isDefault: custom === null,
      });
    } catch (e) {
      return res.status(500).json({ ok: false, error: e.message });
    }
  }

  // POST — guarda el prompt (requiere ADMIN_KEY)
  if (req.method === 'POST') {
    if (!requireAdminKey(req, res)) return;
    try {
      const text = String(req.body?.systemPrompt || '').trim();
      if (!text) return res.status(400).json({ ok: false, error: 'systemPrompt no puede estar vacío' });

      const admin = getFirebaseAdminApp();
      if (!admin) {
        return res.status(503).json({ ok: false, error: 'Firebase Admin no configurado. Agrega FIREBASE_SERVICE_ACCOUNT_JSON a las variables de entorno de Vercel.' });
      }

      const db = admin.firestore();
      await db.collection('settings').doc('chatbot_config').set({
        systemPrompt: text,
        updatedAt: new Date(),
        updatedBy: 'botconf-api',
      }, { merge: true });

      // Actualizar caché
      _cache = { text, expiresAt: Date.now() + CACHE_TTL };
      return res.json({ ok: true, savedTo: 'firestore' });
    } catch (e) {
      return res.status(500).json({ ok: false, error: e.message });
    }
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ ok: false, error: 'Método no permitido.' });
};
