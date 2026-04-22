# 🍔 INICIO RÁPIDO — Servidor SR & SRA BURGER

**Tu programa está 99% listo para correr en LAN.** Sigue estos pasos simples:

---

## ⚡ PASO 1: Instalar dependencias (una sola vez)

```bash
npm install
```

---

## 🚀 PASO 2: Iniciar el servidor

**Opción A: Haz doble clic en:**
```
start-server.bat
```

**Opción A salida esperada:**
```
╔═══════════════════════════════════════════════════════════════════════════╗
║  SR & SRA BURGER — Servidor en LAN                                        ║
╚═══════════════════════════════════════════════════════════════════════════╝

Servidor corriendo en: http://localhost:3000
Tu LAN: http://192.168.1.100:3000
```

---

## 📱 PASO 3: Abre el Panel de Notificaciones WhatsApp

**Opción A: Haz doble clic en:**
```
open-notifi.bat
```

O abre en el navegador:
```
http://localhost:3000/notifi.html
```

---

## 🔧 PASO 4: Conecta tu WhatsApp

1. **En notifi.html**, verás un código QR
2. Abre **WhatsApp** en tu celular  
3. Ve a: **Configuración** → **Dispositivos vinculados** → **Vincular dispositivo**
4. **Escanea el código QR**
5. ✅ ¡Listo! Ahora recibirás notificaciones de pedidos en WhatsApp

---

## 🔄 AUTOSTART (Inicia automáticamente al encender tu PC)

Ver: **AUTOSTART-SETUP.md**

**Versión rápida:**
1. Presiona **Win + R** y escribe: `shell:startup`
2. Crea un **acceso directo** a `startup-burger.vbs` en esa carpeta
3. ✅ Listo, iniciará automáticamente

---

## 📊 Acceso desde otra PC en la LAN

Si alguien en tu red quiere acceder:

```
http://192.168.1.100:3000/notifi.html
```

(Reemplaza `192.168.1.100` con tu IP local que aparece al iniciar el servidor)

---

## 🎮 Centro de Control (Todo en uno)

Ejecuta:
```
control-center.bat
```

Menú interactivo para:
- ✓ Iniciar servidor
- ✓ Abrir notifi.html
- ✓ Abrir admin panel
- ✓ Verificar configuración
- ✓ Instalar dependencias

---

## ✅ Verificación Rápida

El servidor está **corriendo correctamente** si:
- [ ] Ves `Servidor corriendo en: http://localhost:3000`
- [ ] Ves `Tu LAN: http://192.168.X.X:3000`
- [ ] Puedes abrir `http://localhost:3000/notifi.html` en el navegador
- [ ] Aparece un código QR en notifi.html

---

## 🆘 Si algo no funciona

1. **Verificar que .env existe:**
   ```bash
   # Ver contenido
   type .env
   ```

2. **Reinstalar dependencias:**
   ```bash
   npm install
   ```

3. **Ver logs del servidor:**
   - Mantén `start-server.bat` abierto (no lo cierres)
   - Los errores aparecerán en esa ventana

4. **Puerto 3000 en uso:**
   ```bash
   netstat -ano | find ":3000"
   taskkill /PID {PID} /F
   ```

---

## 📚 Documentos importantes

| Archivo | Propósito |
|---------|-----------|
| `AUTOSTART-SETUP.md` | Configurar autostart de Windows |
| `CLAUDE.md` | Arquitectura y convenciones del proyecto |
| `SECURITY.md` | Configuración de seguridad |
| `README.md` | Documentación general |

---

**¿Listo?** 👉 Haz doble clic en **start-server.bat** y ¡que disfrutes!
