/**
 * ============================================
 * CONFIGURACIÓN WHITE-LABEL DEL RESTAURANTE
 * ============================================
 * 
 * Este archivo centraliza TODA la información del negocio.
 * Modifica estos valores para personalizar la aplicación
 * para cualquier restaurante sin tocar el código principal.
 * 
 * También puedes modificar estos valores desde la página:
 * configuracion.html
 */

export const RESTAURANT_CONFIG = {
  // ===== IDENTIFICACIÓN =====
  id: 'sr-sra-burger', // ID único para Firebase (multi-tenant)
  name: 'SR & SRA BURGER',
  tagline: '¡Hechas con Pasión!',
  description: 'Bienvenidos a SR & SRA BURGER, donde cada hamburguesa es hecha con pasión y amor. Somos una pareja trabajando juntos para lograr nuestros sueños, trayéndote el mejor sabor en cada bocado.',
  
  // ===== LOGO =====
  logo: {
    type: 'emoji', // Opciones: 'emoji', 'url', 'svg'
    value: '🍔', // Para emoji: el emoji. Para url: ruta de la imagen. Para svg: código SVG
    alt: 'SR & SRA BURGER Logo'
  },

  // ===== COLORES DE MARCA =====
  colors: {
    primary: '#16A34A',        // Color principal (verde)
    primaryDark: '#15803D',    // Versión oscura del principal
    secondary: '#0B1220',      // Color secundario (azul oscuro)
    accent: '#FFC72C',         // Color de acento (amarillo/dorado)
    textPrimary: '#0F172A',    // Texto principal modo claro
    textSecondary: '#64748B',  // Texto secundario modo claro
    bgLight: '#FFFFFF',        // Fondo claro
    bgSection: '#F8F9FA',      // Fondo de secciones
    borderLight: '#E2E8F0',    // Bordes modo claro
    
    // Dark mode
    darkBg: '#0B1220',
    darkBgSecondary: '#0F172A',
    darkText: '#E5E7EB',
    darkTextSecondary: '#CBD5E1'
  },

  // ===== TIPOGRAFÍAS =====
  fonts: {
    primary: "'Inter', sans-serif",      // Fuente para textos generales
    heading: "'Poppins', sans-serif",    // Fuente para títulos
    googleFontsUrl: "https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&family=Poppins:wght@600;700;800;900&display=swap"
  },

  // ===== CONTACTO =====
  contact: {
    phone: '+52 922 159 3688',
    whatsapp: '+52 922 159 3688',
    email: 'contacto@srysraburger.com', // Opcional
    address: {
      street: 'Coahuila 36',
      neighborhood: '10 de Mayo',
      city: 'Minatitlán',
      state: 'Veracruz',
      country: 'México',
      zipCode: '96740',
      fullAddress: 'Coahuila 36, 10 de Mayo, Minatitlán, Veracruz',
      coordinates: {
        lat: 17.9953, // Coordenadas aproximadas (actualizar con las reales)
        lng: -94.5467
      }
    }
  },

  // ===== REDES SOCIALES =====
  social: {
    facebook: {
      enabled: true,
      url: 'https://www.facebook.com/profile.php?id=61570144580225',
      username: 'SR & SRA BURGER',
      followers: '500+'
    },
    instagram: {
      enabled: true,
      url: 'https://www.instagram.com/srysraburger/',
      username: '@srysraburger',
      tag: 'NEW'
    },
    tiktok: {
      enabled: true,
      url: 'https://www.tiktok.com/@srsra.burger',
      username: '@srsra.burger',
      tag: 'VIRAL'
    },
    twitter: {
      enabled: false,
      url: '',
      username: ''
    }
  },

  // ===== HORARIOS =====
  hours: {
    timezone: 'America/Mexico_City',
    schedule: {
      monday: { open: '15:00', close: '24:00', closed: false },
      tuesday: { open: '15:00', close: '24:00', closed: false },
      wednesday: { open: '15:00', close: '24:00', closed: false },
      thursday: { open: '15:00', close: '24:00', closed: false },
      friday: { open: '15:00', close: '24:00', closed: false },
      saturday: { open: '15:00', close: '24:00', closed: false },
      sunday: { open: '15:00', close: '24:00', closed: false }
    },
    displayFormat: 'Lunes a Domingo de 3:00 PM a 12:00 AM'
  },

  // ===== CONFIGURACIÓN DE ENVÍOS =====
  delivery: {
    enabled: true,
    maxRadiusKm: 12,           // Radio máximo de entrega en kilómetros
    costPerKm: 8,              // Costo por kilómetro
    freeDeliveryMinAmount: 0,  // Monto mínimo para envío gratis (0 = sin envío gratis)
    estimatedTime: {
      zone1: { min: 25, max: 35 }, // Minutos (zona cercana)
      zone2: { min: 35, max: 45 }  // Minutos (zona lejana)
    }
  },

  // ===== PROMOCIONES Y DÍAS ESPECIALES =====
  promotions: {
    enabled: true,
    specialDays: [
      {
        day: 'tuesday',
        name: 'MARTES 2X1',
        title: '2X1 EN HAMBURGUESAS',
        description: 'Compra una hamburguesa y llévate otra gratis',
        icon: '🍔🍔',
        badge: 'PROMO',
        color: 'red'
      },
      {
        day: 'wednesday',
        name: 'MIÉRCOLES ÚNICOS',
        title: 'HAMBURGUESA ÚNICA',
        description: 'Prueba nuestra hamburguesa especial del día, una creación única que solo encontrarás los miércoles',
        icon: '⭐',
        badge: 'ESPECIAL',
        color: 'orange'
      },
      {
        day: 'thursday',
        name: 'JUEVES DE PAPAS',
        title: 'PAPAS GRATIS',
        description: 'Compra una hamburguesa o hotdog y llévate unas papas complemento gratis',
        icon: '🍟',
        badge: 'GRATIS',
        color: 'purple'
      }
    ]
  },

  // ===== MÉTODOS DE PAGO =====
  paymentMethods: {
    cash: { enabled: true, label: 'Efectivo' },
    card: { enabled: true, label: 'Tarjeta' },
    transfer: { enabled: true, label: 'Transferencia' },
    online: { enabled: false, label: 'Pago en línea' }
  },

  // ===== CONFIGURACIÓN DE LA APLICACIÓN =====
  app: {
    version: '2.0.0-whitelabel',
    defaultTheme: 'dark', // 'dark' o 'light'
    showPrices: true,
    enableCustomization: true,
    enableCombos: true,
    showPromotions: true,
    enableUserAccounts: true,
    enableOrderTracking: true,
    currency: 'MXN',
    currencySymbol: '$',
    language: 'es'
  },

  // ===== SEO Y META =====
  seo: {
    title: 'SR & SRA BURGER - ¡Hechas con Pasión!',
    description: 'Las mejores hamburguesas artesanales de Minatitlán. Hechas con pasión y los mejores ingredientes. Ordena ahora por WhatsApp.',
    keywords: 'hamburguesas, Minatitlán, comida rápida, delivery, SR SRA BURGER',
    ogImage: '' // URL de imagen para redes sociales
  },

  // ===== LEGAL =====
  legal: {
    businessName: 'SR & SRA BURGER',
    taxId: '', // RFC o identificador fiscal
    termsUrl: '',
    privacyUrl: ''
  }
};

// ===== CONFIGURACIÓN DE FIREBASE =====
// Esta configuración se mantiene separada por seguridad
// y se carga desde firebase-config.js

/**
 * Función helper para obtener el color primario
 */
export function getPrimaryColor() {
  return RESTAURANT_CONFIG.colors.primary;
}

/**
 * Función helper para obtener la información de contacto completa
 */
export function getContactInfo() {
  return RESTAURANT_CONFIG.contact;
}

/**
 * Función helper para verificar si está abierto ahora
 */
export function isOpenNow() {
  const now = new Date();
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const today = dayNames[now.getDay()];
  const schedule = RESTAURANT_CONFIG.hours.schedule[today];
  
  if (schedule.closed) return false;
  
  const currentTime = now.getHours() * 60 + now.getMinutes();
  const [openHour, openMin] = schedule.open.split(':').map(Number);
  const [closeHour, closeMin] = schedule.close.split(':').map(Number);
  
  const openTime = openHour * 60 + openMin;
  let closeTime = closeHour * 60 + closeMin;
  
  // Si cierra después de medianoche
  if (closeTime < openTime) closeTime += 24 * 60;
  
  return currentTime >= openTime && currentTime <= closeTime;
}

/**
 * Función para obtener el horario formateado
 */
export function getFormattedHours() {
  return RESTAURANT_CONFIG.hours.displayFormat;
}

// Hacer disponible globalmente
if (typeof window !== 'undefined') {
  window.RESTAURANT_CONFIG = RESTAURANT_CONFIG;
  window.isRestaurantOpen = isOpenNow;
}
