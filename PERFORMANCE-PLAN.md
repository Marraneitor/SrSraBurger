# PERFORMANCE PLAN — SR & SRA BURGER
## Plan incremental de optimización de velocidad

> Análisis: Senior Frontend Engineer · Marzo 2026  
> Metodología: de mayor a menor impacto. Cada skill es independiente y segura de aplicar sin romper la app.  
> Métricas objetivo: LCP < 2.5 s · CLS < 0.1 · FID/INP < 200 ms · Lighthouse Mobile > 80

---

## LEYENDA

| Símbolo | Significado |
|---------|-------------|
| 🔥🔥🔥 | Impacto crítico en velocidad real |
| 🔥🔥 | Impacto alto |
| 🔥 | Impacto medio |
| ⚡ | Esfuerzo bajo (< 30 min) |
| ⚙️ | Esfuerzo medio (1–3 h) |
| 🏗️ | Esfuerzo alto (> 3 h) |
| ✅ | Completada |
| 🔄 | En progreso |
| ⬜ | Pendiente |

---

## FASE 1 — Quick Wins (sin romper nada, < 2 h total)

### ✅ SKILL-01 · `defer` en script principal 🔥🔥 ⚡
**Problema:** `script.js.backup` se carga de forma síncrona bloqueando el parser HTML.  
**Solución:**
```html
<!-- ANTES -->
<script src="js/script.js.backup?v=2026-02-27a"></script>

<!-- DESPUÉS -->
<script src="js/script.js.backup?v=2026-02-27a" defer></script>
```
**Archivo:** `paginaburger.html` línea ~4120  
**Ganancia estimada:** 300–600 ms en FCP (First Contentful Paint)  
**Riesgo:** Bajo. El script ya usa `DOMContentLoaded` internamente.

---

### ✅ SKILL-02 · Reordenar resource hints al inicio del `<head>` 🔥🔥 ⚡
**Problema:** Los `<link rel="preconnect">` están después del script de Tailwind CDN, que bloquea el thread. Para cuando el browser llega a los hints, las conexiones ya tardaron.  
**Solución:** Mover todos los `preconnect` y `dns-prefetch` a las primeras líneas del `<head>`, **antes** de cualquier `<script>` o `<link>`.  
**Orden correcto:**
```html
<head>
  <meta charset="UTF-8">
  <meta name="viewport" ...>

  <!-- 1. Resource hints PRIMERO (antes de cualquier script) -->
  <link rel="preconnect" href="https://fonts.googleapis.com" crossorigin>
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="preconnect" href="https://cdnjs.cloudflare.com" crossorigin>
  <link rel="preconnect" href="https://firestore.googleapis.com" crossorigin>
  <link rel="dns-prefetch" href="https://i.imgur.com">
  <link rel="dns-prefetch" href="https://www.gstatic.com">

  <!-- 2. Dark mode inline (necesario síncrono para evitar FOUC) -->
  <script>/* dark mode init */</script>

  <!-- 3. Resto de recursos -->
  ...
</head>
```
**Ganancia estimada:** 100–300 ms en tiempo de conexión a CDNs  
**Riesgo:** Ninguno.

---

### ✅ SKILL-03 · Agregar `width` y `height` a imagen hero (fix CLS) 🔥 ⚡
**Problema:** La imagen del hero no tiene atributos `width`/`height`. El browser no reserva espacio → **Layout Shift** cuando carga → CLS score alto → penalización Google.  
**Solución:**
```html
<!-- ANTES -->
<img src="https://i.imgur.com/TSTuaNr.jpg" alt="" class="absolute inset-0 w-full h-full object-cover" fetchpriority="high" ...>

<!-- DESPUÉS -->
<img src="https://i.imgur.com/TSTuaNr.jpg" alt="Fondo SR y SRA Burger"
     width="1920" height="1080"
     class="absolute inset-0 w-full h-full object-cover"
     fetchpriority="high" loading="eager" decoding="auto">
```
**Ganancia estimada:** CLS -0.05 a -0.15 (impacto directo en Lighthouse)  
**Riesgo:** Ninguno. CSS `object-cover` sobreescribe las dimensiones visualmente.

---

### ✅ SKILL-04 · Eliminar `console.log` en producción 🔥 ⚡
**Problema:** `script.js.backup` tiene ~40 llamadas a `console.log` activas. En V8 móvil cada una tiene overhead real, especialmente en el loop de render del menú.  
**Solución:** Añadir al final del `<head>` (después del dark mode script):
```html
<script>
  // Silenciar logs en producción
  if (location.hostname !== 'localhost' && !location.hostname.startsWith('192.168')) {
    console.log = console.warn = console.info = function(){};
  }
</script>
```
**Ganancia estimada:** 50–150 ms en renderizado del menú (acumulado de todos los logs)  
**Riesgo:** Ninguno. Los `console.error` se conservan para errores reales.

---

### ✅ SKILL-05 · Font Awesome async (no más render-blocking) 🔥🔥 ⚡
**Problema:** El CSS de Font Awesome (~1.5 MB, 1600 íconos) es render-blocking porque está en `<head>` como `<link rel="stylesheet">`.  
**Solución — cargar de forma no bloqueante:**
```html
<!-- ANTES -->
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">

<!-- DESPUÉS: preload + swap al cargar -->
<link rel="preload" as="style" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"
      onload="this.onload=null;this.rel='stylesheet'">
<noscript>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
</noscript>
```
**Ganancia estimada:** 200–500 ms en FCP (los íconos aparecen después pero el texto ya es visible)  
**Riesgo:** Bajo. Durante ~100–200 ms los íconos no se ven. Aceptable.

---

### ✅ SKILL-06 · `modulepreload` para firebase-config.js 🔥 ⚡
**Problema:** El módulo ES de Firebase no empieza a descargarse hasta que el parser llega a la etiqueta `<script type="module">`.  
**Solución:** Añadir en el `<head>`:
```html
<link rel="modulepreload" href="js/firebase-config.js">
```
**Ganancia estimada:** 150–400 ms en tiempo hasta primer dato de Firestore  
**Riesgo:** Ninguno.

---

## FASE 2 — Firestore Performance (impacto en TTI)

### ✅ SKILL-07 · Firestore en paralelo con `Promise.all` 🔥🔥🔥 ⚙️
**Problema:** Las 8 inicializaciones de Firebase se hacen en **serie** (await uno tras otro). Cada round-trip es ~80–200 ms → hasta **1.6 segundos** de waterfall puro.  
**Solución:** Convertir `initializeFirebaseFeatures()` en `js/script.js.backup` para ejecutarlas en paralelo:
```js
// ANTES (en serie — ~1.2 s de pura espera de red)
await loadHiddenProductsFromFirebase();
await checkServiceStatusFromFirebase();
await loadAndApplyCustomProducts();
// ...6 más

// DESPUÉS (en paralelo — ~200 ms porque todas van al mismo tiempo)
await Promise.all([
    loadHiddenProductsFromFirebase(),
    checkServiceStatusFromFirebase(),
    loadAndApplyCustomProducts(),
    loadAndApplyProductOrder(),
    loadAndApplyPriceOverrides(),
    loadAndApplyImageOverrides(),
    loadAndApplyProductInfoOverrides(),
    loadCustomizeButtonOverrides(),
    loadSpecificationsOverrides(),
]);
renderMenu(); // una sola vez, al final, con todo listo
```
**Nota importante:** Verificar que ninguna función dependa del resultado de la anterior antes de aplicar.  
**Ganancia estimada:** 600–1200 ms en tiempo hasta primer render del menú  
**Riesgo:** Medio. Requiere verificar dependencias entre funciones.

---

### ✅ SKILL-08 · Cache de settings Firebase en `sessionStorage` con TTL 🔥🔥 ⚙️
**Problema:** Cada recarga de la página hace todas las peticiones a Firestore de nuevo, aunque los datos no hayan cambiado.  
**Solución:** Envolver las llamadas con un wrapper de caché:
```js
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

function getCachedSettings(key) {
    try {
        const raw = sessionStorage.getItem('sr_cache_' + key);
        if (!raw) return null;
        const { data, ts } = JSON.parse(raw);
        if (Date.now() - ts > CACHE_TTL) return null;
        return data;
    } catch (_) { return null; }
}

function setCachedSettings(key, data) {
    try {
        sessionStorage.setItem('sr_cache_' + key, JSON.stringify({ data, ts: Date.now() }));
    } catch (_) {}
}

// Uso en loadHiddenProductsFromFirebase():
const cached = getCachedSettings('settings');
if (cached) {
    applySettings(cached);
    return;
}
const fresh = await window.firebaseManager.getSettings();
setCachedSettings('settings', fresh);
applySettings(fresh);
```
**Ganancia estimada:** Segunda visita: 0 ms en Firestore (instantáneo)  
**Riesgo:** Bajo. TTL de 5 min asegura datos frescos.

---

### ✅ SKILL-09 · Consolidar `renderMenu()` — una sola llamada 🔥🔥 ⚙️
**Problema:** `renderMenu()` se invoca **12+ veces** durante `initializeFirebaseFeatures`. Cada llamada hace `innerHTML = ''` y reconstruye todo el DOM del menú, causando re-painting masivo.  
**Solución:** Usar un flag de "render pendiente" + debounce:
```js
let _renderPending = false;
function scheduleRender() {
    if (_renderPending) return;
    _renderPending = true;
    requestAnimationFrame(() => {
        renderMenu();
        _renderPending = false;
    });
}
// Reemplazar todas las llamadas directas a renderMenu() por scheduleRender()
// en las funciones apply*()
```
**Ganancia estimada:** Elimina 11 de 12 renders innecesarios → menor jank en móvil  
**Riesgo:** Medio. Requiere revisar cada punto donde se llama `renderMenu()`.

---

## FASE 3 — Service Worker (visitas repetidas instantáneas)

### ✅ SKILL-10 · Implementar Service Worker con estrategia Cache-First 🔥🔥🔥 🏗️
**Problema:** `sw.js` existe pero está **completamente vacío**. Cada visita descarga todo desde cero: HTML, CSS, FA, Fonts, imágenes hero.  
**Estrategia:** Cache-First para assets estáticos + Network-First para HTML (datos frescos).  
**Implementar en `sw.js`:**
```js
const SW_VERSION = 'v1.0.0';
const STATIC_CACHE = 'sr-static-' + SW_VERSION;
const STATIC_ASSETS = [
    '/js/script.js.backup',
    '/js/firebase-config.js',
    '/js/spa-router.js',
    '/js/sr-auth-modal.js',
    '/styles/sr-ui.css',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css',
];

self.addEventListener('install', e => {
    e.waitUntil(
        caches.open(STATIC_CACHE)
            .then(c => c.addAll(STATIC_ASSETS))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== STATIC_CACHE).map(k => caches.delete(k)))
        ).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', e => {
    const url = new URL(e.request.url);
    // Cache-First para JS/CSS/Fonts/FA
    if (e.request.destination === 'script' || e.request.destination === 'style' || e.request.destination === 'font') {
        e.respondWith(
            caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
                const clone = res.clone();
                caches.open(STATIC_CACHE).then(c => c.put(e.request, clone));
                return res;
            }))
        );
        return;
    }
    // Network-First para HTML (siempre datos frescos)
    if (e.request.mode === 'navigate') {
        e.respondWith(
            fetch(e.request).catch(() => caches.match('/paginaburger.html'))
        );
    }
});
```
**Registrar el SW en `paginaburger.html`** (al final, antes de `</body>`):
```html
<script>
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .catch(err => console.error('SW error:', err));
    });
  }
</script>
```
**Ganancia estimada:** Segunda visita: assets JS/CSS cargan de disco (~0 ms de red)  
**Riesgo:** Medio-alto. Requiere invalidar caché al actualizar archivos (versionar SW_VERSION).

---

## FASE 4 — CSS y Assets (LCP estructural)

### ✅ SKILL-11 · Compilar Tailwind CSS purgado (eliminar CDN) 🔥🔥🔥 🏗️
**Problema:** `cdn.tailwindcss.com` descarga ~340 KB de JS que genera el CSS completo en runtime. Es el mayor bloqueante de LCP.  
**Solución:**
```bash
# 1. Instalar Tailwind como devDependency
npm install -D tailwindcss

# 2. Configurar tailwind.config.js (ya existe en el proyecto)
# content: ["./paginaburger.html", "./admin.html", "./js/**/*.js"]

# 3. Crear styles/input.css
@tailwind base;
@tailwind components;
@tailwind utilities;

# 4. Compilar (genera ~15-20 KB purgado vs 340 KB del CDN)
npx tailwindcss -i ./styles/input.css -o ./styles/tailwind.min.css --minify

# 5. Agregar al package.json
"build:css": "tailwindcss -i ./styles/input.css -o ./styles/tailwind.min.css --minify",
"watch:css": "tailwindcss -i ./styles/input.css -o ./styles/tailwind.min.css --watch"
```
Reemplazar en HTML:
```html
<!-- ANTES -->
<script src="https://cdn.tailwindcss.com"></script>

<!-- DESPUÉS -->
<link rel="stylesheet" href="styles/tailwind.min.css">
```
**Ganancia estimada:** 1–3 s en LCP móvil (el mayor single improvement posible)  
**Riesgo:** Alto. Requiere compilar con cada cambio de clases. Usar `watch:css` en desarrollo.

---

### ⬜ SKILL-12 · Fuentes Google auto-hospedadas (eliminar latencia de terceros) 🔥 ⚙️
**Problema:** Google Fonts requiere 2 round-trips: uno a `fonts.googleapis.com` (CSS) y otro a `fonts.gstatic.com` (archivo de fuente). En 3G esto suma ~300–600 ms.  
**Solución:** Descargar Inter + Poppins y servir desde el propio servidor:
1. Descargar de [google-webfonts-helper.herokuapp.com](https://google-webfonts-helper.herokuapp.com)
2. Colocar en `/styles/fonts/inter.woff2` y `/styles/fonts/poppins.woff2`
3. Definir `@font-face` en el CSS con `font-display: swap`
4. Eliminar el `<link>` a fonts.googleapis.com

**Ganancia estimada:** 150–400 ms en tiempo de render de texto  
**Riesgo:** Bajo. Requiere re-verificar licencias (Open Font License — libre para usar).

---

### ⬜ SKILL-13 · Subset de Font Awesome (solo los íconos usados) 🔥🔥 ⚙️
**Problema:** FA `all.min.css` carga ~1600 íconos. Esta página usa aproximadamente 25.  
**Solución:** Crear un kit personalizado en [fontawesome.com/kits](https://fontawesome.com/kits) o usar solo el SVG de los íconos necesarios con un script de extracción:
```bash
# Alternativa: usar @fortawesome/free-solid-svg-icons selectivamente
# O generar un subset con IcoMoon / Fontello

# Íconos usados en paginaburger.html (grep):
grep -oP 'fa-[\w-]+' paginaburger.html | sort -u
```
**Ganancia estimada:** Reducción de ~1.5 MB a ~25 KB (solo los íconos usados)  
**Riesgo:** Medio. Hay que asegurarse de no omitir íconos cargados dinámicamente por JS.

---

## FASE 5 — Imágenes (LCP visual)

### ⬜ SKILL-14 · Migrar imágenes hero de Imgur a hosting propio o CDN confiable 🔥🔥 ⚙️
**Problema:** `i.imgur.com` puede ratelimitear, caerse o cambiar URLs. Sin control sobre headers de caché ni compresión.  
**Solución:** Subir imagen hero a Firebase Storage o Cloudinary:
```js
// Cloudinary: compresión automática + WebP + redimensionado por URL
const heroUrl = 'https://res.cloudinary.com/[tu-cloud]/image/upload/f_auto,q_auto,w_1920/hero-burger.jpg';
```
Con Cloudinary gratuito se obtiene:
- Auto-formato (WebP en Chrome, AVIF en Chrome 100+)
- Auto-calidad optimizada
- Redimensionado según viewport
- CDN global (Akamai)

**Ganancia estimada:** 30–60% reducción en tamaño de imagen → LCP más rápido  
**Riesgo:** Bajo. URL controlada, CDN profesional.

---

### ⬜ SKILL-15 · `<picture>` + WebP para imágenes del menú 🔥 🏗️
**Problema:** Las imágenes de los productos se sirven como JPEG/PNG desde Imgur. WebP pesa 25–35% menos a igual calidad visual.  
**Solución:** En la generación de cards del menú (en `renderMenu()`):
```html
<picture>
  <source type="image/webp" srcset="url-en-webp.webp">
  <img src="url-original.jpg" alt="..." loading="lazy" decoding="async" width="400" height="400">
</picture>
```
Si se usa Cloudinary, la URL ya maneja el formato automáticamente con `f_auto`.  
**Ganancia estimada:** 25–40% menos datos en imágenes de menú  
**Riesgo:** Medio. Requiere disponibilidad de versiones WebP o CDN que las genere.

---

## MÉTRICAS DE REFERENCIA (Lighthouse Mobile simulado 4G)

| Métrica | Estado actual (estimado) | Objetivo tras todas las fases |
|---------|--------------------------|-------------------------------|
| FCP | ~3.5–5 s | < 1.5 s |
| LCP | ~5–8 s | < 2.5 s |
| TBT | ~1200 ms | < 300 ms |
| CLS | ~0.15–0.25 | < 0.1 |
| TTI | ~6–10 s | < 4 s |
| Lighthouse Score Mobile | ~35–50 | > 80 |

---

## ORDEN RECOMENDADO DE EJECUCIÓN

```
Semana 1 (Quick Wins):
  SKILL-01 → SKILL-02 → SKILL-03 → SKILL-04 → SKILL-05 → SKILL-06

Semana 2 (Firestore):
  SKILL-07 → SKILL-08 → SKILL-09

Semana 3 (SW + CSS):
  SKILL-10 → SKILL-11

Semana 4 (Assets):
  SKILL-12 → SKILL-13 → SKILL-14 → SKILL-15
```

---

*Última actualización: Marzo 2026 · Próxima revisión: tras completar Fase 2*
