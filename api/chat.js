// Vercel Serverless Function: /api/chat — Asistente Burgy con Gemini
// Requiere env vars:
//   GEMINI_API_KEY
//   FIREBASE_SERVICE_ACCOUNT_JSON (opcional — para prompt personalizado desde Firestore)

const firebaseAdmin = require('firebase-admin');

// ── Firebase Admin (opcional) ────────────────────────────────────────────────
let _firebaseAdminApp = null;
function getFirebaseAdminApp() {
  if (_firebaseAdminApp) return _firebaseAdminApp;
  const jsonEnv = (process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '').trim();
  if (!jsonEnv) return null;
  try {
    const parsed = JSON.parse(jsonEnv);
    _firebaseAdminApp = firebaseAdmin.apps && firebaseAdmin.apps.length
      ? firebaseAdmin.app()
      : firebaseAdmin.initializeApp({ credential: firebaseAdmin.credential.cert(parsed) });
    return _firebaseAdminApp;
  } catch (_) { return null; }
}

// ── Rate limiting (en memoria por instancia serverless) ──────────────────────
const _chatRateLimit = new Map();
const CHAT_RATE = { window: 60_000, max: 15 };

function checkChatRateLimit(ip) {
  const now = Date.now();
  const entry = _chatRateLimit.get(ip);
  if (!entry || entry.resetAt < now) {
    _chatRateLimit.set(ip, { count: 1, resetAt: now + CHAT_RATE.window });
    return true;
  }
  if (entry.count >= CHAT_RATE.max) return false;
  entry.count++;
  return true;
}

// ── Prompt del chatbot ───────────────────────────────────────────────────────
function buildStatusSection() {
  const nowMX = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Mexico_City' }));
  const dayOfWeek = nowMX.getDay();
  const hour = nowMX.getHours();
  const timeDecimal = hour + nowMX.getMinutes() / 60;
  let isOpen = false;
  if (dayOfWeek === 1) { isOpen = false; }
  else if (dayOfWeek >= 2 && dayOfWeek <= 5) { isOpen = timeDecimal >= 18 && timeDecimal < 22; }
  else { isOpen = timeDecimal >= 16 && timeDecimal < 22; }
  const statusNote = isOpen
    ? '✅ El local está ABIERTO ahora mismo.'
    : '🌙 El local está CERRADO en este momento. Informa el horario si te preguntan.';
  return `━━━━ ESTADO DEL LOCAL ━━━━\n${statusNote}\nHorario: Lunes CERRADO | Mar–Vie 18:00–22:00 | Sáb–Dom 16:00–22:00`;
}

const CHATBOT_PROMPT_DEFAULT = `Eres Burgy 🍔, el asistente guía de **Sr. y Sra. Burger** — dark kitchen de hamburguesas artesanales en Minatitlán, Veracruz, México.
Tu función: orientar y resolver dudas sobre la página y el restaurante. NO tomas pedidos — los pedidos se hacen usando el carrito de la web. Sé amable y directo. Responde SIEMPRE en español. Usa emojis con moderación. Sé breve (máx. 4-5 líneas salvo que el tema requiera más).
━━━━ 1. CÓMO HACER UN PEDIDO ━━━━
Cuando alguien quiera pedir, explica estos pasos:
1. Pulsa "Mostrar menú" para ver el catálogo.
2. Abre la categoría deseada (Hamburguesas, Hot Dogs, Combos, Complementos).
3. Pulsa el producto → "Personalizar" o "Agregar" directo al carrito.
4. Abre el carrito → "Tu Pedido" → pulsa "Ordenar ahora".
5. Completa el checkout: datos → entrega → método de pago → "Confirmar por WhatsApp".
Tiempo estimado: 25–35 min 🎉
━━━━ 2. MENÚ Y PRECIOS ━━━━
🍔 HAMBURGUESAS: Sencilla $90 | Premium $105 | BBQ Beacon $115 | Alohawai $120 | Chistorraburger $125 | Salchiburger $125 | Choriargentina $125 | Guacamole $140 | Boneless Burger $150
🌭 HOT DOGS: Hot Dog Jumbo $65
🎁 COMBOS: Combo Duo $190 | Triple Dog $215 | Combo Boneless $215 | Combo Amigos $380 | Combo Familiar $680
🍟 COMPLEMENTOS: Papas Francesas/Gajo M $65/XL $130 | Salchipapas Parmesanas M $90/XL $140 | Aros de Cebolla M $50/XL $95
━━━━ 3. ENVÍO ━━━━
Recoger en local: GRATIS — Coahuila #36, Col. Emiliano Zapata, Minatitlán, Ver.
Envío a domicilio: $8/km, máx. 12 km (se calcula automáticamente en la web).
━━━━ 4. CONTACTO ━━━━
📞 Tel/WhatsApp: 922 159 3688 | Instagram: @srysraburger | TikTok: @srsra.burger
━━━━ 5. RESTRICCIONES ━━━━
— Solo responde temas relacionados con el restaurante o la página.
— NUNCA inventes productos, precios ni zonas de entrega.
— NUNCA tomes un pedido directamente — siempre redirige al carrito de la web.
— Si no sabes algo, sugiere llamar al 922 159 3688.`;

// Caché del prompt personalizado
let _chatbotPromptCache = { text: null, expiresAt: 0 };
const CHATBOT_PROMPT_CACHE_TTL = 5 * 60 * 1000;

async function getCachedCustomPrompt() {
  if (Date.now() < _chatbotPromptCache.expiresAt) return _chatbotPromptCache.text;
  try {
    const admin = getFirebaseAdminApp();
    if (admin) {
      const db = admin.firestore();
      const snap = await db.collection('settings').doc('chatbot_config').get();
      if (snap.exists && snap.data()?.systemPrompt) {
        const text = String(snap.data().systemPrompt).trim();
        _chatbotPromptCache = { text, expiresAt: Date.now() + CHATBOT_PROMPT_CACHE_TTL };
        return text;
      }
    }
  } catch (_) {}
  _chatbotPromptCache = { text: null, expiresAt: Date.now() + CHATBOT_PROMPT_CACHE_TTL };
  return null;
}

async function buildChatSystemPrompt() {
  const statusSection = buildStatusSection();
  const customBody = await getCachedCustomPrompt();
  const body = customBody || CHATBOT_PROMPT_DEFAULT;
  return `${statusSection}\n\n${body}`;
}

// ── Handler principal ────────────────────────────────────────────────────────
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Método no permitido.' });
  }

  // CORS básico
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
  if (!checkChatRateLimit(ip)) {
    return res.status(429).json({ ok: false, error: 'Demasiadas solicitudes. Espera un momento.' });
  }

  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey) {
    return res.status(503).json({ ok: false, error: 'Asistente no configurado en el servidor.' });
  }

  // Validar mensaje
  const rawMessage = String(req.body?.message || '').replace(/<[^>]*>/g, '').trim();
  if (!rawMessage) return res.status(400).json({ ok: false, error: 'Mensaje vacío.' });
  if (rawMessage.length > 500) return res.status(400).json({ ok: false, error: 'Mensaje demasiado largo (máx. 500 caracteres).' });

  // Validar historial (máx 10 turnos)
  const rawHistory = Array.isArray(req.body?.history) ? req.body.history : [];
  const history = rawHistory.slice(-10).map(m => ({
    role: String(m.role || '') === 'model' ? 'model' : 'user',
    text: String(m.content || '').replace(/<[^>]*>/g, '').slice(0, 500),
  })).filter(m => m.text);

  try {
    const systemPrompt = await buildChatSystemPrompt();

    const contents = [];
    for (const turn of history) {
      contents.push({ role: turn.role, parts: [{ text: turn.text }] });
    }
    contents.push({ role: 'user', parts: [{ text: rawMessage }] });

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    const geminiRes = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents,
        generationConfig: { temperature: 0.75, maxOutputTokens: 1024, topP: 0.95 },
      }),
    });

    if (!geminiRes.ok) {
      const errBody = await geminiRes.json().catch(() => ({}));
      console.error('[Chat] Gemini error', geminiRes.status, JSON.stringify(errBody).slice(0, 200));
      return res.status(502).json({ ok: false, error: 'Error al conectar con el asistente de IA.' });
    }

    const data = await geminiRes.json();
    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!reply) {
      console.error('[Chat] Gemini sin respuesta:', JSON.stringify(data).slice(0, 300));
      return res.status(502).json({ ok: false, error: 'El asistente no pudo responder.' });
    }

    return res.json({ ok: true, reply: reply.trim() });
  } catch (e) {
    console.error('[Chat] Error interno:', e.message);
    return res.status(500).json({ ok: false, error: 'Error interno del asistente.' });
  }
};
