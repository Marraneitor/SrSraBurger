# SECURITY.md — SR & SRA BURGER · Seguridad de la API

Documento de referencia sobre las medidas de seguridad implementadas y cómo configurarlas.

---

## 1. Resumen de Cambios

| Vulnerabilidad | Severidad | Solución Implementada |
|---|---|---|
| CORS `*` en todos los endpoints | Alta | `applyCors()` con `ALLOWED_ORIGIN` env var |
| `requireAdminKey` falla abierto | Crítica | Ahora devuelve 503 si `ADMIN_KEY` no está configurada |
| POST `/api/admin/botconf` sin auth | Crítica | `requireAdminKey` obligatorio antes de procesar |
| POST `/api/admin/botconf/reload` sin auth | Crítica | `requireAdminKey` obligatorio antes de procesar |
| `/api/send-order` sin rate limit | Alta | 5 peticiones/min por IP |
| `/api/geocode` sin rate limit | Media | 30 peticiones/min por IP |
| `/api/reverse-geocode` sin rate limit | Media | 30 peticiones/min por IP |
| `/api/mercadopago/create-preference` sin rate limit | Alta | 10 peticiones/min por IP |
| `/api/mercadopago/payment-status` sin rate limit | Media | 30 peticiones/min por IP |
| `/api/chat` CORS abierto | Media | Usa `applyCors()` del módulo compartido |
| `/api/mark-paid` requireAdminKey falla abierto | Crítica | Usa `requireAdminKey` del módulo compartido (fail-closed) |

---

## 2. Módulo Compartido: `api/_security.js`

Todas las funciones serverless importan de este módulo:

```js
const { applyCors, checkRateLimit, requireAdminKey, getClientIp } = require('./_security');
```

### Funciones

| Función | Descripción |
|---|---|
| `applyCors(req, res)` | Configura headers CORS. Usa `ALLOWED_ORIGIN` o `*` si no está definida |
| `checkRateLimit(ip, endpoint, opts)` | Rate limiter en memoria por IP. `opts: { max, windowMs }` |
| `requireAdminKey(req, res)` | Valida `x-admin-key` header. **Fail-closed**: 503 si `ADMIN_KEY` no existe |
| `getClientIp(req)` | Extrae IP real del cliente (soporta `x-forwarded-for`) |

---

## 3. Variables de Entorno de Seguridad

Configurar en **Vercel → Settings → Environment Variables** (o `.env` para desarrollo local):

| Variable | Requerida | Descripción |
|---|---|---|
| `ADMIN_KEY` | **Sí** | Clave secreta para endpoints admin. Sin ella, todos los endpoints admin devuelven 503. |
| `ALLOWED_ORIGIN` | Recomendada | Dominio permitido para CORS (ej: `https://srburger.vercel.app`). Si no se define, acepta `*`. |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | **Sí** | JSON completo de credenciales Firebase Admin SDK. |
| `GEMINI_API_KEY` | **Sí** (chatbot) | API key de Google Gemini para el chatbot Burgy. |
| `MP_ACCESS_TOKEN` | **Sí** (pagos) | Token de acceso de Mercado Pago. |

### Ejemplo de configuración:

```bash
# .env (desarrollo local)
ADMIN_KEY=mi_clave_secreta_larga_y_segura
ALLOWED_ORIGIN=http://localhost:3000
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
GEMINI_API_KEY=AIza...
MP_ACCESS_TOKEN=APP_USR-...
```

---

## 4. Límites de Rate Limiting por Endpoint

| Endpoint | Límite | Ventana |
|---|---|---|
| `POST /api/send-order` | 5 req | 1 min |
| `POST /api/send-orden` | 5 req | 1 min |
| `GET /api/geocode` | 30 req | 1 min |
| `GET /api/reverse-geocode` | 30 req | 1 min |
| `POST /api/chat` | 15 req | 1 min |
| `POST /api/mercadopago/create-preference` | 10 req | 1 min |
| `GET /api/mercadopago/payment-status` | 30 req | 1 min |

> **Nota**: El rate limiter usa `Map()` en memoria. En Vercel, cada cold start reinicia el conteo.
> Para rate limiting global, considerar migrar a **Upstash Redis** en el futuro.

---

## 5. Endpoints Admin Protegidos

Todos requieren header `x-admin-key`:

```
POST /api/admin/botconf        → Guardar prompt del chatbot
POST /api/admin/botconf/reload → Forzar recarga del caché
POST /api/mark-paid            → Marcar pedido como pagado
```

### Ejemplo de llamada:

```js
fetch('/api/admin/botconf', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-admin-key': 'tu_admin_key_aqui'
  },
  body: JSON.stringify({ systemPrompt: 'Nuevo prompt...' })
});
```

---

## 6. Checklist de Seguridad para Producción

- [ ] **ADMIN_KEY** configurada en Vercel env vars (string largo y aleatorio)
- [ ] **ALLOWED_ORIGIN** configurada con el dominio real (ej: `https://srburger.vercel.app`)
- [ ] **FIREBASE_SERVICE_ACCOUNT_JSON** configurada en Vercel
- [ ] **GEMINI_API_KEY** configurada en Vercel
- [ ] **MP_ACCESS_TOKEN** configurada en Vercel
- [ ] Frontend actualizado para enviar `x-admin-key` en requests admin
- [ ] Probar que endpoints admin devuelven 401/503 sin la key correcta
- [ ] Probar que rate limiting funciona (enviar >5 pedidos rápidos)

---

## 7. Mejoras Futuras

1. **Upstash Redis** para rate limiting global entre instancias serverless
2. **HTTPS-only cookies** si se implementa sesión de admin
3. **CSP headers** (Content-Security-Policy) en páginas HTML
4. **Helmet.js** en server.js para headers de seguridad automáticos
5. **Logging centralizado** (ej: Vercel Log Drains) para detectar ataques
6. **WAF** (Web Application Firewall) via Vercel o Cloudflare

---

*Última actualización: febrero 2026*
