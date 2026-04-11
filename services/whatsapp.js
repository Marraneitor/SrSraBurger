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
    this.qrRaw         = null;
    this.qrDataUrl     = null;
    this.connected     = false;
    this.phoneNumber   = '';
    this._reconnTimer  = null;
    this._initialized  = false;
    this._connecting   = false;
    this._config       = this._loadConfig();
  }

  // ── Config (grupos seleccionados) ────────────────────────────────────────
  _loadConfig() {
    try {
      if (fs.existsSync(CONFIG_FILE)) {
        const cfg = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
        if (!Array.isArray(cfg.contacts)) cfg.contacts = [];
        return cfg;
      }
    } catch (_) {}
    return { groupId: null, groupName: null, deliveryGroupId: null, deliveryGroupName: null, contacts: [] };
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
    this._saveConfigFile();
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

  // ── Destruir socket activo ──────────────────────────────────────────────
  _destroySock() {
    if (!this.sock) return;
    try { this.sock.ws?.close(); } catch (_) {}
    try { this.sock.ev?.removeAllListeners(); } catch (_) {}
    this.sock = null;
  }

  // ── Conexión / reconexión ───────────────────────────────────────────────
  async _connect() {
    // Evitar solapamiento de llamadas concurrentes
    if (this._connecting) return;
    this._connecting = true;

    if (this._reconnTimer) { clearTimeout(this._reconnTimer); this._reconnTimer = null; }
    this._destroySock();

    try {
      const {
        makeWASocket,
        useMultiFileAuthState,
        fetchLatestBaileysVersion,
        DisconnectReason,
        Browsers,
      } = await import('@whiskeysockets/baileys');

      fs.mkdirSync(AUTH_DIR, { recursive: true });

      const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
      const { version }          = await fetchLatestBaileysVersion();

      this.sock = makeWASocket({
        version,
        auth                     : state,
        browser                  : Browsers.ubuntu('Desktop'),
        logger                   : baileysLogger,
        syncFullHistory          : false,
        connectTimeoutMs         : 60_000,
        keepAliveIntervalMs      : 30_000,
        retryRequestDelayMs      : 500,
        defaultQueryTimeoutMs    : 60_000,
        generateHighQualityLinkPreview: false,
        getMessage               : async () => undefined,
      });

      this._connecting = false;

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
          const replaced  = code === DisconnectReason.connectionReplaced;

          this.connected   = false;
          this.phoneNumber = '';
          console.log(`🔌 [WhatsApp] Desconectado. código=${code} loggedOut=${loggedOut} replaced=${replaced}`);

          this._destroySock();

          if (loggedOut) {
            this._clearAuth();
            this.emit('disconnected', { loggedOut: true });
            this._scheduleReconnect(2000);
          } else if (replaced) {
            // Sesión reemplazada por otra instancia — esperar más antes de reconectar
            console.log('⚠️  [WhatsApp] Sesión reemplazada por otro cliente. Reintentando en 15s…');
            this.emit('reconnecting', {});
            this._scheduleReconnect(15_000);
          } else {
            this.emit('reconnecting', {});
            this._scheduleReconnect(5000);
          }
        }
      });

    } catch (err) {
      this._connecting = false;
      console.error('❌ [WhatsApp] Error iniciando servicio:', err.message);
      this._initialized = false;
      this._scheduleReconnect(8000);
    }
  }

  _scheduleReconnect(delay) {
    if (this._reconnTimer) clearTimeout(this._reconnTimer);
    this._reconnTimer = setTimeout(() => {
      this._initialized = true;
      this._connecting  = false;
      this._connect();
    }, delay);
  }

  // ── Cerrar sesión manualmente ───────────────────────────────────────────
  async logout() {
    if (this._reconnTimer) { clearTimeout(this._reconnTimer); this._reconnTimer = null; }
    try { await this.sock?.logout(); } catch (_) {}
    this._destroySock();
    this._clearAuth();
    this.connected    = false;
    this.phoneNumber  = '';
    this.qrRaw        = null;
    this.qrDataUrl    = null;
    this._initialized = false;
    this._connecting  = false;
    this.emit('disconnected', { loggedOut: true });
    console.log('🚪 [WhatsApp] Sesión cerrada. Generando nuevo QR...');
    this._scheduleReconnect(1500);
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

  // ── Gestión de contactos individuales ─────────────────────────────────
  /**
   * Agrega o actualiza un contacto en la config.
   * @param {{ phone: string, name: string, role: 'kitchen'|'delivery' }} contact
   */
  addContact(contact) {
    const phone = String(contact.phone).replace(/\D/g, '');
    const name  = String(contact.name || phone).slice(0, 100);
    const role  = contact.role === 'delivery' ? 'delivery' : 'kitchen';
    if (!phone) throw new Error('Teléfono requerido');

    const contacts = Array.isArray(this._config.contacts) ? [...this._config.contacts] : [];
    // Evitar duplicados por phone+role
    const idx = contacts.findIndex(c => c.phone === phone && c.role === role);
    if (idx >= 0) {
      contacts[idx] = { phone, name, role };
    } else {
      contacts.push({ phone, name, role });
    }
    this._config = { ...this._config, contacts };
    this._saveConfigFile();
  }

  /**
   * Elimina un contacto de la config.
   * @param {string} phone
   * @param {'kitchen'|'delivery'} role
   */
  removeContact(phone, role) {
    const cleanPhone = String(phone).replace(/\D/g, '');
    const contacts = Array.isArray(this._config.contacts) ? this._config.contacts : [];
    this._config = {
      ...this._config,
      contacts: contacts.filter(c => !(c.phone === cleanPhone && c.role === role)),
    };
    this._saveConfigFile();
  }

  /** Devuelve los contactos configurados, opcionalmente filtrados por role */
  getContacts(role) {
    const contacts = Array.isArray(this._config.contacts) ? this._config.contacts : [];
    return role ? contacts.filter(c => c.role === role) : contacts;
  }

  /** Enviar mensaje a todos los contactos con un rol dado */
  async sendToContacts(text, role) {
    if (!this.connected || !this.sock) throw new Error('WhatsApp no está conectado');
    const contacts = this.getContacts(role);
    if (!contacts.length) return [];

    const results = [];
    for (const c of contacts) {
      const jid = `${c.phone}@s.whatsapp.net`;
      try {
        await this.sock.sendMessage(jid, { text });
        console.log(`[WA] ✅ Mensaje enviado a contacto ${c.name} (${c.phone})`);
        results.push({ phone: c.phone, name: c.name, ok: true });
      } catch (err) {
        console.error(`[WA] ❌ Error enviando a contacto ${c.name} (${c.phone}):`, err.message);
        results.push({ phone: c.phone, name: c.name, ok: false, error: err.message });
      }
    }
    return results;
  }

  /** Enviar mensaje directo a un teléfono */
  async sendToPhone(phone, text) {
    if (!this.connected || !this.sock) throw new Error('WhatsApp no conectado');
    const jid = `${String(phone).replace(/\D/g, '')}@s.whatsapp.net`;
    await this.sock.sendMessage(jid, { text });
  }

  _saveConfigFile() {
    try {
      fs.mkdirSync(path.dirname(CONFIG_FILE), { recursive: true });
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(this._config, null, 2));
    } catch (e) { console.error('Error guardando config WA:', e.message); }
  }
}

// ─── Singleton ───────────────────────────────────────────────────────────────
let _instance = null;
function getInstance() {
  if (!_instance) _instance = new WhatsAppService();
  return _instance;
}

module.exports = { getInstance };
