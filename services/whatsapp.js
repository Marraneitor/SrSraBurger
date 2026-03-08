/**
 * services/whatsapp.js
 * Servicio singleton de WhatsApp usando Baileys.
 * Se importa como CJS pero usa dynamic import() internamente para cargar Baileys (ESM).
 */

const path = require('path');
const fs   = require('fs');
const { EventEmitter } = require('events');
const QRCode = require('qrcode');

const AUTH_DIR   = path.join(__dirname, '..', 'data', 'wa-auth');
const CONFIG_FILE = path.join(__dirname, '..', 'data', 'whatsapp-config.json');

// ─── Logger silencioso para Baileys ─────────────────────────────────────────
const baileysLogger = {
  level : 'silent',
  trace : () => {},
  debug : () => {},
  info  : () => {},
  warn  : (obj) => { if (obj && obj.err) console.warn('[WA warn]', obj.err?.message || obj); },
  error : (obj) => { console.error('[WA error]', obj?.err?.message || obj); },
  fatal : (obj) => { console.error('[WA fatal]', obj?.err?.message || obj); },
  child : function()  { return this; },
};

// ─── Clase principal ────────────────────────────────────────────────────────
class WhatsAppService extends EventEmitter {
  constructor() {
    super();
    this.sock          = null;
    this.qrRaw         = null;   // string raw del QR (para re-enviar a nuevos clientes SSE)
    this.qrDataUrl     = null;   // PNG base64 del QR
    this.connected     = false;
    this.phoneNumber   = '';
    this._reconnTimer  = null;
    this._initialized  = false;
    this._config       = this._loadConfig();
  }

  // ── Config (grupos seleccionados) ────────────────────────────────────────
  _loadConfig() {
    try {
      if (fs.existsSync(CONFIG_FILE)) {
        return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
      }
    } catch (_) {}
    return { groupId: null, groupName: null, deliveryGroupId: null, deliveryGroupName: null };
  }

  /**
   * @param {string} groupId
   * @param {string} groupName
   * @param {'orders'|'delivery'} [type='orders'] — 'orders' = cocina, 'delivery' = repartidores
   */
  saveConfig(groupId, groupName, type = 'orders') {
    if (type === 'delivery') {
      this._config = { ...this._config, deliveryGroupId: groupId, deliveryGroupName: groupName };
    } else {
      this._config = { ...this._config, groupId, groupName };
    }
    try {
      fs.mkdirSync(path.dirname(CONFIG_FILE), { recursive: true });
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(this._config, null, 2));
    } catch (e) { console.error('Error guardando config WA:', e.message); }
  }

  getConfig()   { return this._config; }
  getStatus() {
    return {
      connected   : this.connected,
      hasQr       : !!this.qrDataUrl,
      qrDataUrl   : this.qrDataUrl,
      phoneNumber : this.phoneNumber,
      config      : this._config,
    };
  }

  // ── Inicializar (llamar una sola vez al arrancar el server) ─────────────
  async init() {
    if (this._initialized) return;
    this._initialized = true;
    await this._connect();
  }

  // ── Conexión / reconexión ───────────────────────────────────────────────
  async _connect() {
    try {
      const {
        makeWASocket,
        useMultiFileAuthState,
        fetchLatestBaileysVersion,
        DisconnectReason,
      } = await import('@whiskeysockets/baileys');

      fs.mkdirSync(AUTH_DIR, { recursive: true });

      const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
      const { version }          = await fetchLatestBaileysVersion();

      this.sock = makeWASocket({
        version,
        auth    : state,
        browser : ['SR Burger Admin', 'Chrome', '10.0'],
        logger  : baileysLogger,
        getMessage: async () => undefined, // Evita errores de messages.update sin store
      });

      // Guardar credenciales cuando cambian
      this.sock.ev.on('creds.update', saveCreds);

      // Eventos de conexión
      this.sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          this.qrRaw     = qr;
          this.connected = false;
          try {
            this.qrDataUrl = await QRCode.toDataURL(qr, { width: 280, margin: 2 });
          } catch (_) {
            this.qrDataUrl = null;
          }
          this.emit('qr', this.qrDataUrl);
          console.log('📱 [WhatsApp] Escanea el QR en /notifi.html');
        }

        if (connection === 'open') {
          this.connected = true;
          this.qrRaw     = null;
          this.qrDataUrl = null;
          // Intentar obtener número de teléfono del usuario conectado
          try {
            const jid = this.sock.user?.id || '';
            this.phoneNumber = jid.split(':')[0].split('@')[0];
          } catch (_) {}
          this.emit('connected', { phoneNumber: this.phoneNumber });
          console.log(`✅ [WhatsApp] Conectado como +${this.phoneNumber}`);
        }

        if (connection === 'close') {
          const code      = lastDisconnect?.error?.output?.statusCode;
          const loggedOut = code === DisconnectReason.loggedOut;

          this.connected   = false;
          this.phoneNumber = '';
          console.log(`🔌 [WhatsApp] Desconectado. loggedOut=${loggedOut}`);

          // Limpiar auth si fue logout explícito
          if (loggedOut) {
            this._clearAuth();
            this.emit('disconnected', { loggedOut });
          } else {
            // Reconexion automática — no mostrar estado "desconectado" definitivo
            this.emit('reconnecting', {});
          }

          // En ambos casos reconectar (si fue logout, mostrará nuevo QR)
          const delay = loggedOut ? 2000 : 5000;
          this._reconnTimer = setTimeout(() => this._connect(), delay);
        }
      });

    } catch (err) {
      console.error('❌ [WhatsApp] Error iniciando servicio:', err.message);
      this._initialized = false; // permitir reintento
      this._reconnTimer = setTimeout(() => {
        this._initialized = true;
        this._connect();
      }, 8000);
    }
  }

  // ── Cerrar sesión manualmente ───────────────────────────────────────────
  async logout() {
    if (this._reconnTimer) { clearTimeout(this._reconnTimer); this._reconnTimer = null; }
    try { await this.sock?.logout(); } catch (_) {}
    this._clearAuth();
    this.connected   = false;
    this.phoneNumber = '';
    this.qrRaw       = null;
    this.qrDataUrl   = null;
    this._initialized = false;
    this.emit('disconnected', { loggedOut: true });
    console.log('🚪 [WhatsApp] Sesión cerrada. Generando nuevo QR...');
    setTimeout(() => this.init(), 1500);
  }

  _clearAuth() {
    try { fs.rmSync(AUTH_DIR, { recursive: true, force: true }); } catch (_) {}
  }

  // ── Obtener grupos del usuario ──────────────────────────────────────────
  async getGroups() {
    if (!this.connected || !this.sock) return [];
    try {
      const all = await this.sock.groupFetchAllParticipating();
      return Object.values(all)
        .map(g => ({
          id    : g.id,
          name  : g.subject || '(sin nombre)',
          count : g.participants?.length || 0,
        }))
        .sort((a, b) => a.name.localeCompare(b.name, 'es'));
    } catch (e) {
      console.error('[WhatsApp] Error obteniendo grupos:', e.message);
      return [];
    }
  }

  // ── Enviar mensaje al grupo de cocina/pedidos ─────────────────────────
  async sendToGroup(text) {
    if (!this.connected || !this.sock) {
      throw new Error('WhatsApp no está conectado');
    }
    const { groupId, groupName } = this._config;
    if (!groupId)  throw new Error('No hay grupo de cocina configurado. Ve a /notifi.html');
    console.log(`[WA] ► Enviando a Cocina — ${groupName} (${groupId})`);
    try {
      await this.sock.sendMessage(groupId, { text });
      console.log(`[WA] ✅ Mensaje enviado a Cocina — ${groupName}`);
    } catch (err) {
      console.error(`[WA] ❌ Error enviando a Cocina (${groupId}):`, err.message);
      throw err;
    }
  }

  // ── Enviar mensaje al grupo de repartidores ─────────────────────────────
  async sendToDeliveryGroup(text) {
    if (!this.connected || !this.sock) {
      throw new Error('WhatsApp no está conectado');
    }
    const { deliveryGroupId, deliveryGroupName } = this._config;
    if (!deliveryGroupId) throw new Error('No hay grupo de repartidores configurado. Ve a /notifi.html');
    console.log(`[WA] ► Enviando a Repartidores — ${deliveryGroupName} (${deliveryGroupId})`);
    try {
      await this.sock.sendMessage(deliveryGroupId, { text });
      console.log(`[WA] ✅ Mensaje enviado a Repartidores — ${deliveryGroupName}`);
    } catch (err) {
      console.error(`[WA] ❌ Error enviando a Repartidores (${deliveryGroupId}):`, err.message);
      throw err;
    }
  }

  // ── Enviar a un JID arbitrario (para pruebas) ──────────────────────────
  async sendRaw(jid, text) {
    if (!this.connected || !this.sock) throw new Error('WhatsApp no conectado');
    await this.sock.sendMessage(jid, { text });
  }
}

// ─── Singleton ───────────────────────────────────────────────────────────────
let _instance = null;
function getInstance() {
  if (!_instance) _instance = new WhatsAppService();
  return _instance;
}

module.exports = { getInstance };
