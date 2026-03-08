# CLAUDE.md — SR & SRA BURGER · Instrucciones del Proyecto

Archivo de instrucciones para GitHub Copilot / Claude al trabajar en este repositorio.
Leer **siempre** antes de proponer o aplicar cambios.

---

## 1. Arquitectura General

| Capa | Tecnología |
|---|---|
| Servidor | Node.js + Express (`server.js`) |
| Base de datos | Firebase Firestore (SDK web v10) |
| Autenticación | Firebase Auth |
| Estilos | Tailwind CSS (CDN en HTML) + CSS variables en `<style>` |
| Tipografías | Inter (texto) · Poppins (títulos) — Google Fonts |
| Iconografía | Font Awesome 6 |
| Deploy | Vercel (`vercel.json`) |

No existe bundler (ni Webpack ni Vite). Cada página HTML es autocontenida.
Los módulos JS se importan directamente desde URLs de `gstatic.com` (Firebase CDN ESM).

---

## 2. Estructura de Archivos Clave

```
paginaburger.html        — Menú público (página principal del cliente)
admin.html               — Panel de administración
clientes.html            — Gestión de clientes
pedido-manual.html       — Registro manual de pedidos
controldeenvios.html     — Control de repartidores
Productos.html           — Catálogo de productos
inventario.html          — Control de inventario
config/business-config.js — Configuración white-label centralizada
js/firebase-config.js    — Inicialización Firebase + todas las funciones Firestore
js/script.js             — Lógica del frontend (carrito, pedidos, UI)
styles/sr-ui.css         — Componentes UI reutilizables
styles/variables.css     — Variables CSS globales
```

---

## 3. Sistema de Diseño

### 3.1 Variables CSS y Colores de Marca

```css
:root {
  --primary-gold: #16A34A;       /* Verde principal */
  --primary-gold-dark: #15803D;
  --primary-red: #0B1220;        /* Azul-negro secundario */
  --text-primary: #0F172A;
  --text-secondary: #64748B;
  --bg-light: #FFFFFF;
  --bg-section: #F8F9FA;
  --border-radius: 24px;
  --transition: all 220ms cubic-bezier(0.2, 0.8, 0.2, 1);
  --shadow-soft: 0 10px 30px rgba(15, 23, 42, 0.08);
  --shadow-hover: 0 18px 45px rgba(15, 23, 42, 0.14);
}
```

Siempre usar estas variables en lugar de valores hardcodeados.

### 3.2 Dark Mode

- Activado por clase `html.dark` (class-based, NO media query).
- Almacenado en `localStorage` bajo la clave `sr_theme`.
- **Por defecto es oscuro** si no hay preferencia guardada.
- Para estilos dark mode usar el prefijo de Tailwind `dark:` **o** selectores `html.dark .clase`.

```html
<!-- Patrón correcto para Tailwind dark mode -->
<div class="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
```

### 3.3 Glassmorphism (`.glass-effect`)

Clase reutilizable ya definida:

```css
.glass-effect {
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.3);
}
html.dark .glass-effect {
  background: rgba(2, 6, 23, 0.78);
  border: 1px solid rgba(255, 255, 255, 0.08);
}
```

### 3.4 Botones Primarios (`.btn-primary`)

```css
.btn-primary {
  background: linear-gradient(135deg, var(--primary-gold), var(--primary-gold-dark));
  transition: var(--transition);
}
.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-hover);
}
```

### 3.5 Animaciones Recomendadas

Usar siempre `prefers-reduced-motion` como fallback:

```css
@media (prefers-reduced-motion: no-preference) {
  .fade-in { animation: fadeIn 0.4s ease forwards; }
}
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
```

---

## 4. Skills de Diseño

Al editar o crear componentes HTML/CSS aplicar siempre estas reglas:

1. **Mobile-first**: diseñar primero para 375px, luego `md:` y `lg:`.
2. **Espaciado consistente**: usar la escala de Tailwind (`p-4`, `gap-6`, etc.) sin mezclar píxeles arbitrarios.
3. **Tipografía jerárquica**:
   - Títulos H1/H2: `font-bold tracking-tight` con Poppins.
   - Cuerpo: `text-base leading-relaxed` con Inter.
   - Labels/badges: `text-xs font-semibold uppercase tracking-wider`.
4. **Contraste AA mínimo**: revisar que texto sobre fondo cumpla WCAG AA (ratio ≥ 4.5:1).
5. **Estados interactivos**: todo elemento clickeable debe tener `hover:`, `focus-visible:` y `active:` definidos.
6. **Transiciones suaves**: usar `transition-all duration-200` como mínimo.
7. **Rounded corners**: preferir `rounded-2xl` (16px) o `rounded-3xl` (24px) para tarjetas. `rounded-full` para botones de acción.
8. **Sombras por capas**:
   - Superficies: `shadow-sm`
   - Tarjetas: `shadow-md`
   - Modales/overlays: `shadow-2xl`
9. **Iconos FA**: usar `<i class="fa-solid fa-..."></i>` con tamaño explícito (`text-xl`, etc.).
10. **Imágenes responsivas**: siempre `object-cover` + `aspect-ratio` explícito.

---

## 5. Skills de Rendimiento

Al modificar código JS o HTML aplicar estas optimizaciones:

1. **Lazy loading de imágenes**: añadir `loading="lazy"` a toda `<img>` que no sea above-the-fold.
2. **Preload crítico**: recursos above-the-fold deben tener `<link rel="preload">` en `<head>`.
3. **Debounce en inputs**: cualquier handler de `input`/`keyup` que haga Firestore queries debe debouncearse ≥ 300ms.
4. **Paginación Firestore**: usar `limit()` + cursor (`startAfter`) en lugar de traer toda la colección.
5. **Cache local**: antes de hacer `getDocs`, revisar si los datos están en `sessionStorage` o `localStorage` con TTL razonable (5-10 min).
6. **onSnapshot con unsubscribe**: siempre guardar el retorno de `onSnapshot` y llamarlo al destruir/salir de la vista.
7. **Batched writes**: para múltiples actualizaciones usar `writeBatch`.
8. **No bloquear el hilo principal**: código pesado dentro de `requestIdleCallback` o `setTimeout(fn, 0)`.
9. **Font display swap**: en fuentes externas usar `&display=swap` (ya configurado en Google Fonts).
10. **Minimizar reflows**: agrupar lecturas y escrituras del DOM; evitar mezclar `getBoundingClientRect` con cambios de estilo en un mismo loop.
11. **Service Worker** (`sw.js`): el SW ya existe; al agregar nuevos assets estáticos agregarlos al listado de caché del SW.
12. **Evitar CDN Tailwind en prod**: en producción considerar purgar y bundlear Tailwind en lugar de usar el CDN.

---

## 6. Skills de Edición de Código

### 6.1 Convenciones JS

- **ES Modules**: todo JS nuevo usa `import`/`export`.
- **async/await** con `try/catch` explícito; nunca `.then()` sin `.catch()`.
- **Nombres en español** para variables de dominio (`pedido`, `producto`, `cliente`).
- **Nombres en inglés** para helpers genéricos (`formatDate`, `debounce`, `generateId`).
- **No usar `var`**; preferir `const` y `let`.

### 6.2 Firestore

- Todas las funciones Firestore viven en `js/firebase-config.js`.
- Los nombres de colecciones siguen el patrón: `pedidos`, `productos`, `clientes`, `inventario`.
- Para nuevas colecciones, documentarlas en `firebase-config.js` con un comentario de sección.

### 6.3 Configuración White-Label

- Cualquier valor de negocio (nombre, colores, contacto) debe venir de `config/business-config.js`.
- **Nunca hardcodear** `"SR & SRA BURGER"` en HTML nuevo; usar la variable de config.

### 6.4 Patrones HTML

```html
<!-- Tarjeta estándar de producto -->
<div class="bg-white dark:bg-gray-800 rounded-3xl shadow-md p-5 transition-all duration-200 hover:shadow-xl hover:-translate-y-1">
  <img src="..." alt="..." class="w-full aspect-square object-cover rounded-2xl mb-4" loading="lazy">
  <h3 class="font-bold text-lg text-gray-900 dark:text-white">Nombre</h3>
  <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">Descripción</p>
  <span class="text-green-600 dark:text-green-400 font-bold text-xl mt-3 block">$0.00</span>
</div>

<!-- Modal estándar -->
<div id="modal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm hidden">
  <div class="glass-effect rounded-3xl p-6 w-full max-w-md mx-4 shadow-2xl">
    <!-- contenido -->
  </div>
</div>

<!-- Badge de estado -->
<span class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
  <i class="fa-solid fa-circle text-[6px]"></i> Activo
</span>
```

### 6.5 Responsive Breakpoints

| Breakpoint | Tailwind | Uso |
|---|---|---|
| < 640px | (base) | Móvil (mayoría de usuarios) |
| 640px | `sm:` | Móvil grande / tablet portrait |
| 768px | `md:` | Tablet landscape |
| 1024px | `lg:` | Desktop |
| 1280px | `xl:` | Desktop grande |

---

## 7. Reglas Globales para Copilot / Claude

- **No crear archivos markdown de resumen** al terminar una tarea, a menos que el usuario lo pida explícitamente.
- **No instalar paquetes npm** sin justificación y sin avisar primero.
- **No modificar `js/firebase-config.js`** para lógica de UI; ese archivo es solo para Firestore/Auth.
- **Siempre probar dark mode** al crear o modificar componentes visuales.
- **Mantener el idioma**: comentarios y strings visibles al usuario en **español**; código (variables, funciones) en inglés.
- Al refactorizar, **no cambiar la funcionalidad**, solo mejorar legibilidad o rendimiento.
- Si se agrega una nueva página HTML, debe incluir: `<meta charset>`, `viewport`, dark mode init script, Tailwind CDN, Font Awesome CDN y las fuentes Google.
- Preferir ediciones quirúrgicas y precisas sobre reescrituras completas de archivos.

---

## 8. Comandos Frecuentes

```bash
# Iniciar servidor local
npm start

# Iniciar servidor accesible en LAN
npm run dev:lan
# → http://localhost:3000  |  http://<IP_LOCAL>:3000
```

---

## 9. Variables de Entorno

El servidor usa `.env` (no commiteado). Variables esperadas:

| Variable | Descripción |
|---|---|
| `FIREBASE_SERVICE_ACCOUNT` | JSON de credenciales Firebase Admin SDK |
| `MERCADOPAGO_ACCESS_TOKEN` | Token de MercadoPago |
| `GOOGLE_MAPS_API_KEY` | Clave para geocoding |

---

*Última actualización: febrero 2026*
