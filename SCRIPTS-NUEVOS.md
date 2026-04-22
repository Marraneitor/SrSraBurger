# 📚 GUÍA COMPLETA — Scripts Nuevos

He creado los siguientes scripts y documentos para que tu servidor se inicie automáticamente en LAN:

---

## 🆕 Archivos Nuevos Creados

### 1. **start-server.bat** ⭐ (PRINCIPAL)
Inicia el servidor Node.js en puerto 3000, accesible desde tu LAN.

**Uso:**
```bash
double-click start-server.bat
```

**Qué hace:**
- ✓ Verifica Node.js instalado
- ✓ Instala dependencias si falta `node_modules`
- ✓ Inicia `npm start`
- ✓ Muestra la IP de LAN
- ✓ Mantiene el servidor corriendo

---

### 2. **startup-burger.vbs** 📅 (AUTOSTART)
Script que se ejecuta automáticamente al encender tu PC. Se ejecuta **minimizado en background**.

**Uso automático:**
```
1. Ejecuta: setup-autostart.ps1 (ver abajo)
2. Se crea un atajo en la carpeta de Startup de Windows
3. ✓ Automático
```

---

### 3. **open-notifi.bat** 📱 (ACCESO RÁPIDO)
Abre directamente `notifi.html` en el navegador. Verifica que el servidor está corriendo.

**Uso:**
```bash
double-click open-notifi.bat
```

---

### 4. **control-center.bat** 🎮 (TODO EN UNO)
Menú interactivo con todas las opciones disponibles.

**Uso:**
```bash
double-click control-center.bat
```

**Opciones:**
- [1] Iniciar servidor
- [2] Abrir notifi.html
- [3] Abrir admin.html
- [4] Abrir menú principal
- [5] Verificar .env
- [6] npm install

---

### 5. **verify-setup.bat** ✅ (VERIFICACIÓN)
Antes de iniciar, verifica que todo esté configurado correctamente.

**Uso:**
```bash
double-click verify-setup.bat
```

**Verifica:**
- ✓ Node.js instalado
- ✓ npm disponible
- ✓ .env existe
- ✓ Archivos del proyecto
- ✓ node_modules
- ✓ Puerto 3000 disponible

---

### 6. **setup-autostart.ps1** 🔧 (CONFIGURAR AUTOSTART)
Script PowerShell que **crea automáticamente** el acceso directo en la carpeta de Startup.

**Uso (IMPORTANTE):**
```
1. Presiona Win + R
2. Escribe: powershell
3. Presiona Shift + CTRL + Enter (para ejecutar como Administrador)
4. Pega este comando:
   
   & "C:\{TU_RUTA}\setup-autostart.ps1"
   
5. Presiona Enter
6. ✓ El acceso directo se crea automáticamente
```

**O más fácil:**
```
1. Busca "PowerShell"
2. Haz clic derecho → "Ejecutar como administrador"
3. Pega:
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   & "C:\{TU_RUTA}\setup-autostart.ps1"
```

---

## 📄 Documentos de Referencia

### **INICIO-RAPIDO.md** 🚀
Guía paso a paso para empezar en 2 minutos.

### **AUTOSTART-SETUP.md** 📅
Instrucciones detalladas para configurar autostart en Windows (3 métodos).

### **Archivos Existentes que No Cambié:**
- CLAUDE.md — Arquitectura del proyecto
- SECURITY.md — Configuración de seguridad
- README.md — Documentación general

---

## 🎯 Flujo Recomendado

### Primera Vez (Setup):
```
1. Ejecuta: verify-setup.bat
   → Verifica que todo esté listo
   
2. Ejecuta: setup-autostart.ps1 (con Administrador)
   → Configura el autostart
   
3. Ejecuta: start-server.bat
   → Prueba que el servidor funciona
   
4. Ejecuta: open-notifi.bat
   → Abre notifi.html
   
5. Escanea el código QR de WhatsApp
   → ¡Listo!
```

### Después (Uso Normal):
- El servidor **inicia automáticamente** al encender tu PC ✓
- Para acceder: `http://localhost:3000/notifi.html`
- O desde otra PC: `http://{TU_IP}:3000/notifi.html`

---

## 🔥 Casos de Uso

### "Quiero el servidor SIEMPRE activo"
→ Ejecuta `setup-autostart.ps1` una sola vez

### "Quiero iniciar manualmente cuando lo necesite"
→ Usa `start-server.bat` cada vez que quieras

### "Quiero acceder desde mi celular"
→ Usa la URL de LAN: `http://{TU_IP_LOCAL}:3000/notifi.html`

### "Quiero menu fácil para todo"
→ Usa `control-center.bat`

---

## ⚙️ Configuración de Puertos

El servidor usa **puerto 3000** por defecto.

Si necesitas cambiar el puerto:
```bash
# En la terminal, en lugar de npm start:
PORT=5000 npm start
```

Luego accede a: `http://localhost:5000`

---

## 🆘 Si Algo Falla

### "El servidor se cierra al iniciar"
→ Ejecuta `verify-setup.bat` para ver qué falta

### "notifi.html no carga"
→ Verifica que `start-server.bat` sigue ejecutándose (ventana abierta)

### "No veo código QR en notifi.html"
→ Abre la consola del navegador (F12) y revisa los errores

### "Puerto 3000 ya está en uso"
→ Cierra otra aplicación que use ese puerto o usa PORT=5000

---

## 📊 Resumen de Scripts

| Script | Función | Uso |
|--------|---------|-----|
| `start-server.bat` | Inicia el servidor | Manual, diario |
| `startup-burger.vbs` | Se ejecuta al encender | Autostart (background) |
| `open-notifi.bat` | Abre notifi.html | Acceso rápido |
| `control-center.bat` | Menú con todas opciones | Uso general |
| `verify-setup.bat` | Verifica configuración | Primera vez |
| `setup-autostart.ps1` | Configura autostart | Una sola vez |

---

## ✅ Checklist Final

- [ ] Ejecuté `verify-setup.bat` y pasó las pruebas
- [ ] Ejecuté `setup-autostart.ps1` como Administrador
- [ ] Ejecuté `start-server.bat` y vi la IP de LAN
- [ ] Ejecuté `open-notifi.bat` y vi el código QR
- [ ] Escaneé el código QR con WhatsApp
- [ ] Recibí una notificación de prueba en WhatsApp
- [ ] Reinicié mi PC y el servidor inició automáticamente

---

**¿Listo?** 👉 Comienza con: **verify-setup.bat**
