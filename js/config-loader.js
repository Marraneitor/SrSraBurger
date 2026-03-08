/**
 * =============================================
 * CONFIG LOADER - Aplica configuración white-label
 * =============================================
 * 
 * Este script carga la configuración del restaurante y la aplica
 * dinámicamente al DOM, reemplazando textos, colores e imágenes.
 */

import { RESTAURANT_CONFIG } from '../config/business-config.js';
import { $, $$, createElement } from './utils/dom-helpers.js';

/**
 * Cargar configuración (primero desde localStorage, luego desde archivo)
 */
function loadConfig() {
  try {
    const savedConfig = localStorage.getItem('RESTAURANT_CONFIG');
    if (savedConfig) {
      const parsed = JSON.parse(savedConfig);
      // Merge con configuración base
      return { ...RESTAURANT_CONFIG, ...parsed };
    }
  } catch (e) {
    console.warn('No se pudo cargar configuración guardada:', e);
  }
  return RESTAURANT_CONFIG;
}

// Cargar configuración activa
export const CONFIG = loadConfig();

/**
 * Aplicar variables CSS basadas en la configuración
 */
export function applyTheme() {
  const root = document.documentElement;
  const colors = CONFIG.colors;
  
  if (colors) {
    // Aplicar colores principales
    root.style.setProperty('--primary-color', colors.primary);
    root.style.setProperty('--primary-color-dark', colors.primaryDark);
    root.style.setProperty('--secondary-color', colors.secondary);
    root.style.setProperty('--accent-color', colors.accent);
    root.style.setProperty('--text-primary', colors.textPrimary);
    root.style.setProperty('--text-secondary', colors.textSecondary);
    root.style.setProperty('--bg-light', colors.bgLight);
    root.style.setProperty('--bg-section', colors.bgSection);
    root.style.setProperty('--border-light', colors.borderLight);
    
    // Dark mode colors
    if (colors.darkBg) {
      root.style.setProperty('--dark-bg', colors.darkBg);
      root.style.setProperty('--dark-bg-secondary', colors.darkBgSecondary);
      root.style.setProperty('--dark-text', colors.darkText);
      root.style.setProperty('--dark-text-secondary', colors.darkTextSecondary);
    }
    
    // Actualizar gradientes
    root.style.setProperty('--gradient-primary', 
      `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryDark} 100%)`);
  }
  
  console.log('✅ Tema aplicado:', CONFIG.name);
}

/**
 * Actualizar título de la página
 */
export function updatePageTitle() {
  const title = CONFIG.seo?.title || `${CONFIG.name} - ${CONFIG.tagline}`;
  document.title = title;
  
  // Meta description
  const metaDesc = $('meta[name="description"]');
  if (metaDesc && CONFIG.seo?.description) {
    metaDesc.setAttribute('content', CONFIG.seo.description);
  } else if (CONFIG.seo?.description) {
    const meta = createElement('meta', {
      attributes: {
        name: 'description',
        content: CONFIG.seo.description
      }
    });
    document.head.appendChild(meta);
  }
}

/**
 * Actualizar logo en el header
 */
export function updateLogo() {
  const logo = CONFIG.logo;
  if (!logo) return;
  
  // Buscar elementos con clase 'brand-logo' o 'restaurant-logo'
  const logoElements = $$('.brand-logo, .restaurant-logo, [data-logo]');
  
  logoElements.forEach(el => {
    if (logo.type === 'emoji') {
      el.textContent = logo.value;
      el.style.fontSize = '2rem';
    } else if (logo.type === 'url') {
      if (el.tagName === 'IMG') {
        el.src = logo.value;
        el.alt = logo.alt || CONFIG.name;
      } else {
        el.innerHTML = `<img src="${logo.value}" alt="${logo.alt || CONFIG.name}" class="h-8 w-auto">`;
      }
    } else if (logo.type === 'svg') {
      el.innerHTML = logo.value;
    }
  });
  
  // Actualizar favicon
  updateFavicon();
}

/**
 * Actualizar favicon
 */
export function updateFavicon() {
  const logo = CONFIG.logo;
  let faviconLink = $('link[rel="icon"]');
  
  if (!faviconLink) {
    faviconLink = createElement('link', {
      attributes: {
        rel: 'icon'
      }
    });
    document.head.appendChild(faviconLink);
  }
  
  if (logo.type === 'emoji') {
    faviconLink.href = `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='0.9em' font-size='90'>${logo.value}</text></svg>`;
  } else if (logo.type === 'url') {
    faviconLink.href = logo.value;
  }
}

/**
 * Actualizar textos del restaurante
 */
export function updateRestaurantInfo() {
  // Nombre del restaurante
  $$('[data-restaurant-name]').forEach(el => {
    el.textContent = CONFIG.name;
  });
  
  // Tagline/Eslogan
  $$('[data-restaurant-tagline]').forEach(el => {
    el.textContent = CONFIG.tagline;
  });
  
  // Descripción
  $$('[data-restaurant-description]').forEach(el => {
    el.textContent = CONFIG.description;
  });
  
  // Reemplazar menciones hardcoded de "SR & SRA BURGER"
  const textElements = $$('h1, h2, h3, h4, h5, h6, p, span, a, button');
  textElements.forEach(el => {
    if (el.textContent.includes('SR & SRA BURGER')) {
      el.textContent = el.textContent.replace(/SR & SRA BURGER/g, CONFIG.name);
    }
    if (el.textContent.includes('SR SRA BURGER')) {
      el.textContent = el.textContent.replace(/SR SRA BURGER/g, CONFIG.name);
    }
  });
}

/**
 * Actualizar información de contacto
 */
export function updateContactInfo() {
  const contact = CONFIG.contact;
  if (!contact) return;
  
  // Teléfono
  $$('[data-phone]').forEach(el => {
    el.textContent = contact.phone;
    if (el.tagName === 'A') {
      el.href = `tel:${contact.phone}`;
    }
  });
  
  // WhatsApp
  $$('[data-whatsapp]').forEach(el => {
    el.textContent = contact.whatsapp;
    if (el.tagName === 'A') {
      el.href = `https://wa.me/${contact.whatsapp.replace(/[^0-9]/g, '')}`;
    }
  });
  
  // Email
  if (contact.email) {
    $$('[data-email]').forEach(el => {
      el.textContent = contact.email;
      if (el.tagName === 'A') {
        el.href = `mailto:${contact.email}`;
      }
    });
  }
  
  // Dirección
  if (contact.address) {
    $$('[data-address]').forEach(el => {
      el.textContent = contact.address.fullAddress;
    });
    
    $$('[data-address-street]').forEach(el => {
      el.textContent = contact.address.street;
    });
    
    $$('[data-address-city]').forEach(el => {
      el.textContent = contact.address.city;
    });
    
    $$('[data-address-state]').forEach(el => {
      el.textContent = contact.address.state;
    });
  }
  
  // Reemplazar números hardcoded
  const phoneRegex = /\+52\s*922\s*159\s*3688/g;
  textElements = $$('p, span, a, div');
  textElements.forEach(el => {
    if (phoneRegex.test(el.textContent)) {
      el.textContent = el.textContent.replace(phoneRegex, contact.phone);
    }
  });
}

/**
 * Actualizar enlaces de redes sociales
 */
export function updateSocialLinks() {
  const social = CONFIG.social;
  if (!social) return;
  
  // Facebook
  if (social.facebook?.enabled) {
    $$('[data-social-facebook], a[href*="facebook.com"]').forEach(el => {
      if (el.tagName === 'A' && social.facebook.url) {
        el.href = social.facebook.url;
      }
    });
  }
  
  // Instagram
  if (social.instagram?.enabled) {
    $$('[data-social-instagram], a[href*="instagram.com"]').forEach(el => {
      if (el.tagName === 'A' && social.instagram.url) {
        el.href = social.instagram.url;
      }
    });
  }
  
  // TikTok
  if (social.tiktok?.enabled) {
    $$('[data-social-tiktok], a[href*="tiktok.com"]').forEach(el => {
      if (el.tagName === 'A' && social.tiktok.url) {
        el.href = social.tiktok.url;
      }
    });
  }
  
  // Twitter
  if (social.twitter?.enabled) {
    $$('[data-social-twitter], a[href*="twitter.com"]').forEach(el => {
      if (el.tagName === 'A' && social.twitter.url) {
        el.href = social.twitter.url;
      }
    });
  }
  
  // Ocultar redes sociales deshabilitadas
  if (!social.facebook?.enabled) {
    $$('[data-social-facebook]').forEach(el => el.style.display = 'none');
  }
  if (!social.instagram?.enabled) {
    $$('[data-social-instagram]').forEach(el => el.style.display = 'none');
  }
  if (!social.tiktok?.enabled) {
    $$('[data-social-tiktok]').forEach(el => el.style.display = 'none');
  }
  if (!social.twitter?.enabled) {
    $$('[data-social-twitter]').forEach(el => el.style.display = 'none');
  }
}

/**
 * Actualizar horarios
 */
export function updateBusinessHours() {
  const hours = CONFIG.hours;
  if (!hours) return;
  
  $$('[data-business-hours]').forEach(el => {
    el.textContent = hours.displayFormat;
  });
  
  // Reemplazar horarios hardcoded
  const hoursRegex = /Lunes a Domingo de 3:00 PM a 12:00 AM/g;
  const textElements = $$('p, span, div');
  textElements.forEach(el => {
    if (hoursRegex.test(el.textContent)) {
      el.textContent = el.textContent.replace(hoursRegex, hours.displayFormat);
    }
  });
}

/**
 * Actualizar información de delivery
 */
export function updateDeliveryInfo() {
  const delivery = CONFIG.delivery;
  if (!delivery) return;
  
  $$('[data-delivery-radius]').forEach(el => {
    el.textContent = `${delivery.maxRadiusKm} km`;
  });
  
  $$('[data-delivery-cost]').forEach(el => {
    el.textContent = `$${delivery.costPerKm}/km`;
  });
  
  // Reemplazar info hardcoded
  const radiusRegex = /12\s*km/g;
  const costRegex = /\$8\s*por\s*km/gi;
  const textElements = $$('p, span, div, li');
  
  textElements.forEach(el => {
    if (radiusRegex.test(el.textContent)) {
      el.textContent = el.textContent.replace(radiusRegex, `${delivery.maxRadiusKm} km`);
    }
    if (costRegex.test(el.textContent)) {
      el.textContent = el.textContent.replace(costRegex, `$${delivery.costPerKm} por km`);
    }
  });
  
  // Ocultar sección de delivery si está deshabilitado
  if (!delivery.enabled) {
    $$('[data-delivery-section]').forEach(el => el.style.display = 'none');
  }
}

/**
 * Actualizar promociones
 */
export function updatePromotions() {
  const promos = CONFIG.promotions;
  if (!promos || !promos.enabled) {
    $$('[data-promotions-section]').forEach(el => el.style.display = 'none');
    return;
  }
  
  // Aquí se podría generar dinámicamente las tarjetas de promociones
  // basadas en CONFIG.promotions.specialDays
}

/**
 * Inicializar todo el sistema de configuración
 */
export function initConfigSystem() {
  console.log('🎨 Inicializando sistema White-Label...');
  console.log('📋 Restaurante:', CONFIG.name);
  
  try {
    applyTheme();
    updatePageTitle();
    updateLogo();
    updateRestaurantInfo();
    updateContactInfo();
    updateSocialLinks();
    updateBusinessHours();
    updateDeliveryInfo();
    updatePromotions();
    
    console.log('✅ Sistema White-Label cargado correctamente');
  } catch (error) {
    console.error('❌ Error al cargar configuración:', error);
  }
}

/**
 * Recargar configuración (útil después de cambios en configuracion.html)
 */
export function reloadConfig() {
  location.reload();
}

/**
 * Obtener ID del restaurante para Firebase
 */
export function getRestaurantId() {
  return CONFIG.id;
}

/**
 * Obtener configuración completa
 */
export function getConfig() {
  return CONFIG;
}

// Exponer funciones globalmente para uso en otros scripts
if (typeof window !== 'undefined') {
  window.RestaurantConfig = CONFIG;
  window.getRestaurantId = getRestaurantId;
  window.getConfig = getConfig;
  window.reloadConfig = reloadConfig;
  window.initConfigSystem = initConfigSystem;
}

// Auto-inicializar cuando el DOM esté listo
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initConfigSystem);
  } else {
    initConfigSystem();
  }
}
