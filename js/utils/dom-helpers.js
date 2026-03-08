/**
 * =============================================
 * DOM HELPERS - Utilidades para manipulación del DOM
 * =============================================
 * 
 * Funciones auxiliares para crear elementos, manipular clases,
 * y otras operaciones comunes del DOM de forma más limpia.
 */

/**
 * Crea un elemento HTML con atributos y contenido
 * @param {string} tag - Etiqueta del elemento (div, span, button, etc.)
 * @param {Object} options - Opciones del elemento
 * @param {string} options.className - Clases CSS
 * @param {string} options.id - ID del elemento
 * @param {string} options.innerHTML - Contenido HTML interno
 * @param {string} options.textContent - Contenido de texto
 * @param {Object} options.attributes - Atributos adicionales
 * @param {Object} options.style - Estilos inline
 * @param {Object} options.dataset - Data attributes
 * @param {Array} options.children - Array de elementos hijos
 * @returns {HTMLElement}
 */
export function createElement(tag, options = {}) {
  const element = document.createElement(tag);
  
  if (options.className) element.className = options.className;
  if (options.id) element.id = options.id;
  if (options.innerHTML) element.innerHTML = options.innerHTML;
  if (options.textContent) element.textContent = options.textContent;
  
  if (options.attributes) {
    Object.entries(options.attributes).forEach(([key, value]) => {
      element.setAttribute(key, value);
    });
  }
  
  if (options.style) {
    Object.assign(element.style, options.style);
  }
  
  if (options.dataset) {
    Object.entries(options.dataset).forEach(([key, value]) => {
      element.dataset[key] = value;
    });
  }
  
  if (options.children && Array.isArray(options.children)) {
    options.children.forEach(child => {
      if (child) element.appendChild(child);
    });
  }
  
  return element;
}

/**
 * Selector más corto (alias de querySelector)
 * @param {string} selector - Selector CSS
 * @param {HTMLElement} parent - Elemento padre (opcional)
 * @returns {HTMLElement|null}
 */
export function $(selector, parent = document) {
  return parent.querySelector(selector);
}

/**
 * Selector múltiple más corto (alias de querySelectorAll)
 * @param {string} selector - Selector CSS
 * @param {HTMLElement} parent - Elemento padre (opcional)
 * @returns {NodeList}
 */
export function $$(selector, parent = document) {
  return parent.querySelectorAll(selector);
}

/**
 * Agregar event listener con opciones
 * @param {HTMLElement|string} element - Elemento o selector
 * @param {string} event - Nombre del evento
 * @param {Function} handler - Manejador del evento
 * @param {Object} options - Opciones del evento
 */
export function on(element, event, handler, options = {}) {
  const el = typeof element === 'string' ? $(element) : element;
  if (el) {
    el.addEventListener(event, handler, options);
  }
}

/**
 * Remover event listener
 * @param {HTMLElement|string} element - Elemento o selector
 * @param {string} event - Nombre del evento
 * @param {Function} handler - Manejador del evento
 */
export function off(element, event, handler) {
  const el = typeof element === 'string' ? $(element) : element;
  if (el) {
    el.removeEventListener(event, handler);
  }
}

/**
 * Toggle de clases CSS
 * @param {HTMLElement|string} element - Elemento o selector
 * @param {...string} classes - Clases a togglear
 */
export function toggleClass(element, ...classes) {
  const el = typeof element === 'string' ? $(element) : element;
  if (el) {
    classes.forEach(cls => el.classList.toggle(cls));
  }
}

/**
 * Agregar clases CSS
 * @param {HTMLElement|string} element - Elemento o selector
 * @param {...string} classes - Clases a agregar
 */
export function addClass(element, ...classes) {
  const el = typeof element === 'string' ? $(element) : element;
  if (el) {
    el.classList.add(...classes);
  }
}

/**
 * Remover clases CSS
 * @param {HTMLElement|string} element - Elemento o selector
 * @param {...string} classes - Clases a remover
 */
export function removeClass(element, ...classes) {
  const el = typeof element === 'string' ? $(element) : element;
  if (el) {
    el.classList.remove(...classes);
  }
}

/**
 * Verificar si un elemento tiene una clase
 * @param {HTMLElement|string} element - Elemento o selector
 * @param {string} className - Clase a verificar
 * @returns {boolean}
 */
export function hasClass(element, className) {
  const el = typeof element === 'string' ? $(element) : element;
  return el ? el.classList.contains(className) : false;
}

/**
 * Mostrar elemento
 * @param {HTMLElement|string} element - Elemento o selector
 */
export function show(element) {
  const el = typeof element === 'string' ? $(element) : element;
  if (el) {
    el.style.display = '';
    removeClass(el, 'hidden');
  }
}

/**
 * Ocultar elemento
 * @param {HTMLElement|string} element - Elemento o selector
 */
export function hide(element) {
  const el = typeof element === 'string' ? $(element) : element;
  if (el) {
    addClass(el, 'hidden');
  }
}

/**
 * Toggle de visibilidad
 * @param {HTMLElement|string} element - Elemento o selector
 */
export function toggle(element) {
  const el = typeof element === 'string' ? $(element) : element;
  if (el) {
    toggleClass(el, 'hidden');
  }
}

/**
 * Remover todos los hijos de un elemento
 * @param {HTMLElement|string} element - Elemento o selector
 */
export function empty(element) {
  const el = typeof element === 'string' ? $(element) : element;
  if (el) {
    while (el.firstChild) {
      el.removeChild(el.firstChild);
    }
  }
}

/**
 * Insertar HTML de forma segura
 * @param {HTMLElement|string} element - Elemento o selector
 * @param {string} html - HTML a insertar
 * @param {string} position - Posición ('beforebegin', 'afterbegin', 'beforeend', 'afterend')
 */
export function insertHTML(element, html, position = 'beforeend') {
  const el = typeof element === 'string' ? $(element) : element;
  if (el) {
    el.insertAdjacentHTML(position, html);
  }
}

/**
 * Animar elemento con clases CSS
 * @param {HTMLElement|string} element - Elemento o selector
 * @param {string} animation - Clase de animación
 * @param {Function} callback - Callback al terminar
 */
export function animate(element, animation, callback) {
  const el = typeof element === 'string' ? $(element) : element;
  if (!el) return;
  
  addClass(el, animation);
  
  const handleAnimationEnd = () => {
    removeClass(el, animation);
    off(el, 'animationend', handleAnimationEnd);
    if (callback) callback();
  };
  
  on(el, 'animationend', handleAnimationEnd);
}

/**
 * Fade in de un elemento
 * @param {HTMLElement|string} element - Elemento o selector
 * @param {number} duration - Duración en ms
 */
export function fadeIn(element, duration = 300) {
  const el = typeof element === 'string' ? $(element) : element;
  if (!el) return;
  
  el.style.opacity = '0';
  el.style.display = '';
  removeClass(el, 'hidden');
  
  let start = null;
  const step = (timestamp) => {
    if (!start) start = timestamp;
    const progress = timestamp - start;
    el.style.opacity = Math.min(progress / duration, 1);
    if (progress < duration) {
      requestAnimationFrame(step);
    }
  };
  requestAnimationFrame(step);
}

/**
 * Fade out de un elemento
 * @param {HTMLElement|string} element - Elemento o selector
 * @param {number} duration - Duración en ms
 */
export function fadeOut(element, duration = 300) {
  const el = typeof element === 'string' ? $(element) : element;
  if (!el) return;
  
  let start = null;
  const step = (timestamp) => {
    if (!start) start = timestamp;
    const progress = timestamp - start;
    el.style.opacity = 1 - Math.min(progress / duration, 1);
    if (progress < duration) {
      requestAnimationFrame(step);
    } else {
      addClass(el, 'hidden');
    }
  };
  requestAnimationFrame(step);
}

/**
 * Slide down de un elemento
 * @param {HTMLElement|string} element - Elemento o selector
 * @param {number} duration - Duración en ms
 */
export function slideDown(element, duration = 300) {
  const el = typeof element === 'string' ? $(element) : element;
  if (!el) return;
  
  el.style.height = '0';
  el.style.overflow = 'hidden';
  el.style.display = '';
  removeClass(el, 'hidden');
  
  const height = el.scrollHeight;
  let start = null;
  
  const step = (timestamp) => {
    if (!start) start = timestamp;
    const progress = timestamp - start;
    el.style.height = Math.min((progress / duration) * height, height) + 'px';
    if (progress < duration) {
      requestAnimationFrame(step);
    } else {
      el.style.height = '';
      el.style.overflow = '';
    }
  };
  requestAnimationFrame(step);
}

/**
 * Slide up de un elemento
 * @param {HTMLElement|string} element - Elemento o selector
 * @param {number} duration - Duración en ms
 */
export function slideUp(element, duration = 300) {
  const el = typeof element === 'string' ? $(element) : element;
  if (!el) return;
  
  const height = el.scrollHeight;
  el.style.height = height + 'px';
  el.style.overflow = 'hidden';
  
  let start = null;
  const step = (timestamp) => {
    if (!start) start = timestamp;
    const progress = timestamp - start;
    el.style.height = (height - Math.min((progress / duration) * height, height)) + 'px';
    if (progress < duration) {
      requestAnimationFrame(step);
    } else {
      addClass(el, 'hidden');
      el.style.height = '';
      el.style.overflow = '';
    }
  };
  requestAnimationFrame(step);
}

/**
 * Debounce de funciones
 * @param {Function} func - Función a hacer debounce
 * @param {number} wait - Tiempo de espera en ms
 * @returns {Function}
 */
export function debounce(func, wait = 300) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle de funciones
 * @param {Function} func - Función a hacer throttle
 * @param {number} limit - Límite de tiempo en ms
 * @returns {Function}
 */
export function throttle(func, limit = 300) {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Scroll suave a un elemento
 * @param {HTMLElement|string} element - Elemento o selector
 * @param {Object} options - Opciones de scroll
 */
export function scrollTo(element, options = {}) {
  const el = typeof element === 'string' ? $(element) : element;
  if (el) {
    el.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
      ...options
    });
  }
}

/**
 * Copiar texto al portapapeles
 * @param {string} text - Texto a copiar
 * @returns {Promise<boolean>}
 */
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    // Fallback para navegadores antiguos
    const textarea = createElement('textarea', {
      textContent: text,
      style: {
        position: 'fixed',
        opacity: '0'
      }
    });
    document.body.appendChild(textarea);
    textarea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textarea);
    return success;
  }
}

/**
 * Formatear moneda
 * @param {number} amount - Cantidad
 * @param {string} currency - Código de moneda
 * @param {string} locale - Locale
 * @returns {string}
 */
export function formatCurrency(amount, currency = 'MXN', locale = 'es-MX') {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency
  }).format(amount);
}

/**
 * Formatear fecha
 * @param {Date|string|number} date - Fecha
 * @param {Object} options - Opciones de formato
 * @param {string} locale - Locale
 * @returns {string}
 */
export function formatDate(date, options = {}, locale = 'es-MX') {
  const dateObj = date instanceof Date ? date : new Date(date);
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...options
  }).format(dateObj);
}

/**
 * Crear un loader/spinner
 * @param {Object} options - Opciones del loader
 * @returns {HTMLElement}
 */
export function createLoader(options = {}) {
  const {
    size = 'md',
    color = 'primary',
    text = ''
  } = options;
  
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };
  
  return createElement('div', {
    className: 'flex items-center justify-center gap-3',
    children: [
      createElement('div', {
        className: `animate-spin rounded-full border-2 border-gray-300 border-t-${color} ${sizeClasses[size]}`
      }),
      text ? createElement('span', {
        textContent: text,
        className: 'text-gray-600'
      }) : null
    ]
  });
}

/**
 * Mostrar notificación toast
 * @param {string} message - Mensaje
 * @param {Object} options - Opciones
 */
export function showToast(message, options = {}) {
  const {
    type = 'info',
    duration = 3000,
    position = 'top-right'
  } = options;
  
  const colors = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    warning: 'bg-yellow-500',
    info: 'bg-blue-500'
  };
  
  const positions = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4'
  };
  
  const toast = createElement('div', {
    className: `fixed ${positions[position]} ${colors[type]} text-white px-6 py-4 rounded-lg shadow-lg z-50 animate-fade-in-up`,
    textContent: message
  });
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    fadeOut(toast, 200);
    setTimeout(() => toast.remove(), 200);
  }, duration);
}

/**
 * Validar formulario
 * @param {HTMLFormElement|string} form - Formulario o selector
 * @returns {Object} - {valid: boolean, errors: Array}
 */
export function validateForm(form) {
  const formEl = typeof form === 'string' ? $(form) : form;
  if (!formEl) return { valid: false, errors: ['Formulario no encontrado'] };
  
  const errors = [];
  const inputs = $$('input[required], textarea[required], select[required]', formEl);
  
  inputs.forEach(input => {
    if (!input.value.trim()) {
      errors.push(`El campo ${input.name || input.id} es requerido`);
      addClass(input, 'border-red-500');
    } else {
      removeClass(input, 'border-red-500');
    }
    
    // Validar email
    if (input.type === 'email' && input.value) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(input.value)) {
        errors.push(`El email ${input.value} no es válido`);
        addClass(input, 'border-red-500');
      }
    }
    
    // Validar teléfono
    if (input.type === 'tel' && input.value) {
      const phoneRegex = /^\+?[\d\s\-()]+$/;
      if (!phoneRegex.test(input.value)) {
        errors.push(`El teléfono ${input.value} no es válido`);
        addClass(input, 'border-red-500');
      }
    }
  });
  
  return {
    valid: errors.length === 0,
    errors
  };
}

// Hacer disponible globalmente si se necesita
if (typeof window !== 'undefined') {
  window.DOMHelpers = {
    createElement,
    $,
    $$,
    on,
    off,
    toggleClass,
    addClass,
    removeClass,
    hasClass,
    show,
    hide,
    toggle,
    empty,
    insertHTML,
    animate,
    fadeIn,
    fadeOut,
    slideDown,
    slideUp,
    debounce,
    throttle,
    scrollTo,
    copyToClipboard,
    formatCurrency,
    formatDate,
    createLoader,
    showToast,
    validateForm
  };
}
