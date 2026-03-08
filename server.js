// Simple local server for local development
// Run: npm install; npm start (serves http://localhost:3000)

const nodePath = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const firebaseAdmin = require('firebase-admin');

// Cargar siempre el .env del directorio del proyecto (evita fallos si se ejecuta desde otra ruta)
dotenv.config({ path: nodePath.join(__dirname, '.env') });

const app = express();
const DEFAULT_PORT = Number(process.env.PORT) || 3000;
const MP_ACCESS_TOKEN = (process.env.MP_ACCESS_TOKEN || process.env.MERCADOPAGO_ACCESS_TOKEN || '').trim();
const MP_PUBLIC_KEY = (process.env.MP_PUBLIC_KEY || process.env.MERCADOPAGO_PUBLIC_KEY || '').trim();
const MP_USER_ID = (process.env.MP_USER_ID || '').trim();
const MP_APP_ID = (process.env.MP_APP_ID || '').trim();

let _firebaseAdminApp = null;

function getFirebaseAdminApp() {
  if (_firebaseAdminApp) return _firebaseAdminApp;

  const jsonEnv = (process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '').trim();
  const pathEnv = (process.env.FIREBASE_SERVICE_ACCOUNT_PATH || '').trim();

  let credential = null;
  if (jsonEnv) {
    try {
      const parsed = JSON.parse(jsonEnv);
      credential = firebaseAdmin.credential.cert(parsed);
    } catch (e) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON no es un JSON válido');
    }
  } else if (pathEnv) {
    try {
      const raw = fs.readFileSync(pathEnv, 'utf8');
      const parsed = JSON.parse(raw);
      credential = firebaseAdmin.credential.cert(parsed);
    } catch (e) {
      throw new Error('No se pudo leer/parsear FIREBASE_SERVICE_ACCOUNT_PATH');
    }
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    credential = firebaseAdmin.credential.applicationDefault();
  }

  if (!credential) return null;

  _firebaseAdminApp = firebaseAdmin.initializeApp({ credential });
  return _firebaseAdminApp;
}

function requireAdminKey(req, res) {
  const expected = (process.env.ADMIN_KEY || '').trim();
  if (!expected) return true; // no auth configured
  const provided = String(req.get('x-admin-key') || '').trim();
  if (provided && provided === expected) return true;
  res.status(401).json({ ok: false, error: 'Unauthorized' });
  return false;
}

function computePointsFromOrderData(orderData) {
  const pointsEarned = Number(orderData && orderData.pointsEarned);
  if (Number.isFinite(pointsEarned) && pointsEarned >= 0) return Math.floor(pointsEarned);

  const totalCandidates = [
    orderData && orderData.total,
    orderData && orderData.totals && orderData.totals.total,
    orderData && orderData.totalAmount,
  ];
  for (const v of totalCandidates) {
    const n = typeof v === 'number' ? v : Number(v);
    if (Number.isFinite(n) && n > 0) return Math.max(0, Math.floor(n / 10));
  }
  return 0;
}

// Basic CORS for local dev (same-origin will also work)
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Serve static files from the project root
const staticRoot = __dirname;
app.use(express.static(staticRoot));

// Root route: serve paginaburger.html if present, otherwise index.html
app.get('/', (req, res) => {
  const candidate = ['paginaburger.html', 'index.html'];
  for (const file of candidate) {
    const full = nodePath.join(staticRoot, file);
    if (fs.existsSync(full)) {
      return res.sendFile(full);
    }
  }
  res.status(404).send('No se encontró paginaburger.html o index.html');
});

function formatMoney(n) {
  try {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(n || 0));
  } catch (_) {
    return `$${n}`;
  }
}

function generateOrderNumber() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const rand = Math.floor(Math.random() * 900) + 100; // 100-999
  return `${yyyy}${mm}${dd}-${rand}`;
}

function buildOwnerMessage(body) {
  const now = new Date();
  let horaMx;
  try {
    horaMx = new Intl.DateTimeFormat('es-MX', {
      timeZone: 'America/Mexico_City',
      dateStyle: 'short',
      timeStyle: 'short',
      hour12: false,
    }).format(now);
  } catch (_) {
    horaMx = now.toISOString();
  }

  const customer = body.customer || {};
  const deliveryType = body.deliveryType || body.type || '';
  const paymentMethod = body.paymentMethod || body.payment || '';
  const notes = body.notes || '';
  const origin = body.origin || 'Local';
  const orderNumber = body.orderNumber || body.order_number || body.numOrden || '';
  const publicBase = process.env.PUBLIC_BASE_URL || '';

  // items puede venir como body.items (cliente) o body.cart (compat)
  let items = Array.isArray(body.items) ? body.items : [];
  if (!items.length && Array.isArray(body.cart)) {
    items = body.cart.map((c) => ({
      name: c.name || c.title,
      quantity: c.quantity || 1,
      price: c.price,
      customizations: (c.options || c.extras || []).map((o) => (o.name || o)).join(', '),
      notes: c.notes || '',
    }));
  }

  // totales
  const subtotal = Number(body.subtotal || (body.totals && body.totals.subtotal) || 0);
  const delivery = Number(body.delivery || (body.totals && body.totals.delivery) || (deliveryType === 'delivery' ? 40 : 0));
  const total = Number(body.total || (body.totals && body.totals.total) || (subtotal + delivery));

  const lines = [];
  lines.push('Nueva orden SR & SRA BURGER');
  lines.push(`Hora: ${horaMx}`);
  lines.push(`Origen: ${origin}`);
  if (orderNumber) lines.push(`Orden: ${orderNumber}`);
  if (orderNumber && publicBase) {
    const link = `${publicBase.replace(/\/$/, '')}/tuenvio.html?order=${encodeURIComponent(orderNumber)}`;
    lines.push(`Rastreo: ${link}`);
  } else if (orderNumber) {
    lines.push(`Rastreo: tuenvio.html?order=${orderNumber}`);
  }
  if (customer.name) lines.push(`Cliente: ${customer.name}`);
  if (customer.phone) lines.push(`Tel: ${customer.phone}`);
  if (customer.address) lines.push(`Dirección: ${customer.address}`);
  if (deliveryType) lines.push(`Entrega: ${deliveryType === 'delivery' ? 'A domicilio' : 'Para recoger'}`);
  if (paymentMethod) lines.push(`Pago: ${paymentMethod}`);
  lines.push('');
  lines.push('Pedido:');
  if (items.length) {
    items.forEach((item, idx) => {
      const qty = item.quantity || 1;
      const price = item.price != null ? formatMoney(item.price) : '';
      lines.push(`${idx + 1}. ${qty} x ${item.name} ${price}`);
      const details = [];
      if (item.customizations) details.push(item.customizations);
      if (item.notes) details.push(item.notes);
      if (details.length) lines.push(`   ${details.join(' | ')}`);
    });
  } else {
    lines.push('- sin items -');
  }
  lines.push('');
  if (subtotal) lines.push(`Subtotal: ${formatMoney(subtotal)}`);
  if (delivery) lines.push(`Envío: ${formatMoney(delivery)}`);
  lines.push(`TOTAL: ${formatMoney(total)}`);
  if (notes) {
    lines.push('');
    lines.push(`Notas: ${notes}`);
  }
  return lines.join('\n');
}

async function handleSendOrder(req, res) {
  try {
    const payload = req.body || {};
    // Garantizar número de orden si faltó en el payload del cliente
    if (!payload.orderNumber) {
      payload.orderNumber = generateOrderNumber();
    }
    const msg = buildOwnerMessage(payload);
    console.log('[Pedido] Recibido (sin Twilio)\n' + msg);
    res.json({ ok: true, orderNumber: payload.orderNumber });
  } catch (err) {
    console.error('Error procesando pedido:', err);
    const status = (err.status && Number(err.status)) || 500;
    res.status(status).json({ ok: false, error: err.message || 'Error interno' });
  }
}

app.post('/api/send-order', handleSendOrder);
app.post('/api/send-orden', handleSendOrder);

// Crear preferencia de pago en Mercado Pago para "Pago en línea"
async function createMercadoPagoPreference(orderPayload, req) {
  if (!MP_ACCESS_TOKEN) {
    throw new Error('Mercado Pago no está configurado. Define MP_ACCESS_TOKEN o MERCADOPAGO_ACCESS_TOKEN en tu .env');
  }

  const totalCandidates = [
    orderPayload && orderPayload.total,
    orderPayload && orderPayload.totals && orderPayload.totals.total,
  ];
  let total = 0;
  for (const v of totalCandidates) {
    const n = typeof v === 'number' ? v : Number(v);
    if (Number.isFinite(n) && n > 0) {
      total = n;
      break;
    }
  }

  if (!Number.isFinite(total) || total <= 0) {
    throw new Error('Total inválido para crear el pago en Mercado Pago');
  }

  const orderNumber = String(orderPayload && (orderPayload.orderNumber || orderPayload.order_id || '') || generateOrderNumber());
  const customer = orderPayload && orderPayload.customer ? orderPayload.customer : {};

  // Base URL para redirects. En algunos contextos el header Origin puede venir como "null".
  let baseUrl = (process.env.PUBLIC_BASE_URL || req.get('origin') || '').trim();
  if (!baseUrl || baseUrl === 'null') {
    const host = String(req.get('host') || '').trim();
    const proto = String(req.get('x-forwarded-proto') || req.protocol || 'http').split(',')[0].trim();
    if (host) baseUrl = `${proto}://${host}`;
  }
  if (!baseUrl || baseUrl === 'null') {
    baseUrl = `http://localhost:${DEFAULT_PORT}`;
  }
  baseUrl = baseUrl.replace(/\/$/, '');

  const isLocalHostLike = (u) => {
    try {
      const url = new URL(u);
      const host = String(url.hostname || '').toLowerCase();
      if (host === 'localhost' || host === '127.0.0.1') return true;
      // RFC1918 + common LAN ranges
      if (host.startsWith('192.168.')) return true;
      if (host.startsWith('10.')) return true;
      if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(host)) return true;
      return false;
    } catch (_) {
      return true;
    }
  };

  // Mercado Pago suele rechazar auto_return en entornos localhost/LAN.
  // Lo habilitamos solo cuando el back_url es HTTPS y público.
  const canUseAutoReturn = baseUrl.startsWith('https://') && !isLocalHostLike(baseUrl);

  const backUrls = {
    success: `${baseUrl}/paginaburger.html?payment=approved&order=${encodeURIComponent(orderNumber)}`,
    pending: `${baseUrl}/paginaburger.html?payment=pending&order=${encodeURIComponent(orderNumber)}`,
    failure: `${baseUrl}/paginaburger.html?payment=failure&order=${encodeURIComponent(orderNumber)}`,
  };

  const body = {
    items: [
      {
        title: `Pedido SR & SRA BURGER #${orderNumber}`,
        quantity: 1,
        currency_id: 'MXN',
        unit_price: Number(total.toFixed(2)),
      },
    ],
    external_reference: orderNumber,
    payer: {
      name: customer && customer.name ? String(customer.name) : undefined,
      email: customer && customer.email ? String(customer.email) : undefined,
    },
    back_urls: backUrls,
    // Algunos flujos/SDKs usan redirect_urls. Enviamos ambos.
    redirect_urls: backUrls,
    ...(canUseAutoReturn ? { auto_return: 'approved' } : {}),
    metadata: {
      orderNumber,
    },
  };

  const resp = await fetch('https://api.mercadopago.com/checkout/preferences', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`Mercado Pago respondió con estado ${resp.status}: ${text || 'sin detalle'}`);
  }

  const data = await resp.json();
  return data;
}

app.post('/api/mercadopago/create-preference', async (req, res) => {
  try {
    const payload = req.body || {};
    const orderNumber = payload.orderNumber || generateOrderNumber();
    const orderData = Object.assign({}, payload.orderData || {}, { orderNumber });

    const preference = await createMercadoPagoPreference(orderData, req);

    return res.json({
      ok: true,
      orderNumber,
      preferenceId: preference && preference.id,
      initPoint: (preference && (preference.init_point || preference.sandbox_init_point)) || null,
      raw: preference,
    });
  } catch (e) {
    console.error('Error creando preferencia de Mercado Pago:', e);
    const status = e && e.status ? Number(e.status) : 500;
    return res.status(status).json({ ok: false, error: e.message || 'mp-preference-failed' });
  }
});

// Consultar estado de pago por orderNumber/external_reference.
// Esto permite mostrar confirmación incluso si Mercado Pago no redirige en localhost/LAN.
app.get('/api/mercadopago/payment-status', async (req, res) => {
  try {
    if (!MP_ACCESS_TOKEN) {
      return res.status(500).json({ ok: false, error: 'Mercado Pago no está configurado (MP_ACCESS_TOKEN).' });
    }

    const order = String(req.query.order || req.query.external_reference || '').trim();
    if (!order) return res.status(400).json({ ok: false, error: 'Missing order' });

    const url = new URL('https://api.mercadopago.com/v1/payments/search');
    url.searchParams.set('external_reference', order);
    url.searchParams.set('sort', 'date_created');
    url.searchParams.set('criteria', 'desc');
    url.searchParams.set('limit', '10');

    const r = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
      },
    });

    if (!r.ok) {
      const text = await r.text().catch(() => '');
      return res.status(502).json({ ok: false, error: `MP search ${r.status}: ${text || 'sin detalle'}` });
    }

    const data = await r.json().catch(() => null);
    const results = data && Array.isArray(data.results) ? data.results : [];
    if (!results.length) {
      return res.json({ ok: true, order, status: 'not_found' });
    }

    const statuses = results.map((p) => String(p && p.status || '').toLowerCase()).filter(Boolean);
    const latest = results[0] || {};
    const latestId = latest && latest.id != null ? String(latest.id) : null;
    const latestStatus = latest && latest.status ? String(latest.status).toLowerCase() : null;

    let status = 'unknown';
    if (statuses.includes('approved')) status = 'approved';
    else if (statuses.some((s) => s === 'in_process' || s === 'pending')) status = 'pending';
    else if (statuses.some((s) => s === 'rejected' || s === 'cancelled')) status = 'failure';
    else status = latestStatus || 'unknown';

    return res.json({ ok: true, order, status, paymentId: latestId, latestStatus });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || 'mp-status-failed' });
  }
});

// Mark order as paid + credit points (server-side, instant)
app.post('/api/mark-paid', async (req, res) => {
  try {
    if (!requireAdminKey(req, res)) return;

    const { orderId } = req.body || {};
    const safeOrderId = String(orderId || '').trim();
    if (!safeOrderId) return res.status(400).json({ ok: false, error: 'Missing orderId' });

    const adminApp = getFirebaseAdminApp();
    if (!adminApp) {
      return res.status(500).json({
        ok: false,
        error: 'Firebase Admin no está configurado. Define FIREBASE_SERVICE_ACCOUNT_PATH o FIREBASE_SERVICE_ACCOUNT_JSON (o GOOGLE_APPLICATION_CREDENTIALS).'
      });
    }

    const db = firebaseAdmin.firestore();
    const orderRef = db.collection('orders').doc(safeOrderId);
    const now = new Date();
    const paidAtIso = now.toISOString();

    const result = await db.runTransaction(async (tx) => {
      const orderSnap = await tx.get(orderRef);
      if (!orderSnap.exists) {
        const err = new Error('Order not found');
        err.status = 404;
        throw err;
      }

      const order = orderSnap.data() || {};
      const alreadyPaid = !!order.paid;
      const alreadyCredited = !!order.pointsCredited;

      const pointsToAdd = computePointsFromOrderData(order);
      const clienteId = String(order.clienteId || '').trim();

      // Always set paid flags (idempotent)
      tx.set(orderRef, {
        paid: true,
        paidAt: firebaseAdmin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

      if (!clienteId) {
        return {
          paid: true,
          pointsAdded: 0,
          pointsCredited: false,
          reason: 'missing_clienteId'
        };
      }

      if (alreadyCredited) {
        return {
          paid: true,
          pointsAdded: Number(order.pointsAdded || 0) || 0,
          pointsCredited: true,
          reason: 'already_credited'
        };
      }

      const clientRef = db.collection('clientes').doc(clienteId);
      const clientSnap = await tx.get(clientRef);
      if (!clientSnap.exists) {
        // If client doesn't exist, we still mark paid.
        return {
          paid: true,
          pointsAdded: 0,
          pointsCredited: false,
          reason: 'client_not_found'
        };
      }

      const client = clientSnap.data() || {};
      const creditedOrders = Array.isArray(client.creditedOrders) ? client.creditedOrders : [];
      if (creditedOrders.includes(safeOrderId)) {
        // Defensive idempotency: order doc may not have pointsCredited.
        tx.set(orderRef, {
          pointsCredited: true,
          pointsCreditedAt: firebaseAdmin.firestore.FieldValue.serverTimestamp(),
          pointsAdded: Number(order.pointsAdded || 0) || 0,
        }, { merge: true });
        return {
          paid: true,
          pointsAdded: Number(order.pointsAdded || 0) || 0,
          pointsCredited: true,
          reason: 'creditedOrders_contains'
        };
      }

      const currentPoints = Number(client.puntos || 0);
      const safeCurrentPoints = Number.isFinite(currentPoints) ? currentPoints : 0;
      const safePointsToAdd = Number.isFinite(pointsToAdd) ? pointsToAdd : 0;

      tx.set(clientRef, {
        puntos: safeCurrentPoints + safePointsToAdd,
        creditedOrders: firebaseAdmin.firestore.FieldValue.arrayUnion(safeOrderId),
        updatedAt: firebaseAdmin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

      tx.set(orderRef, {
        pointsEarned: Number.isFinite(Number(order.pointsEarned)) ? order.pointsEarned : safePointsToAdd,
        pointsCredited: true,
        pointsCreditedAt: firebaseAdmin.firestore.FieldValue.serverTimestamp(),
        pointsAdded: safePointsToAdd,
      }, { merge: true });

      return {
        paid: true,
        pointsAdded: safePointsToAdd,
        pointsCredited: true,
        reason: alreadyPaid ? 'paid_was_true' : 'ok'
      };
    });

    return res.json({ ok: true, paidAt: paidAtIso, ...result });
  } catch (e) {
    const status = (e && e.status) ? Number(e.status) : 500;
    return res.status(status).json({ ok: false, error: e.message || 'mark-paid-failed' });
  }
});

// Google Distance Matrix proxy (same-origin). Prefer env var, fallback to GMAPS_API_KEY if provided.
// Por defecto, el origen es la sucursal (Coahuila 36) por coordenadas,
// para evitar fallos de geocodificación con texto en Distance Matrix.
// Referencia: Coahuila 36, 10 de Mayo, 96344 Minatitlán, Veracruz, México
// Query:
//   /api/distance-matrix?destLat=..&destLng=..
//   or /api/distance-matrix?destAddress=...
// Optional:
//   origLat/origLng (compat)
app.get('/api/distance-matrix', async (req, res) => {
  try {
    const apiKey = (process.env.GOOGLE_MAPS_API_KEY || process.env.GMAPS_API_KEY || '').trim();
    if (!apiKey) return res.status(500).json({ ok: false, error: 'Missing GOOGLE_MAPS_API_KEY' });

    const DEFAULT_ORIGIN_LAT = 18.022398;
    const DEFAULT_ORIGIN_LNG = -94.546974;
    const origLat = req.query.origLat != null ? Number(req.query.origLat) : null;
    const origLng = req.query.origLng != null ? Number(req.query.origLng) : null;

    const destLat = req.query.destLat != null ? Number(req.query.destLat) : null;
    const destLng = req.query.destLng != null ? Number(req.query.destLng) : null;
    const destAddress = String(req.query.destAddress || '').trim();

    const hasOrigCoords = Number.isFinite(origLat) && Number.isFinite(origLng);
    const hasDestCoords = Number.isFinite(destLat) && Number.isFinite(destLng);

    let destinations;
    if (hasDestCoords) {
      destinations = `${destLat},${destLng}`;
    } else if (destAddress) {
      destinations = destAddress;
    } else {
      return res.status(400).json({ ok: false, error: 'Missing destination (destLat/destLng or destAddress)' });
    }

    const origins = hasOrigCoords
      ? `${origLat},${origLng}`
      : `${DEFAULT_ORIGIN_LAT},${DEFAULT_ORIGIN_LNG}`;
    const url = new URL('https://maps.googleapis.com/maps/api/distancematrix/json');
    url.searchParams.set('origins', origins);
    url.searchParams.set('destinations', destinations);
    url.searchParams.set('mode', 'driving');
    url.searchParams.set('language', 'es');
    url.searchParams.set('region', 'mx');
    url.searchParams.set('key', apiKey);

    const r = await fetch(url.toString());
    if (!r.ok) return res.status(r.status).json({ ok: false, error: `Upstream ${r.status}` });
    const data = await r.json();

    const row = data && data.rows && data.rows[0];
    const elem = row && row.elements && row.elements[0];
    const elemStatus = elem && elem.status;
    if (data.status !== 'OK' || elemStatus !== 'OK') {
      return res.status(200).json({
        ok: false,
        error: 'DistanceMatrix not OK',
        status: data && data.status,
        elementStatus: elemStatus,
      });
    }

    const distanceMeters = elem.distance && typeof elem.distance.value === 'number' ? elem.distance.value : null;
    const durationSeconds = elem.duration && typeof elem.duration.value === 'number' ? elem.duration.value : null;
    const distanceKm = typeof distanceMeters === 'number' ? distanceMeters / 1000 : null;
    const durationMin = typeof durationSeconds === 'number' ? Math.round(durationSeconds / 60) : null;

    res.json({ ok: true, distanceKm, durationMin });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || 'distance-matrix-failed' });
  }
});

// Health check
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// Config check (no expone secretos)
app.get('/api/mp-config-check', (_req, res) => {
  res.json({
    ok: true,
    has: {
      MP_ACCESS_TOKEN: !!(process.env.MP_ACCESS_TOKEN || '').trim(),
      MERCADOPAGO_ACCESS_TOKEN: !!(process.env.MERCADOPAGO_ACCESS_TOKEN || '').trim(),
      MP_PUBLIC_KEY: !!(process.env.MP_PUBLIC_KEY || '').trim(),
      MERCADOPAGO_PUBLIC_KEY: !!(process.env.MERCADOPAGO_PUBLIC_KEY || '').trim(),
      MP_USER_ID: !!(process.env.MP_USER_ID || '').trim(),
      MP_APP_ID: !!(process.env.MP_APP_ID || '').trim(),
    },
    mpReady: !!((process.env.MP_ACCESS_TOKEN || process.env.MERCADOPAGO_ACCESS_TOKEN || '').trim()),
    mpPublicKeyReady: !!MP_PUBLIC_KEY,
  });
});

app.get('/api/config-check', (_req, res) => {
  res.json({
    ok: true,
    note: 'Twilio fue removido. Este endpoint queda como placeholder.'
  });
});

// Geocoding proxy to Nominatim (avoids CORS and adds proper headers)
app.get('/api/geocode', async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    if (!q) return res.status(400).json({ ok: false, error: 'Missing q' });
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&addressdetails=1&limit=1`;
    const r = await fetch(url, {
      headers: {
        'Accept-Language': 'es',
        // Provide a simple UA per Nominatim usage policy (no personal data)
        'User-Agent': 'sr-sra-burger/1.0 (+https://example.invalid)'
      }
    });
    if (!r.ok) return res.status(r.status).json({ ok: false, error: `Upstream ${r.status}` });
    const data = await r.json();
    res.json({ ok: true, data });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || 'geocode-failed' });
  }
});

function printAddresses(port) {
  try {
    const os = require('os');
    const nets = os.networkInterfaces();
    let lan = '';
    for (const name of Object.keys(nets)) {
      for (const net of nets[name] || []) {
        if (net.family === 'IPv4' && !net.internal) { lan = net.address; break; }
      }
      if (lan) break;
    }
    console.log(`Servidor corriendo en: http://localhost:${port}`);
    if (lan) console.log(`Tu LAN: http://${lan}:${port}`);
  } catch (_) {
    console.log(`Servidor corriendo en: http://localhost:${port}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// WHATSAPP — Notificaciones de pedidos via Baileys
// ═══════════════════════════════════════════════════════════════════════════
let _whatsapp = null;
function getWA() {
  if (!_whatsapp) {
    try {
      const { getInstance } = require('./services/whatsapp');
      _whatsapp = getInstance();
      _whatsapp.init().catch(e => console.error('[WA init]', e.message));
    } catch (e) {
      console.error('[WA load]', e.message);
    }
  }
  return _whatsapp;
}

// SSE: stream de eventos en tiempo real (QR, conexión, desconexión)
app.get('/api/whatsapp/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const send = (event, data) =>
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

  // Estado actual al conectar
  const wa = getWA();
  if (wa) {
    const s = wa.getStatus();
    if (s.hasQr)     send('qr',         { qrDataUrl: s.qrDataUrl });
    if (s.connected) send('connected',   { phoneNumber: s.phoneNumber });
  }

  const onQr   = (qrDataUrl)          => send('qr',          { qrDataUrl });
  const onConn = ({ phoneNumber })    => send('connected',    { phoneNumber });
  const onDisc = ({ loggedOut } = {}) => send('disconnected', { loggedOut });
  const onReconn = ()                 => send('reconnecting', {});

  if (wa) {
    wa.on('qr',           onQr);
    wa.on('connected',    onConn);
    wa.on('disconnected', onDisc);
    wa.on('reconnecting', onReconn);
  }

  req.on('close', () => {
    if (wa) {
      wa.off('qr',           onQr);
      wa.off('connected',    onConn);
      wa.off('disconnected', onDisc);
      wa.off('reconnecting', onReconn);
    }
  });
});

// Estado actual
app.get('/api/whatsapp/status', (req, res) => {
  const wa = getWA();
  if (!wa) return res.json({ ok: true, connected: false, hasQr: false });
  res.json({ ok: true, ...wa.getStatus() });
});

// Lista de grupos (requiere estar conectado)
app.get('/api/whatsapp/groups', async (req, res) => {
  const wa = getWA();
  if (!wa) return res.status(503).json({ ok: false, error: 'Servicio no disponible' });
  try {
    const groups = await wa.getGroups();
    res.json({ ok: true, groups });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Guardar grupo destino
// type: 'orders' (cocina/pedidos, default) | 'delivery' (repartidores)
app.post('/api/whatsapp/set-group', (req, res) => {
  const { groupId, groupName, type } = req.body || {};
  if (!groupId) return res.status(400).json({ ok: false, error: 'groupId requerido' });
  const wa = getWA();
  if (!wa) return res.status(503).json({ ok: false, error: 'Servicio no disponible' });
  wa.saveConfig(groupId, groupName || groupId, type || 'orders');
  res.json({ ok: true, groupId, groupName, type: type || 'orders' });
});

// Configuración guardada
app.get('/api/whatsapp/config', (req, res) => {
  const wa = getWA();
  if (!wa) return res.json({ ok: true, config: { groupId: null, groupName: null } });
  res.json({ ok: true, config: wa.getConfig() });
});

// Mensaje de prueba — Cocina
app.post('/api/whatsapp/send-test', async (req, res) => {
  const wa = getWA();
  if (!wa) return res.status(503).json({ ok: false, error: 'Servicio no disponible' });
  try {
    const text = req.body?.text || '🍔 *Prueba — SR & SRA BURGER*\n✅ Las notificaciones de pedidos están activas en el grupo *Cocina*.';
    await wa.sendToGroup(text);
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

// Mensaje de prueba — Repartidores
app.post('/api/whatsapp/send-test-delivery', async (req, res) => {
  const wa = getWA();
  if (!wa) return res.status(503).json({ ok: false, error: 'Servicio no disponible' });
  try {
    const config = wa.getConfig();
    if (!config.deliveryGroupId) {
      return res.status(400).json({ ok: false, error: 'No hay grupo de repartidores configurado. Ve a /notifi.html y selecciónalo en la pestaña Repartidores.' });
    }
    const text = req.body?.text || '🛵 *Prueba — SR & SRA BURGER*\n✅ Las notificaciones de envíos están activas en el grupo *Repartidores*.\n📍 Los pedidos de domicilio llegarán aquí con dirección y link de Maps.';
    await wa.sendToDeliveryGroup(text);
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

// Notificación de nuevo pedido (llamada desde controldeenvios.html)
app.post('/api/whatsapp/notify-order', async (req, res) => {
  const wa = getWA();
  if (!wa) return res.status(503).json({ ok: false, error: 'Servicio no disponible' });

  const order = req.body?.order || {};
  const forceAll = !!req.body?.forceAll;
  const result = { ok: false, kitchen: false, delivery: false };

  // 1) Mensaje completo → grupo Cocina/Pedidos
  try {
    const text = buildOrderMessage(order);
    await wa.sendToGroup(text);
    result.kitchen = true;
    result.ok      = true;
  } catch (e) {
    result.kitchenError = e.message;
    console.error('[WA] Error enviando a cocina:', e.message);
    return res.status(400).json({ ...result, error: e.message });
  }

  // 2) Si es entrega a domicilio O forceAll → mensaje a repartidores
  const deliveryType = order.deliveryType || order.type || '';
  const isDelivery   = forceAll || /delivery|envío|envio|domicilio/i.test(deliveryType);
  const config       = wa.getConfig();

  if (isDelivery && config.deliveryGroupId) {
    try {
      const deliveryText = buildDeliveryMessage(order);
      await wa.sendToDeliveryGroup(deliveryText);
      result.delivery = true;
      console.log('[WA] Mensaje de repartidor enviado al grupo:', config.deliveryGroupName || config.deliveryGroupId);
    } catch (e) {
      result.deliveryError = e.message;
      console.error('[WA] Error enviando a repartidores:', e.message);
    }
  }

  res.json(result);
});

// Cerrar sesión de WhatsApp
app.delete('/api/whatsapp/logout', async (req, res) => {
  const wa = getWA();
  if (!wa) return res.json({ ok: true });
  try {
    await wa.logout();
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ── Formateador de mensaje de pedido ────────────────────────────────────────
function buildOrderMessage(order) {
  const SEP  = '━━━━━━━━━━━━━━━━━━━━━━';
  const SEP2 = '──────────────────────';
  const lines = [];

  const customer = order.customer || {};
  const name  = customer.name  || order.customerName  || 'Sin nombre';
  const phone = customer.phone || order.customerPhone || '';
  const addr  = customer.address || order.address || '';
  const type  = order.deliveryType || order.type || '';
  const isDelivery = /delivery|envío|envio|domicilio/i.test(type);

  const now = new Date();
  const hora = now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false });

  // ── Encabezado ──────────────────────────────────────────
  lines.push(SEP);
  lines.push(`🍔 *NUEVO PEDIDO* — SR & SRA BURGER`);
  lines.push(`⏰ ${hora}`);
  lines.push(SEP);

  // ── Cliente ─────────────────────────────────────────────
  lines.push(`👤 *CLIENTE*`);
  lines.push(`   ${name}`);
  if (phone) lines.push(`   📱 ${phone}`);
  lines.push('');

  // ── Tipo de entrega & ubicación ──────────────────────────
  if (isDelivery) {
    lines.push(`🚗 *ENVÍO A DOMICILIO*`);
    if (addr) lines.push(`   📍 ${addr}`);
  } else {
    lines.push(`🏪 *RECOGER EN LOCAL*`);
  }
  lines.push(SEP2);

  // ── Productos ────────────────────────────────────────────
  lines.push(`🛒 *PEDIDO*`);
  lines.push('');

  const items = Array.isArray(order.items) ? order.items : [];
  if (items.length) {
    items.forEach((item, i) => {
      const n   = item.name || (item.baseItem && item.baseItem.name) || 'Artículo';
      const qty = Number(item.quantity) || 1;
      const p   = Number(item.price) || 0;
      const priceStr = p ? ` — *$${(p * qty).toFixed(0)}*` : '';

      lines.push(`${i + 1}. *${qty}x ${n}*${priceStr}`);

      if (item.customizations && typeof item.customizations === 'string' && item.customizations.trim()) {
        const parts = item.customizations.split(/\s*\|\s*/);
        const normalParts = parts.filter(part => !/^Incluye:/i.test(part.trim()) && part.trim());
        const includePart = parts.find(part => /^Incluye:/i.test(part.trim()));

        if (normalParts.length > 1) {
          // Combo con múltiples hamburguesas
          lines.push(`   🍔 *Hamburguesas y más:*`);
          normalParts.forEach((part, idx) => {
            const isHotdog = /^Hot\s*Dog\s*:/i.test(part.trim());
            const clean = part.trim()
              .replace(/^Hamburguesa\s*(\d+\s*)?:\s*/i, '')
              .replace(/^Hot\s*Dog\s*(\d+\s*)?:\s*/i, '')
              .trim();
            const icon = isHotdog ? '🌭' : '🍔';
            lines.push(`      ${icon} ${clean}`);
          });
          if (includePart) {
            const detail = includePart.replace(/^Incluye:\s*/i, '');
            // Mostrar cada elemento del "Incluye" en su propia línea
            const extras = detail.split(/\s*,\s*/).filter(Boolean);
            lines.push(`   ✅ *Incluye:*`);
            extras.forEach(e => lines.push(`      • ${e}`));
          }
        } else if (normalParts.length === 1) {
          // Item individual con personalización
          const single = normalParts[0].replace(/^Hamburguesa\s*:\s*/i, '').trim();
          lines.push(`   🍔 ${single}`);
          if (includePart) {
            const detail = includePart.replace(/^Incluye:\s*/i, '');
            lines.push(`   ✅ Incluye: ${detail}`);
          }
        } else {
          // Texto libre (sin formato pipe)
          lines.push(`   ↳ ${item.customizations}`);
        }
      }

      if (item.specifications) {
        lines.push(`   ⚠️ *Nota:* ${item.specifications}`);
      }

      lines.push('');
    });
  } else {
    lines.push('   (sin detalle de productos)');
    lines.push('');
  }

  // ── Totales & pago ───────────────────────────────────────
  lines.push(SEP2);
  const total = Number(order.total || 0);
  if (total) lines.push(`💰 *TOTAL: $${total.toFixed(0)}*`);
  if (order.paymentMethod) lines.push(`💳 *Pago:* ${order.paymentMethod}`);
  if (order.notes) lines.push(`📝 *Notas:* ${order.notes}`);
  lines.push(SEP);

  return lines.join('\n');
}

// ── Mensaje simplificado para grupo de repartidores ─────────────────────────
function buildDeliveryMessage(order) {
  const SEP  = '━━━━━━━━━━━━━━━━━━━━━━';
  const SEP2 = '──────────────────────';
  const lines = [];

  const customer = order.customer || {};
  const name  = customer.name  || order.customerName  || 'Sin nombre';
  const phone = customer.phone || order.customerPhone || '';
  const addr  = customer.address || order.address      || '';

  // Coordenadas guardadas del cliente registrado
  const lat = customer.lat  || customer.latitude  || null;
  const lng = customer.lng  || customer.longitude || null;
  const coords = customer.coordinates || customer.coords || null;
  const latFinal = lat || (coords && coords.lat) || null;
  const lngFinal = lng || (coords && coords.lng) || null;
  const mapsLink = latFinal && lngFinal
    ? `https://maps.google.com/?q=${latFinal},${lngFinal}`
    : null;

  const total   = Number(order.total || 0);
  const payment = order.paymentMethod || order.payment || '';
  const paid    = order.isPaid === true || order.isPaid === 'true' || order.status === 'pagado';

  // Calcular cambio automáticamente desde cashAmount
  const cashRaw    = Number(order.cashAmount   || order.cashPaid  || 0);
  const changeRaw  = Number(order.changeAmount || order.change    || 0);
  // Si tenemos monto de pago, calcular cambio; si no, usar el preexistente
  const cashAmount   = cashRaw  > 0 ? cashRaw  : null;
  const changeAmount = cashAmount !== null
    ? Math.max(0, cashAmount - total)   // calculado
    : (changeRaw > 0 ? changeRaw : null); // ya guardado

  const now  = new Date();
  const hora = now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false });

  lines.push(SEP);
  lines.push(`🛵 *PEDIDO PARA ENTREGA*`);
  lines.push(`⏰ ${hora}`);
  lines.push(SEP);

  // Cliente
  lines.push(`👤 *CLIENTE*`);
  lines.push(`   ${name}`);
  if (phone) lines.push(`   📱 ${phone}`);
  lines.push('');

  // Dirección
  lines.push(`📍 *DIRECCIÓN*`);
  if (addr) lines.push(`   ${addr}`);
  if (mapsLink) lines.push(`   🗺️ ${mapsLink}`);
  if (!addr && !mapsLink) lines.push('   (sin dirección registrada)');
  lines.push('');

  // Cobro
  lines.push(SEP2);
  if (paid) {
    lines.push(`✅ *YA PAGADO* — $${total.toFixed(0)}`);
    if (payment) lines.push(`   Método: ${payment}`);
  } else {
    if (total)        lines.push(`💰 *COBRAR: $${total.toFixed(0)}*`);
    if (payment)      lines.push(`💳 Pago con: ${payment}`);
    if (cashAmount)   lines.push(`💵 Paga con: $${cashAmount.toFixed(0)}`);
    if (changeAmount) lines.push(`🔄 Cambio:   $${changeAmount.toFixed(0)}`);
  }

  // Resumen de productos (solo nombres y cantidades, sin detalle)
  const items = Array.isArray(order.items) ? order.items : [];
  if (items.length) {
    lines.push('');
    lines.push(`🛒 *Productos:*`);
    items.forEach(item => {
      const n   = item.name || (item.baseItem && item.baseItem.name) || 'Artículo';
      const qty = Number(item.quantity) || 1;
      lines.push(`   • ${qty}x ${n}`);
    });
  }

  lines.push(SEP);

  return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════

function startServer(port, retries = 3) {
  const server = app.listen(port, '0.0.0.0', () => printAddresses(port));
  server.on('error', (err) => {
    if ((err && err.code) === 'EADDRINUSE' && retries > 0) {
      const next = port + 1;
      console.warn(`Puerto ${port} en uso, intentando ${next}...`);
      startServer(next, retries - 1);
    } else {
      console.error('No se pudo iniciar el servidor:', err);
      process.exit(1);
    }
  });
}

startServer(DEFAULT_PORT);
