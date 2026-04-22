# 🔧 CONFIGURACIÓN AUTOSTART — SR & SRA BURGER

Este documento explica cómo hacer que el servidor se inicie automáticamente al encender tu PC.

---

## 📋 Requisitos Previos

✅ **Node.js instalado** (v18+)  
✅ **npm install** ejecutado al menos una vez  
✅ **Archivo `.env` configurado** con:
   - `FIREBASE_SERVICE_ACCOUNT_JSON` (credenciales Firebase)
   - `MERCADOPAGO_ACCESS_TOKEN` (opcional, si usas pagos)
   - `GOOGLE_MAPS_API_KEY` (opcional, si usas geolocalización)

---

## 🚀 Opción 1: Autostart Manual (Recomendado)

### Paso 1: Copiar el atajo a la carpeta de Startup

Presiona **Win + R** y pega esto:
```
shell:startup
```

Se abrirá la carpeta `C:\Users\{TuUsuario}\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup`

### Paso 2: Crear el atajo

**Método A: Desde el Explorador (más fácil)**

1. Haz **clic derecho** en `startup-burger.vbs` (en la carpeta del proyecto)
2. Selecciona **Enviar a** → **Escritorio (crear acceso directo)**
3. **Corta** el atajo creado en el escritorio
4. **Pega** el atajo en la carpeta de Startup (abierta en el Paso 1)
5. ✨ Reinicia tu PC y verifica que el servidor inicia

**Método B: Con PowerShell (avanzado)**

Abre PowerShell como **Administrador** y ejecuta:

```powershell
# Ajusta las rutas según tu instalación
$projectPath = "C:\Users\{TuUsuario}\OneDrive\Escritorio\RESPALDO - copia"
$startupFolder = "$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Startup"
$vbsScript = "$projectPath\startup-burger.vbs"

# Crear acceso directo
$WshShell = new-object -com "WScript.Shell"
$link = $WshShell.CreateShortcut("$startupFolder\Burger-Server.lnk")
$link.TargetPath = "wscript.exe"
$link.Arguments = "`"$vbsScript`""
$link.WorkingDirectory = $projectPath
$link.WindowStyle = 7  # Minimized
$link.Save()

Write-Host "✓ Acceso directo creado en Startup"
```

---

## 🎯 Opción 2: Autostart Avanzado (Tarea Programada)

Para más control, crea una **Tarea Programada de Windows**:

1. Presiona **Win + R** y escribe: `taskschd.msc`
2. Haz clic en **Crear tarea básica...**
3. Rellena:
   - **Nombre:** `SR Burger Server`
   - **Descripción:** `Inicia el servidor de SR & SRA BURGER automáticamente`
4. En **Desencadenadores**, selecciona **Al iniciar la sesión**
5. En **Acciones**, selecciona **Iniciar un programa**:
   - **Programa:** `wscript.exe`
   - **Argumentos:** `"C:\{TU_RUTA}\startup-burger.vbs"`
   - **Iniciar en:** `C:\{TU_RUTA}`
6. Marca **Ejecutar con los permisos más altos** (si es necesario)
7. **Guardar**

---

## 📱 Acceso al Panel de Notificaciones

Una vez que el servidor esté corriendo:

### Desde tu PC local:
```
http://localhost:3000/notifi.html
```

**O usa este batch:**
```bash
double-click open-notifi.bat
```

### Desde otra PC en la LAN:
```
http://{TU_IP_LOCAL}:3000/notifi.html
```

**Para encontrar tu IP:**
1. Ejecuta `start-server.bat`
2. Verás algo como:
   ```
   Servidor corriendo en: http://localhost:3000
   Tu LAN: http://192.168.1.XX:3000
   ```
3. Usa esa dirección desde otras máquinas

---

## ⚙️ Scripts Incluidos

| Archivo | Función |
|---------|---------|
| `start-server.bat` | Inicia el servidor manualmente |
| `startup-burger.vbs` | Script de autostart (minimizado) |
| `open-notifi.bat` | Abre notifi.html en el navegador local |

---

## ✅ Verificar que funciona

### Paso 1: Ejecutar manualmente
```bash
double-click start-server.bat
```

Deberías ver algo como:
```
╔═══════════════════════════════════════════════════════════════════════════╗
║  SR & SRA BURGER — Servidor en LAN                                        ║
╚═══════════════════════════════════════════════════════════════════════════╝

Servidor corriendo en: http://localhost:3000
Tu LAN: http://192.168.1.100:3000
```

### Paso 2: Abrir notifi.html
```bash
double-click open-notifi.bat
```

Debería abrirse el navegador mostrando el panel de notificaciones de WhatsApp.

### Paso 3: Escanear QR de WhatsApp
1. En el panel, verás un código QR
2. Abre WhatsApp en tu celular
3. Ve a **Configuración** → **Dispositivos vinculados** → **Vincular dispositivo**
4. Escanea el código QR que aparece en `notifi.html`
5. ✨ Listo, ahora recibirás notificaciones de pedidos en WhatsApp

---

## 🐛 Solución de Problemas

### ❌ "El servidor se cierra inmediatamente"

**Causas comunes:**
- `.env` no está configurado
- Faltan dependencias (`npm install`)
- Puerto 3000 está en uso

**Solución:**
```bash
# Verifica .env
type .env

# Reinstala dependencias
npm install

# Libera el puerto 3000 si está en uso
netstat -ano | find ":3000"
taskkill /PID {PID} /F
```

---

### ❌ "notifi.html no carga"

1. Verifica que `start-server.bat` está corriendo
2. Intenta `http://localhost:3000` (sin notifi.html)
3. Si ves "Cannot GET /", el archivo HTML podría estar movido

---

### ❌ "No se vincula el autostart"

1. Abre **Configuración** → **Aplicaciones** → **Aplicaciones y características**
2. Busca si hay conflictos de escritura en la carpeta Startup
3. Intenta ejecutar PowerShell **como Administrador**

---

## 💡 Tips Finales

- **Minimalista:** El batch se ejecuta en segundo plano sin ventanas invasivas
- **Debugging:** Si algo falla, busca logs en el servidor (output de `start-server.bat`)
- **Seguridad:** El servidor solo escucha en tu LAN local (0.0.0.0:3000). Para acceso remoto, configura SSH o acceso VPN

---

**¿Preguntas?** Revisa `CLAUDE.md` y `SECURITY.md`
