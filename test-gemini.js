const https = require('https');
require('dotenv').config();

const key = process.env.GEMINI_API_KEY || '';
console.log('API Key presente:', key ? 'SI (' + key.slice(0,10) + '...)' : 'NO - FALTA');

const body = JSON.stringify({
  contents: [{ role: 'user', parts: [{ text: 'Di solo: OK' }] }],
  generationConfig: { maxOutputTokens: 20 }
});

const url = new URL('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + key);

const req = https.request({
  hostname: url.hostname,
  path: url.pathname + url.search,
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
}, res => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    console.log('HTTP Status:', res.statusCode);
    try {
      const j = JSON.parse(d);
      const reply = j?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (reply) {
        console.log('✅ GEMINI FUNCIONA. Respuesta:', reply.trim());
      } else {
        console.log('❌ Sin candidatos. Respuesta completa:', JSON.stringify(j).slice(0, 400));
      }
    } catch(e) {
      console.log('❌ Error parseando:', d.slice(0, 400));
    }
  });
});
req.on('error', e => console.error('❌ Error de red:', e.message));
req.write(body);
req.end();
