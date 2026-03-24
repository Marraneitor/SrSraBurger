/**
 * SR & SRA BURGER — SPA Performance Router v1.0
 * ─────────────────────────────────────────────
 * Estrategias implementadas:
 *   1. Transiciones suaves (Web Animations API) con overlay fade
 *   2. Pre-fetching inteligente en hover/touchstart (imágenes + recursos)
 *   3. Cache en memoria de posiciones de scroll por sección
 *   4. History API (botones atrás/adelante del navegador)
 *   5. Intersection Observer — lazy images + content-visibility fallback
 *   6. Skeleton Screens para el menú mientras Firebase carga
 *   7. MutationObserver para imágenes inyectadas dinámicamente
 *
 * Compatible con el stack existente (vanilla JS, Tailwind CDN, Firebase v10).
 * No depende de ningún módulo externo.
 */
(function SpaRouter() {
    'use strict';

    /* ══════════════════════════════════════════════════
       CONFIGURACIÓN
    ══════════════════════════════════════════════════ */
    const CFG = {
        transitionMs: 200,           // duración del fade de transición
        prefetchIdleMs: 120,         // timeout antes de prefetch (idle)
        skeletonCardCount: 6,        // nº de cards skeleton en el menú
        sectionOffset: 72,           // px del header sticky para offset de scroll
        reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    };

    /* ══════════════════════════════════════════════════
       ESTADO INTERNO
    ══════════════════════════════════════════════════ */
    /** @type {Map<string, {scrollY: number, timestamp: number}>} */
    const viewCache = new Map();

    /** Secciones cuyas imágenes ya se prefetchearon */
    const prefetchSet = new Set();

    let activeSection = _getHashSection();
    let _transitioning = false;

    /* ══════════════════════════════════════════════════
       UTILIDADES
    ══════════════════════════════════════════════════ */
    function _getHashSection() {
        return location.hash.replace('#', '').trim() || 'inicio';
    }

    function _el(id) {
        return document.getElementById(id);
    }

    /**
     * Versión segura de requestIdleCallback con fallback a setTimeout.
     */
    function _idle(fn, opts) {
        if ('requestIdleCallback' in window) {
            return requestIdleCallback(fn, opts || { timeout: 300 });
        }
        return setTimeout(fn, (opts && opts.timeout) || 100);
    }

    /* ══════════════════════════════════════════════════
       OVERLAY DE TRANSICIÓN
    ══════════════════════════════════════════════════ */
    function _createOverlay() {
        if (_el('spa-overlay')) return;
        const div = document.createElement('div');
        div.id = 'spa-overlay';
        div.setAttribute('aria-hidden', 'true');
        div.style.cssText = [
            'position:fixed',
            'inset:0',
            'z-index:9990',
            'pointer-events:none',
            'opacity:0',
            'will-change:opacity',
            // Color semi-transparente que se adapta al tema
            'background:var(--spa-overlay-bg,rgba(255,255,255,0.55))',
        ].join(';');
        document.body.appendChild(div);
    }

    function _fadeOverlay(targetOpacity) {
        const overlay = _el('spa-overlay');
        if (!overlay || CFG.reducedMotion) return Promise.resolve();
        return overlay.animate(
            [{ opacity: overlay.style.opacity || 0 }, { opacity: targetOpacity }],
            { duration: CFG.transitionMs, easing: 'ease-in-out', fill: 'forwards' }
        ).finished;
    }

    /* ══════════════════════════════════════════════════
       PREFETCH MANAGER — hover / touchstart
    ══════════════════════════════════════════════════ */
    function _prefetchSection(sectionId) {
        if (!sectionId || prefetchSet.has(sectionId)) return;
        prefetchSet.add(sectionId);

        _idle(() => {
            const section = _el(sectionId)
                || document.querySelector(`[data-section="${sectionId}"]`);
            if (!section) return;

            // Prefetch de imágenes lazy (data-src) dentro de la sección
            section.querySelectorAll('img[data-src]').forEach(img => {
                _addPrefetchLink(img.dataset.src, 'image');
            });

            // Prefetch de imágenes loading="lazy" que aún no se descargaron
            section.querySelectorAll('img[loading="lazy"]').forEach(img => {
                const src = img.src || img.dataset.src;
                if (src && !img.complete) _addPrefetchLink(src, 'image');
            });

            document.dispatchEvent(
                new CustomEvent('spa:prefetch', { detail: { section: sectionId } })
            );
        }, { timeout: CFG.prefetchIdleMs });
    }

    function _addPrefetchLink(href, as) {
        if (!href || document.querySelector(`link[rel="prefetch"][href="${href}"]`)) return;
        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.as = as;
        link.href = href;
        document.head.appendChild(link);
    }

    function _setupPrefetching() {
        // Desktop: hover
        document.addEventListener('mouseover', e => {
            const link = e.target.closest('a[href^="#"]');
            if (link) _prefetchSection(link.getAttribute('href').slice(1));
        }, { passive: true });

        // Móvil: dedo baja antes del click
        document.addEventListener('touchstart', e => {
            const link = e.target.closest('a[href^="#"]');
            if (link) _prefetchSection(link.getAttribute('href').slice(1));
        }, { passive: true });
    }

    /* ══════════════════════════════════════════════════
       CACHE Y TRANSICIÓN DE SECCIONES
    ══════════════════════════════════════════════════ */
    async function _navigateTo(sectionId, pushState) {
        if (_transitioning) return;

        const target = _el(sectionId)
            || document.querySelector(`[data-section="${sectionId}"]`);
        if (!target) return;

        _transitioning = true;

        // Guardar scroll de la sección que se abandona
        if (activeSection) {
            viewCache.set(activeSection, { scrollY: window.scrollY, timestamp: Date.now() });
        }

        // Fade-in del overlay (pantalla se atenúa levemente)
        await _fadeOverlay(1);

        // Calcular destino: usar caché si ya se visitó
        const cached = viewCache.get(sectionId);
        let targetY;
        if (cached !== undefined) {
            targetY = cached.scrollY;
        } else {
            const rect = target.getBoundingClientRect();
            targetY = Math.max(0, rect.top + window.scrollY - CFG.sectionOffset);
        }

        // Saltar instantáneamente (el overlay oculta el "flash")
        window.scrollTo({ top: targetY, behavior: 'instant' });

        // Actualizar historial
        if (pushState !== false) {
            const newUrl = location.pathname + location.search + '#' + sectionId;
            history.pushState({ section: sectionId }, '', newUrl);
        }

        // Fade-out del overlay
        await _fadeOverlay(0);

        // Cerrar menú móvil si está abierto
        _closeMobileMenu();

        activeSection = sectionId;
        viewCache.set(sectionId, { scrollY: window.scrollY, timestamp: Date.now() });

        document.dispatchEvent(
            new CustomEvent('spa:navigate', { detail: { section: sectionId } })
        );

        _transitioning = false;
    }

    function _closeMobileMenu() {
        const menu = _el('mobile-menu');
        const overlay = _el('mobile-menu-overlay');
        if (!menu) return;
        if (!menu.classList.contains('-translate-x-full')) {
            menu.classList.add('-translate-x-full');
            if (overlay) overlay.classList.add('hidden');
        }
    }

    /* ══════════════════════════════════════════════════
       INTERCEPTAR CLICKS EN LINKS #HASH
    ══════════════════════════════════════════════════ */
    function _interceptLinks() {
        document.addEventListener('click', e => {
            const link = e.target.closest('a[href^="#"]');
            if (!link) return;

            const hash = link.getAttribute('href').slice(1);
            if (!hash) return;

            // Solo interceptar si la sección existe en el DOM
            const exists = _el(hash)
                || document.querySelector(`[data-section="${hash}"]`);
            if (!exists) return;

            e.preventDefault();
            _navigateTo(hash, true);
        }, { capture: false });
    }

    /* ══════════════════════════════════════════════════
       HISTORY API — botones atrás / adelante
    ══════════════════════════════════════════════════ */
    function _setupHistory() {
        // Registrar estado inicial
        history.replaceState({ section: activeSection }, '', location.href);

        window.addEventListener('popstate', e => {
            const section = (e.state && e.state.section) || _getHashSection();
            _navigateTo(section, false);
        });
    }

    /* ══════════════════════════════════════════════════
       SKELETON SCREENS — menú mientras Firebase carga
    ══════════════════════════════════════════════════ */
    function _buildSkeletonCard() {
        return `
            <div class="spa-sk-card" role="presentation" aria-hidden="true">
                <div class="spa-sk-img spa-shimmer"></div>
                <div class="spa-sk-body">
                    <div class="spa-sk-line spa-shimmer" style="width:72%"></div>
                    <div class="spa-sk-line spa-shimmer" style="width:48%;height:10px;margin-top:5px"></div>
                    <div class="spa-sk-price spa-shimmer"></div>
                    <div class="spa-sk-btn spa-shimmer"></div>
                </div>
            </div>`;
    }

    function _showMenuSkeleton() {
        const cats = _el('menu-categories');
        if (!cats) return;
        // No mostrar si ya hay contenido renderizado
        if (cats.children.length > 0) return;
        // No mostrar si el gate está visible (usuario aún no hizo click en "Mostrar menú")
        const gate = _el('menu-gate');
        if (gate && !gate.classList.contains('hidden')) return;
        // No duplicar
        if (_el('spa-skeleton-root')) return;

        const root = document.createElement('div');
        root.id = 'spa-skeleton-root';
        root.setAttribute('aria-label', 'Cargando menú…');
        root.setAttribute('role', 'status');

        // Cabecera skeleton
        root.innerHTML = `
            <div class="spa-sk-header">
                <div class="spa-sk-line spa-shimmer" style="width:40%;height:18px;margin:0 auto 8px"></div>
                <div class="spa-sk-line spa-shimmer" style="width:62%;height:10px;margin:0 auto"></div>
            </div>
            <div class="spa-sk-grid">
                ${Array.from({ length: CFG.skeletonCardCount }, _buildSkeletonCard).join('')}
            </div>`;
        cats.appendChild(root);
    }

    function _removeMenuSkeleton() {
        const root = _el('spa-skeleton-root');
        if (!root) return;
        // Fade suave antes de remover
        root.style.transition = 'opacity 0.25s ease';
        root.style.opacity = '0';
        setTimeout(() => root.remove(), 260);
    }

    function _watchMenuForContent() {
        const cats = _el('menu-categories');
        if (!cats) return;

        const remove = () => {
            if (cats.children.length > 1 || (cats.children.length === 1 && !cats.querySelector('#spa-skeleton-root'))) {
                _removeMenuSkeleton();
                mo.disconnect();
            }
        };

        const mo = new MutationObserver(remove);
        mo.observe(cats, { childList: true });
        // También escuchar el evento nativo que emite script.js.backup
        document.addEventListener('menuRendered', () => {
            _removeMenuSkeleton();
            mo.disconnect();
        }, { once: true });
    }

    /* ══════════════════════════════════════════════════
       INTERSECTION OBSERVER — lazy images
    ══════════════════════════════════════════════════ */
    function _setupLazyImages() {
        if (!('IntersectionObserver' in window)) return;

        const loadImg = img => {
            if (img.dataset.src) {
                img.src = img.dataset.src;
                img.removeAttribute('data-src');
                img.classList.add('spa-img-reveal');
            }
        };

        const observer = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    loadImg(entry.target);
                    observer.unobserve(entry.target);
                }
            });
        }, { rootMargin: '250px 0px', threshold: 0 });

        // Observar imágenes existentes
        document.querySelectorAll('img[data-src]').forEach(img => observer.observe(img));

        // Observar imágenes inyectadas dinámicamente (menu cards de Firebase)
        const mo = new MutationObserver(mutations => {
            mutations.forEach(m => {
                m.addedNodes.forEach(node => {
                    if (node.nodeType !== 1) return;
                    if (node.tagName === 'IMG' && node.dataset.src) {
                        observer.observe(node);
                    }
                    node.querySelectorAll && node.querySelectorAll('img[data-src]')
                        .forEach(img => observer.observe(img));
                });
            });
        });
        mo.observe(document.body, { childList: true, subtree: true });
    }

    /* ══════════════════════════════════════════════════
       ACTIVE NAV LINK — resaltar enlace de sección visible
    ══════════════════════════════════════════════════ */
    function _setupActiveNavHighlight() {
        const sections = ['inicio', 'menu', 'nosotros', 'contacto', 'faq'].map(_el).filter(Boolean);
        if (!sections.length || !('IntersectionObserver' in window)) return;

        const navLinks = document.querySelectorAll('a[href^="#"]');

        const updateActive = id => {
            navLinks.forEach(link => {
                const hash = link.getAttribute('href').slice(1);
                const isActive = hash === id;
                link.setAttribute('aria-current', isActive ? 'page' : 'false');
                link.classList.toggle('spa-nav-active', isActive);
            });
        };

        const io = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    activeSection = entry.target.id;
                    updateActive(entry.target.id);
                }
            });
        }, { rootMargin: '-30% 0px -60% 0px', threshold: 0 });

        sections.forEach(s => io.observe(s));
    }

    /* ══════════════════════════════════════════════════
       INIT
    ══════════════════════════════════════════════════ */
    function _init() {
        _createOverlay();
        _interceptLinks();
        _setupHistory();
        _setupPrefetching();
        _setupLazyImages();
        _setupActiveNavHighlight();

        // Skeleton: sólo si el menú aún no tiene contenido tras 600 ms
        // (evitar flash innecesario si Firebase carga rápido)
        setTimeout(() => {
            _showMenuSkeleton();
            _watchMenuForContent();
        }, 600);

        // Marcar sección inicial en caché
        viewCache.set(activeSection, { scrollY: window.scrollY, timestamp: Date.now() });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _init);
    } else {
        _init();
    }

    /* ══════════════════════════════════════════════════
       API PÚBLICA (window.SpaRouter)
    ══════════════════════════════════════════════════ */
    window.SpaRouter = {
        /** Navegar programáticamente a una sección */
        navigate: _navigateTo,
        /** Prefetch manual de una sección */
        prefetch: _prefetchSection,
        /** Mostrar skeleton del menú manualmente */
        showMenuSkeleton: _showMenuSkeleton,
        /** Ocultar skeleton del menú */
        removeMenuSkeleton: _removeMenuSkeleton,
        /** Cache de scroll por sección (read-only) */
        get cache() { return viewCache; },
    };
})();
