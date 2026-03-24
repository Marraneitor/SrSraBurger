// Vercel Serverless Function: POST /api/admin/botconf/reload
// Fuerza recarga del caché del prompt del chatbot desde Firestore

const firebaseAdmin = require('firebase-admin');
const { applyCors, requireAdminKey } = require('../../_security');

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

module.exports = async function handler(req, res) {
  applyCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Método no permitido.' });
  }
  if (!requireAdminKey(req, res)) return;
  try {
    const admin = getFirebaseAdminApp();
    let hasCustom = false;
    if (admin) {
      const db = admin.firestore();
      const snap = await db.collection('settings').doc('chatbot_config').get();
      hasCustom = snap.exists && !!snap.data()?.systemPrompt;
    }
    return res.json({ ok: true, reloaded: true, hasCustom });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
};
