/**
 * sr-chatbot.js — Widget de chatbot flotante "Burgy"
 * SR & SRA BURGER · Asistente virtual con IA (Gemini)
 *
 * Uso: <script src="js/sr-chatbot.js"></script>  (antes de </body>)
 * El widget se autoinyecta — no requiere HTML adicional.
 */
(function (global) {
  'use strict';

  // ── CONFIG ─────────────────────────────────────────────────────────────
  const API_URL    = '/api/chat';
  const MAX_HIST   = 10;   // turnos anteriores enviados al servidor
  const BOT_NAME   = 'Burgy';
  const PHONE      = '922 159 3688';

  // ── STATE ──────────────────────────────────────────────────────────────
  let _open        = false;
  let _history     = [];   // [{ role:'user'|'bot', text:string }]
  let _typing      = false;
  let _chipsOk     = true; // mostrar chips de acceso rápido
  let _currentUser = null; // usuario de Firebase Auth (actualizado por onAuthStateChanged)

  // ── CSS ────────────────────────────────────────────────────────────────
  const CSS = `
/* ── FAB ──────────────────────────────────────── */
#srb-fab {
  position: fixed; bottom: 1.75rem; left: 1.5rem; z-index: 9990;
  height: 52px; border-radius: 999px;
  padding: 0 1.1rem 0 .85rem;
  background: linear-gradient(135deg,#16A34A,#0f7a30);
  color: #fff; border: none; cursor: pointer;
  display: flex; align-items: center; gap: .55rem;
  box-shadow: 0 8px 28px rgba(22,163,74,.55), 0 0 0 0 rgba(22,163,74,.4);
  transition: transform .22s ease, box-shadow .22s ease, padding .3s ease, border-radius .3s ease, width .3s ease;
  will-change: transform;
  white-space: nowrap; overflow: hidden;
  animation: srb-pulse 2.8s ease-in-out 4s 3;
}
@keyframes srb-pulse {
  0%,100% { box-shadow: 0 8px 28px rgba(22,163,74,.55), 0 0 0 0 rgba(22,163,74,.35); }
  50%      { box-shadow: 0 8px 28px rgba(22,163,74,.65), 0 0 0 10px rgba(22,163,74,0); }
}
#srb-fab.srb-collapsed {
  width: 52px; height: 52px; padding: 0;
  border-radius: 50%; justify-content: center;
}
#srb-fab:hover { transform: scale(1.06) translateY(-2px); box-shadow: 0 14px 36px rgba(22,163,74,.65); }
#srb-fab:focus-visible { outline: 3px solid #4ade80; outline-offset: 3px; }
#srb-fab-icon {
  font-size: 1.3rem; line-height: 1; flex-shrink: 0;
  transition: transform .2s ease;
}
#srb-fab:hover #srb-fab-icon { transform: rotate(-8deg) scale(1.12); }
#srb-fab-label {
  font-family: 'Inter', system-ui, sans-serif;
  font-size: .82rem; font-weight: 800; letter-spacing: -.01em;
  display: flex; flex-direction: column; line-height: 1.1; gap: 1px;
  transition: opacity .25s ease, max-width .3s ease;
  max-width: 160px; overflow: hidden;
}
#srb-fab.srb-collapsed #srb-fab-label { max-width: 0; opacity: 0; pointer-events: none; }
.srb-fab-sublabel {
  font-size: .66rem; font-weight: 500; opacity: .8; letter-spacing: .01em;
}
#srb-fab-badge {
  position: absolute; top: -5px; left: -5px;
  width: 20px; height: 20px; border-radius: 50%; background: #ef4444;
  border: 2px solid #0a1018; display: none; align-items: center;
  justify-content: center; font-size: 9px; font-weight: 800; color: #fff;
  animation: srb-badge-in .3s cubic-bezier(.175,.885,.32,1.5) forwards;
}
@keyframes srb-badge-in { from { transform: scale(0); } to { transform: scale(1); } }
#srb-fab-badge.srb-v { display: flex; }

/* mobile */
@media (max-width: 480px) {
  #srb-fab { bottom: 5.5rem; left: 1rem; height: 48px; }
  #srb-fab.srb-collapsed { width: 48px; height: 48px; }
  #srb-fab-label { font-size: .78rem; }
}

/* ── PANEL ─────────────────────────────────────── */
#srb-panel {
  position: fixed; bottom: 5.75rem; left: 1.5rem; z-index: 9989;
  width: 370px; max-height: 560px;
  display: flex; flex-direction: column;
  border-radius: 24px; overflow: hidden;
  background: rgba(7,10,18,.97); color: #cbd5e1;
  border: 1px solid rgba(255,255,255,.09);
  box-shadow: 0 24px 60px rgba(0,0,0,.65), 0 0 0 1px rgba(22,163,74,.07);
  transform: translateY(14px) scale(.96); opacity: 0; pointer-events: none;
  transition: transform .22s cubic-bezier(.175,.885,.32,1.1), opacity .18s ease;
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  font-size: 14px;
}
#srb-panel.srb-open {
  transform: translateY(0) scale(1); opacity: 1; pointer-events: auto;
}

/* mobile: panel ocupa la parte baja de la pantalla */
@media (max-width: 480px) {
  #srb-panel {
    bottom: 0; right: 0; left: 0; width: 100%;
    border-radius: 22px 22px 0 0; max-height: 72dvh;
  }
}

/* ── HEADER ────────────────────────────────────── */
.srb-hd {
  padding: .85rem 1rem; display: flex; align-items: center; gap: .65rem;
  background: rgba(22,163,74,.07); border-bottom: 1px solid rgba(255,255,255,.07);
  flex-shrink: 0;
}
.srb-av {
  width: 36px; height: 36px; border-radius: 12px; flex-shrink: 0;
  background: linear-gradient(135deg,#16A34A,#15803D);
  display: flex; align-items: center; justify-content: center; font-size: 1rem;
}
.srb-hd-info { flex: 1; min-width: 0; }
.srb-hd-name { font-size: .83rem; font-weight: 800; color: #f1f5f9; letter-spacing: -.01em; }
.srb-hd-sub  { display: flex; align-items: center; gap: .3rem; font-size: .68rem; color: #64748b; margin-top: 1px; }
.srb-dot     { width: 6px; height: 6px; border-radius: 50%; background: #22c55e; box-shadow: 0 0 5px #22c55e; flex-shrink: 0; }
.srb-hd-act  { display: flex; gap: .3rem; }
.srb-icn-btn {
  width: 30px; height: 30px; border-radius: 9px; background: rgba(255,255,255,.06);
  border: 1px solid rgba(255,255,255,.07); color: #94a3b8; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  font-size: .73rem; transition: background .15s, color .15s; padding: 0;
}
.srb-icn-btn:hover { background: rgba(255,255,255,.12); color: #e2e8f0; }
.srb-icn-btn:focus-visible { outline: 2px solid #4ade80; outline-offset: 2px; }

/* ── MESSAGES ──────────────────────────────────── */
.srb-msgs {
  flex: 1; overflow-y: auto; overflow-x: hidden;
  padding: .85rem .85rem .4rem; display: flex; flex-direction: column; gap: .5rem;
  scroll-behavior: smooth; scrollbar-width: thin; scrollbar-color: rgba(255,255,255,.08) transparent;
}
.srb-msgs::-webkit-scrollbar { width: 3px; }
.srb-msgs::-webkit-scrollbar-thumb { background: rgba(255,255,255,.1); border-radius: 3px; }

.srb-msg { max-width: 88%; display: flex; flex-direction: column; animation: srb-in .2s ease forwards; }
@keyframes srb-in { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
.srb-msg.srb-bot  { align-self: flex-start; }
.srb-msg.srb-user { align-self: flex-end; }

.srb-bbl {
  padding: .58rem .82rem; border-radius: 18px;
  font-size: .82rem; line-height: 1.55; word-break: break-word;
}
.srb-bot  .srb-bbl {
  background: rgba(255,255,255,.07); border: 1px solid rgba(255,255,255,.08);
  color: #cbd5e1; border-bottom-left-radius: 5px;
}
.srb-user .srb-bbl {
  background: linear-gradient(135deg,#16A34A,#15803D);
  color: #fff; border-bottom-right-radius: 5px;
}
.srb-meta {
  font-size: .63rem; color: #475569; margin-top: .25rem; padding: 0 .2rem;
}
.srb-bot  .srb-meta { align-self: flex-start; }
.srb-user .srb-meta { align-self: flex-end; }

/* Typing indicator */
.srb-typing .srb-bbl { padding: .65rem .9rem; display: flex; align-items: center; gap: 4px; }
.srb-tdot  { width: 6px; height: 6px; border-radius: 50%; background: #64748b; animation: srb-blink 1.2s ease-in-out infinite; }
.srb-tdot:nth-child(2) { animation-delay: .2s; }
.srb-tdot:nth-child(3) { animation-delay: .4s; }
@keyframes srb-blink { 0%,80%,100%{ opacity:.3; transform:scale(.8); } 40%{ opacity:1; transform:scale(1); } }

/* ── QUICK REPLIES (chips) ─────────────────────── */
.srb-chips {
  padding: .3rem .85rem .55rem; display: flex; flex-wrap: wrap; gap: .38rem; flex-shrink: 0;
}
.srb-chip {
  font-size: .72rem; font-weight: 600; padding: .32rem .72rem;
  border-radius: 999px; background: rgba(22,163,74,.11);
  border: 1px solid rgba(22,163,74,.24); color: #4ade80;
  cursor: pointer; transition: background .15s, transform .12s;
  white-space: nowrap; font-family: inherit; line-height: 1;
}
.srb-chip:hover { background: rgba(22,163,74,.22); transform: translateY(-1px); }
.srb-chip:focus-visible { outline: 2px solid #4ade80; outline-offset: 2px; }

/* ── INPUT AREA ────────────────────────────────── */
.srb-ft {
  padding: .7rem .85rem; border-top: 1px solid rgba(255,255,255,.07);
  display: flex; gap: .5rem; align-items: flex-end;
  background: rgba(0,0,0,.18); flex-shrink: 0;
}
.srb-inp {
  flex: 1; background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.1);
  border-radius: 14px; padding: .52rem .72rem; font-size: .82rem;
  color: #e2e8f0; resize: none; max-height: 88px; min-height: 36px;
  font-family: inherit; line-height: 1.45; outline: none;
  transition: border-color .15s; scrollbar-width: thin;
}
.srb-inp::placeholder { color: #475569; }
.srb-inp:focus { border-color: rgba(22,163,74,.5); }
.srb-inp:disabled { opacity: .5; }

.srb-snd {
  width: 36px; height: 36px; border-radius: 12px; flex-shrink: 0;
  background: linear-gradient(135deg,#16A34A,#15803D);
  border: none; color: #fff; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  font-size: .82rem; align-self: flex-end; margin-bottom: 1px;
  transition: transform .15s, box-shadow .15s; padding: 0;
}
.srb-snd:hover:not(:disabled) { transform: scale(1.07); box-shadow: 0 4px 14px rgba(22,163,74,.4); }
.srb-snd:disabled { opacity: .38; cursor: not-allowed; }
.srb-snd:focus-visible { outline: 2px solid #4ade80; outline-offset: 2px; }

/* ── POWERED ───────────────────────────────────── */
.srb-pwr {
  text-align: center; font-size: .62rem; color: #334155;
  padding: .28rem 0 .5rem; flex-shrink: 0;
}
`;

  // ── HELPERS ────────────────────────────────────────────────────────────
  function now() {
    return new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  }

  function esc(str) {
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /** Convierte **negrita**, *cursiva* y \n → <br> del bot en HTML seguro */
  function fmtBot(text) {
    return esc(text)
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br>');
  }

  // ── BUILD DOM ──────────────────────────────────────────────────────────
  function injectCSS() {
    const s = document.createElement('style');
    s.id = 'srb-css';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function buildHTML() {
    // FAB
    const fab = document.createElement('button');
    fab.id = 'srb-fab';
    fab.setAttribute('aria-label', 'Abrir chat con Burgy — Asistente IA');
    fab.setAttribute('aria-expanded', 'false');
    fab.innerHTML =
      '<span id="srb-fab-icon" aria-hidden="true"><i class="fas fa-robot"></i></span>'
      + '<span id="srb-fab-label"><span>¿En qué te ayudo?</span><span class="srb-fab-sublabel">Asistente IA · Burgy</span></span>'
      + '<span id="srb-fab-badge" aria-hidden="true">1</span>';
    document.body.appendChild(fab);

    // Panel
    const panel = document.createElement('div');
    panel.id = 'srb-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'false');
    panel.setAttribute('aria-label', 'Chat con Burgy — Asistente de SR & SRA BURGER');
    panel.innerHTML = `
      <div class="srb-hd">
        <div class="srb-av" aria-hidden="true">🤖</div>
        <div class="srb-hd-info">
          <div class="srb-hd-name">${esc(BOT_NAME)} · SR &amp; SRA BURGER</div>
          <div class="srb-hd-sub">
            <div class="srb-dot" aria-hidden="true"></div>
            <span>Asistente virtual con IA</span>
          </div>
        </div>
        <div class="srb-hd-act">
          <button class="srb-icn-btn" id="srb-clear" title="Nueva conversación" aria-label="Iniciar nueva conversación">
            <i class="fas fa-rotate-right" aria-hidden="true"></i>
          </button>
          <button class="srb-icn-btn" id="srb-close" title="Cerrar chat" aria-label="Cerrar chat">
            <i class="fas fa-xmark" aria-hidden="true"></i>
          </button>
        </div>
      </div>
      <div class="srb-msgs" id="srb-msgs" role="log" aria-live="polite" aria-label="Conversación"></div>
      <div class="srb-chips" id="srb-chips" role="group" aria-label="Preguntas frecuentes"></div>
      <div class="srb-ft">
        <textarea
          class="srb-inp" id="srb-inp" rows="1" maxlength="500"
          placeholder="Escribe tu pregunta…"
          aria-label="Escribe un mensaje"
        ></textarea>
        <button class="srb-snd" id="srb-snd" aria-label="Enviar mensaje" disabled>
          <i class="fas fa-paper-plane" aria-hidden="true"></i>
        </button>
      </div>
      <div class="srb-pwr" aria-hidden="true">✨ Asistente con IA · SR &amp; SRA BURGER</div>`;
    document.body.appendChild(panel);
  }

  // ── MESSAGES ───────────────────────────────────────────────────────────
  function appendMsg(role, html, addToHistory) {
    const log = document.getElementById('srb-msgs');
    if (!log) return;
    const div = document.createElement('div');
    div.className = `srb-msg srb-${role}`;
    div.innerHTML = `<div class="srb-bbl">${html}</div><div class="srb-meta" aria-hidden="true">${now()}</div>`;
    log.appendChild(div);
    log.scrollTop = log.scrollHeight;
    if (addToHistory) _history.push({ role, text: html });
  }

  function showTyping() {
    const log = document.getElementById('srb-msgs');
    if (!log) return;
    const el = document.createElement('div');
    el.id = 'srb-typing';
    el.className = 'srb-msg srb-bot srb-typing';
    el.setAttribute('aria-label', 'Burgy está escribiendo…');
    el.innerHTML = '<div class="srb-bbl"><div class="srb-tdot"></div><div class="srb-tdot"></div><div class="srb-tdot"></div></div>';
    log.appendChild(el);
    log.scrollTop = log.scrollHeight;
  }

  function hideTyping() {
    document.getElementById('srb-typing')?.remove();
  }

  // ── CHIPS (quick replies) ──────────────────────────────────────────────
  const CHIPS = [
    { label: '📋 Ver el menú',          ask: '¿Cuáles son los productos del menú y sus precios?' },
    { label: '🛒 ¿Cómo hago un pedido?', ask: '¿Cómo hago un pedido paso a paso?' },
    { label: '📍 Horarios y ubicación',  ask: '¿Cuál es el horario de atención y la dirección?' },
    { label: '🚗 Costo de envío',        ask: '¿Cuánto cuesta el envío a domicilio?' },
    { label: '🎁 Puntos y descuentos',   ask: '¿Cómo funciona el sistema de puntos y recompensas?' },
    { label: '🍔 Promociones',           ask: '¿Qué promociones tienen activas?' },
  ];

  function renderChips() {
    if (!_chipsOk) return;
    const box = document.getElementById('srb-chips');
    if (!box) return;
    box.innerHTML = CHIPS.map(c =>
      `<button class="srb-chip" data-q="${esc(c.ask)}">${c.label}</button>`
    ).join('');
    box.querySelectorAll('.srb-chip').forEach(btn =>
      btn.addEventListener('click', () => {
        dismissChips();
        doSend(btn.dataset.q);
      })
    );
  }

  function dismissChips() {
    _chipsOk = false;
    const box = document.getElementById('srb-chips');
    if (box) box.innerHTML = '';
  }

  // ── SEND / API ─────────────────────────────────────────────────────────
  async function doSend(text) {
    text = String(text || '').trim();
    if (!text || _typing) return;

    dismissChips();

    // Snapshot del historial ANTES de agregar el mensaje actual
    const historyForApi = _history.slice(-MAX_HIST).map(m => ({
      role:    m.role === 'bot' ? 'model' : 'user',
      content: m.text.replace(/<[^>]*>/g, ''), // strip HTML para el servidor
    }));

    appendMsg('user', esc(text), true);

    _typing = true;
    setUI(false);
    showTyping();

    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history: historyForApi }),
      });

      hideTyping();

      if (res.status === 429) {
        appendMsg('bot', '⏳ Estás enviando mensajes muy rápido. Espera un momento e intenta de nuevo.', true);
        return;
      }
      if (!res.ok) {
        appendMsg('bot', `⚠️ Ocurrió un error al responder. Intenta de nuevo o llámanos al <strong>${esc(PHONE)}</strong>.`, true);
        return;
      }

      const data  = await res.json();
      const reply = data?.reply || 'Lo siento, no pude generar una respuesta. Intenta de nuevo.';
      appendMsg('bot', fmtBot(reply), true);

    } catch (_) {
      hideTyping();
      appendMsg('bot', `📡 Sin conexión al servidor. Revisa tu internet o llámanos al <strong>${esc(PHONE)}</strong>.`, true);
    } finally {
      _typing = false;
      setUI(true);
      document.getElementById('srb-inp')?.focus();
    }
  }

  // ── UI STATE ───────────────────────────────────────────────────────────
  function setUI(enabled) {
    const inp = document.getElementById('srb-inp');
    const snd = document.getElementById('srb-snd');
    if (inp) inp.disabled = !enabled;
    if (snd) snd.disabled = !enabled || !(inp?.value?.trim());
  }

  function openPanel() {
    _open = true;
    const panel = document.getElementById('srb-panel');
    const fab   = document.getElementById('srb-fab');
    const icon  = document.getElementById('srb-fab-icon');
    const badge = document.getElementById('srb-fab-badge');
    panel?.classList.add('srb-open');
    fab?.classList.add('srb-collapsed');   // colapsa la píldora a círculo
    fab?.setAttribute('aria-expanded', 'true');
    fab?.setAttribute('aria-label', 'Cerrar chat');
    if (icon) icon.innerHTML = '<i class="fas fa-xmark"></i>';
    badge?.classList.remove('srb-v');
    setTimeout(() => document.getElementById('srb-inp')?.focus(), 220);
  }

  function closePanel() {
    _open = false;
    const panel = document.getElementById('srb-panel');
    const fab   = document.getElementById('srb-fab');
    const icon  = document.getElementById('srb-fab-icon');
    panel?.classList.remove('srb-open');
    fab?.classList.add('srb-collapsed');   // permanece colapsado tras 1er uso
    fab?.setAttribute('aria-expanded', 'false');
    fab?.setAttribute('aria-label', 'Abrir chat con Burgy');
    if (icon) icon.innerHTML = '<i class="fas fa-robot"></i>';
    fab?.focus();
  }

  function clearChat() {
    _history = [];
    _chipsOk = true;
    const log = document.getElementById('srb-msgs');
    if (log) log.innerHTML = '';
    showWelcome();
  }

  // ── WELCOME ────────────────────────────────────────────────────────────
  function showWelcome() {
    appendMsg(
      'bot',
      '¡Hola! 👋 Soy <strong>Burgy</strong>, el asistente virtual de <strong>SR &amp; SRA BURGER</strong> 🍔<br><br>¿En qué te puedo ayudar hoy?',
      false // no guardar en historial el saludo
    );
    renderChips();
  }

  // ── EVENT BINDING ──────────────────────────────────────────────────────
  function bindEvents() {
    const fab   = document.getElementById('srb-fab');
    const close = document.getElementById('srb-close');
    const clear = document.getElementById('srb-clear');
    const inp   = document.getElementById('srb-inp');
    const snd   = document.getElementById('srb-snd');

    fab?.addEventListener('click', () => _open ? closePanel() : openPanel());

    close?.addEventListener('click', closePanel);
    clear?.addEventListener('click', clearChat);

    inp?.addEventListener('input', () => {
      // Auto-resize textarea
      inp.style.height = 'auto';
      inp.style.height = Math.min(inp.scrollHeight, 88) + 'px';
      if (snd) snd.disabled = !inp.value.trim() || _typing;
    });

    inp?.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (!snd?.disabled) {
          const val = inp.value;
          inp.value = '';
          inp.style.height = '';
          if (snd) snd.disabled = true;
          doSend(val);
        }
      }
    });

    snd?.addEventListener('click', () => {
      if (inp && !snd.disabled) {
        const val = inp.value;
        inp.value = '';
        inp.style.height = '';
        snd.disabled = true;
        doSend(val);
      }
    });

    // ESC cierra el panel
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && _open) closePanel();
    });
  }

  // ── INIT ───────────────────────────────────────────────────────────────
  function init() {
    if (document.getElementById('srb-fab')) return; // ya inicializado
    injectCSS();
    buildHTML();
    bindEvents();
    showWelcome();

    // Suscribirse al estado de sesión de Firebase.
    // Usamos el helper expuesto por firebase-config.js (API modular v10 correcta).
    // Hacemos polling hasta que firebase-config.js haya cargado el helper.
    (function syncAuthUser() {
      if (typeof window.firebaseGetChatUser === 'function') {
        // Helper disponible: sincronizar _currentUser periódicamente
        _currentUser = window.firebaseGetChatUser();
        setInterval(() => { _currentUser = window.firebaseGetChatUser(); }, 1000);
      } else {
        // firebase-config.js aún no cargó — reintentar
        setTimeout(syncAuthUser, 200);
      }
    })();

    // Mostrar badge de notificación después de 6s si no se ha abierto
    setTimeout(() => {
      if (!_open) {
        document.getElementById('srb-fab-badge')?.classList.add('srb-v');
      }
    }, 6000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})(window);
