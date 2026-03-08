# 🍔 Sistema White-Label para Restaurantes

## 🎯 ¿Qué es esto?

Este es un sistema de pedidos en línea completamente personalizable que puedes adaptar para **cualquier restaurante** en solo minutos. Todo está centralizado en archivos de configuración, por lo que no necesitas tocar el código principal para cambiar colores, textos, información de contacto, etc.

---

## 📁 Estructura del Proyecto

```
proyecto/
├── config/
│   └── business-config.js         ⚙️ Configuración central del negocio
├── styles/
│   ├── variables.css              🎨 Variables CSS (colores, fuentes, espaciados)
│   └── sr-ui.css                  Estilos existentes
├── js/
│   ├── config-loader.js           🔄 Carga y aplica la configuración
│   ├── utils/
│   │   └── dom-helpers.js         🛠️ Utilidades para el DOM
│   ├── components/                (En desarrollo)
│   ├── firebase-config.js         Firebase
│   └── otros archivos JS...
├── pedido-manual.html             📄 Página principal
├── configuracion.html             ⚙️ Panel de administración
└── WHITELABEL-README.md           📖 Este archivo
```

---

## 🚀 Inicio Rápido

### Opción 1: Usando el Panel Visual (Recomendado)

1. Abre **`configuracion.html`** en tu navegador
2. Rellena todos los campos con la información de tu restaurante
3. Prueba los colores en la vista previa
4. Haz clic en **"Guardar Configuración"**
5. Abre **`pedido-manual.html`** y verás todos los cambios aplicados ✨

### Opción 2: Editando el Archivo Manualmente

1. Abre **`config/business-config.js`**
2. Modifica los valores del objeto `RESTAURANT_CONFIG`:

```javascript
export const RESTAURANT_CONFIG = {
  id: 'mi-restaurante',           // ID único
  name: 'Mi Restaurante',          // Nombre
  tagline: '¡La mejor comida!',    // Eslogan
  // ... etc
}
```

3. Guarda el archivo
4. Recarga **`pedido-manual.html`** en el navegador

---

## 🎨 Personalización de Colores

### Método Visual
1. Ve a `configuracion.html`
2. En la pestaña **"Colores"**
3. Usa los selectores de color o escribe los códigos hexadecimales
4. Guarda

### Método Manual
Edita `styles/variables.css`:

```css
:root {
  --primary-color: #16A34A;        /* Tu color principal */
  --primary-color-dark: #15803D;   /* Versión oscura */
  --secondary-color: #0B1220;       /* Color secundario */
  --accent-color: #FFC72C;          /* Color de acento */
}
```

---

## 📞 Configurar Información de Contacto

### En `configuracion.html`:
- Pestaña **"Contacto"**
- Rellena: teléfono, WhatsApp, email
- **Dirección completa** (calle, colonia, ciudad, estado, coordenadas)

### En `business-config.js`:
```javascript
contact: {
  phone: '+52 999 999 9999',
  whatsapp: '+52 999 999 9999',
  email: 'contacto@mirestaurante.com',
  address: {
    street: 'Av. Principal 123',
    neighborhood: 'Centro',
    city: 'Ciudad de México',
    state: 'CDMX',
    zipCode: '06000',
    country: 'México',
    fullAddress: 'Av. Principal 123, Centro, Ciudad de México, CDMX',
    coordinates: {
      lat: 19.432608,
      lng: -99.133209
    }
  }
}
```

---

## 📱 Configurar Redes Sociales

### En `configuracion.html`:
- Pestaña **"Redes Sociales"**
- Activa/desactiva cada red social
- Pega las URLs completas

### En `business-config.js`:
```javascript
social: {
  facebook: {
    enabled: true,
    url: 'https://www.facebook.com/tu-pagina',
    username: 'Tu Restaurante'
  },
  instagram: {
    enabled: true,
    url: 'https://www.instagram.com/tu-usuario/',
    username: '@tu-usuario'
  },
  tiktok: {
    enabled: false,  // Desactivado
    url: '',
    username: ''
  }
}
```

---

## 🕒 Configurar Horarios

### En `configuracion.html`:
- Pestaña **"Horarios"**
- Configura apertura/cierre para cada día
- Marca "Cerrado" si no abres ese día

### En `business-config.js`:
```javascript
hours: {
  displayFormat: 'Lunes a Viernes de 10:00 AM a 10:00 PM',
  schedule: {
    monday: { open: '10:00', close: '22:00', closed: false },
    tuesday: { open: '10:00', close: '22:00', closed: false },
    // ... etc
  }
}
```

---

## 🚚 Configurar Entregas a Domicilio

### En `configuracion.html`:
- Pestaña **"Envíos"**
- Activa/desactiva el servicio
- Define radio máximo y costo por km
- Configura tiempos estimados

### En `business-config.js`:
```javascript
delivery: {
  enabled: true,
  maxRadiusKm: 12,              // Radio máximo en km
  costPerKm: 8,                  // Costo por km
  freeDeliveryMinAmount: 0,      // Envío gratis a partir de (0 = desactivado)
  estimatedTime: {
    zone1: { min: 25, max: 35 }, // Zona cercana (minutos)
    zone2: { min: 35, max: 45 }  // Zona lejana (minutos)
  }
}
```

---

## 🎉 Configurar Promociones

### En `configuracion.html`:
- Pestaña **"Promociones"**
- Agrega/edita/elimina promociones
- Asigna día, título, descripción, ícono

### En `business-config.js`:
```javascript
promotions: {
  enabled: true,
  specialDays: [
    {
      day: 'tuesday',
      name: 'MARTES 2X1',
      title: '2X1 EN HAMBURGUESAS',
      description: 'Compra una y llévate otra gratis',
      icon: '🍔🍔',
      badge: 'PROMO',
      color: 'red'
    }
  ]
}
```

---

## 🎨 Cambiar el Logo

### Opción 1: Emoji
```javascript
logo: {
  type: 'emoji',
  value: '🍔',
  alt: 'Logo'
}
```

### Opción 2: Imagen
```javascript
logo: {
  type: 'url',
  value: 'https://mi-sitio.com/logo.png',
  alt: 'Mi Restaurante Logo'
}
```

### Opción 3: SVG
```javascript
logo: {
  type: 'svg',
  value: '<svg>...</svg>',
  alt: 'Logo'
}
```

---

## 🔥 Firebase Multi-Tenant

El sistema ahora soporta **múltiples restaurantes** en la misma base de datos Firebase.

### Estructura en Firestore:
```
/restaurants
  /{RESTAURANT_ID}
    /products
    /orders
    /customers
    /manual_customers
    /settings
```

### Configurar:
1. En `business-config.js`, define tu `id`:
```javascript
export const RESTAURANT_CONFIG = {
  id: 'mi-restaurante-123',  // ⚠️ Único e inmutable
  // ...
}
```

2. Todas las consultas automáticamente usarán este prefijo

---

## 📤 Exportar/Importar Configuración

### Exportar:
1. Abre `configuracion.html`
2. Haz clic en **"Exportar JSON"**
3. Se descargará un archivo `.json` con toda tu configuración

### Importar:
1. Abre `configuracion.html`
2. Haz clic en **"Importar JSON"**
3. Selecciona el archivo `.json` exportado previamente
4. La configuración se cargará automáticamente

**💡 Útil para:**
- Respaldar tu configuración
- Duplicar configuración a otro proyecto
- Compartir configuración con el equipo

---

## 🛠️ Para Desarrolladores

### Agregar Nuevos Campos Configurables

1. **Agrega el campo en `business-config.js`:**
```javascript
export const RESTAURANT_CONFIG = {
  // ... campos existentes
  miNuevoCampo: 'valor por defecto'
}
```

2. **Agrega el input en `configuracion.html`:**
```html
<div class="input-group">
  <label for="mi-nuevo-campo">Mi Nuevo Campo</label>
  <input type="text" id="mi-nuevo-campo">
</div>
```

3. **Carga/guarda en el script de `configuracion.html`:**
```javascript
// En loadConfigToForm()
document.getElementById('mi-nuevo-campo').value = config.miNuevoCampo || '';

// En saveFormToConfig()
config.miNuevoCampo = document.getElementById('mi-nuevo-campo').value;
```

4. **Aplica en `config-loader.js`:**
```javascript
export function updateMiNuevoCampo() {
  $$('[data-mi-nuevo-campo]').forEach(el => {
    el.textContent = CONFIG.miNuevoCampo;
  });
}

// Llama en initConfigSystem()
```

5. **Usa en el HTML con atributo data-:**
```html
<span data-mi-nuevo-campo></span>
```

### Usar la Configuración en Tu Código

```javascript
import { CONFIG, getRestaurantId } from './js/config-loader.js';

// Acceder a valores
console.log(CONFIG.name);          // Nombre del restaurante
console.log(CONFIG.colors.primary); // Color primario
console.log(getRestaurantId());     // ID para Firebase

// Verificar si está abierto
import { isOpenNow } from './config/business-config.js';
if (isOpenNow()) {
  // El restaurante está abierto
}
```

---

## ⚠️ Problemas Comunes

### Los colores no cambian
- Asegúrate de haber guardado en `configuracion.html`
- Recarga la página con **Ctrl+F5** (limpia caché)
- Verifica que `variables.css` se esté cargando correctamente

### Los textos no se actualizan
- Algunos textos hardcoded aún no tienen data-attributes
- Puedes agregarlos manualmente siguiendo la guía de desarrolladores

### Firebase no encuentra los datos
- Verifica que el `RESTAURANT_ID` en `business-config.js` sea correcto
- Asegúrate de que tus datos en Firebase sigan la estructura multi-tenant

### La configuración no se guarda
- Revisa la consola del navegador (F12) para errores
- Asegúrate de que localStorage esté habilitado
- Verifica permisos de escritura

---

## 📋 Checklist de Implementación

Cuando configures para un nuevo restaurante:

- [ ] Cambiar `id` único en `business-config.js`
- [ ] Actualizar nombre y eslogan
- [ ] Subir/configurar logo
- [ ] Cambiar colores de marca
- [ ] Actualizar teléfono y WhatsApp
- [ ] Ingresar dirección completa y coordenadas
- [ ] Configurar redes sociales
- [ ] Definir horarios de atención
- [ ] Configurar zona de entregas y costos
- [ ] Crear promociones (opcional)
- [ ] Migrar productos a Firebase con el nuevo ID
- [ ] Probar pedidos end-to-end
- [ ] Exportar configuración como respaldo

---

## 🎓 Ejemplos de Uso

### Cambio Rápido de Marca (White-Label)

Tiempo estimado: **5-10 minutos**

1. Abre `configuracion.html`
2. Cambia:
   - ID del restaurante
   - Nombre y eslogan
   - Colores (primario, secundario)
   - Logo
   - Teléfono/WhatsApp
   - Dirección
3. Guarda
4. ¡Listo! Tienes una nueva marca

### Multi-Restaurant Setup

Si gestionas varios restaurantes:

1. Crea una carpeta por restaurante:
```
/restaurante-a/
  config/business-config.js  (id: 'restaurante-a')
  
/restaurante-b/
  config/business-config.js  (id: 'restaurante-b')
```

2. Comparten la misma base de datos Firebase
3. Los datos se separan automáticamente por ID

---

## 🚀 Próximas Mejoras

- [ ] Soporte para múltiples idiomas
- [ ] Temas predefinidos (templates)
- [ ] Editor visual de menú
- [ ] Dashboard de estadísticas
- [ ] Integración con pasarelas de pago
- [ ] App móvil nativa

---

## 📞 Soporte

¿Necesitas ayuda? Contacta al desarrollador o revisa la documentación completa.

---

## 📄 Licencia

Este sistema es propiedad privada. Todos los derechos reservados.

---

**Versión:** 2.0.0 White-Label
**Última actualización:** Enero 2026

---

## 🙏 Créditos

Desarrollado con ❤️ para hacer más fácil la gestión de restaurantes.

**Tecnologías utilizadas:**
- HTML5, CSS3, JavaScript (ES6+)
- Tailwind CSS
- Firebase (Firestore, Auth)
- Font Awesome Icons

---

¡Gracias por usar nuestro sistema! 🎉
