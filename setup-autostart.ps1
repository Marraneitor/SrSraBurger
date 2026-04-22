# ═══════════════════════════════════════════════════════════════════════════
# SR & SRA BURGER — Configurar Autostart automáticamente
# ═══════════════════════════════════════════════════════════════════════════
# Este script crea automáticamente el acceso directo para autostart

# Requiere: Ejecutar como Administrador

Write-Host ""
Write-Host "╔═══════════════════════════════════════════════════════════════════════════╗"
Write-Host "║           SR & SRA BURGER — Configurar Autostart en Windows              ║"
Write-Host "╚═══════════════════════════════════════════════════════════════════════════╝"
Write-Host ""

# Verificar que se ejecuta como admin
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")
if (-not $isAdmin) {
    Write-Host "[!] ERROR: Este script debe ejecutarse como Administrador"
    Write-Host "[*] Haz clic derecho en: setup-autostart.ps1 → Ejecutar con PowerShell (como administrador)"
    Read-Host "Presiona Enter para salir"
    exit 1
}

Write-Host "[*] Verificando permisos de administrador..."
Write-Host "[✓] Permisos correctos"
Write-Host ""

# Obtener la ruta del proyecto
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$vbsFile = Join-Path -Path $scriptPath -ChildPath "startup-burger.vbs"

# Verificar que el archivo VBS existe
if (-not (Test-Path $vbsFile)) {
    Write-Host "[!] ERROR: No se encontró startup-burger.vbs"
    Write-Host "[!] Esperado en: $vbsFile"
    Read-Host "Presiona Enter para salir"
    exit 1
}

Write-Host "[✓] startup-burger.vbs encontrado"
Write-Host ""

# Obtener la carpeta de Startup
$startupFolder = "$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Startup"
$shortcutPath = Join-Path -Path $startupFolder -ChildPath "SR-Burger-Server.lnk"

Write-Host "[*] Creando acceso directo..."
Write-Host "    Origen: $vbsFile"
Write-Host "    Destino: $shortcutPath"
Write-Host ""

# Crear el acceso directo
try {
    $WshShell = New-Object -ComObject WScript.Shell
    $link = $WshShell.CreateShortcut($shortcutPath)
    
    # Configurar propiedades del acceso directo
    $link.TargetPath = "wscript.exe"
    $link.Arguments = "`"$vbsFile`""
    $link.WorkingDirectory = $scriptPath
    $link.WindowStyle = 7  # Minimized (7 = minimizado)
    $link.Description = "Inicia automáticamente el servidor de SR & SRA BURGER"
    $link.IconLocation = "wscript.exe, 0"
    
    # Guardar el acceso directo
    $link.Save()
    
    Write-Host "[✓] Acceso directo creado exitosamente"
    Write-Host "[✓] Ubicación: $shortcutPath"
    Write-Host ""
    
} catch {
    Write-Host "[✗] Error al crear el acceso directo:"
    Write-Host "[✗] $_"
    Read-Host "Presiona Enter para salir"
    exit 1
}

# Verificar que se creó correctamente
if (Test-Path $shortcutPath) {
    Write-Host "╔═══════════════════════════════════════════════════════════════════════════╗"
    Write-Host "║                  ✓ AUTOSTART CONFIGURADO CORRECTAMENTE                   ║"
    Write-Host "╚═══════════════════════════════════════════════════════════════════════════╝"
    Write-Host ""
    Write-Host "[✓] El servidor se iniciará automáticamente al encender tu PC"
    Write-Host ""
    Write-Host "🔄 Cambios aplicados:"
    Write-Host "   • Se creó: SR-Burger-Server.lnk"
    Write-Host "   • Ubicación: $startupFolder"
    Write-Host "   • Se ejecutará minimizado en background"
    Write-Host ""
    Write-Host "✅ Puedes reiniciar tu PC para probar"
    Write-Host ""
} else {
    Write-Host "[✗] ERROR: No se pudo crear el acceso directo"
    exit 1
}

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
Write-Host ""
Write-Host "🎯 Próximos pasos opcionales:"
Write-Host ""
Write-Host "   1. Para DESACTIVAR autostart más adelante:"
Write-Host "      • Presiona Win + R"
Write-Host "      • Escribe: shell:startup"
Write-Host "      • Elimina: SR-Burger-Server.lnk"
Write-Host ""
Write-Host "   2. Para probar ANTES de reiniciar:"
Write-Host "      • Haz doble clic en: start-server.bat"
Write-Host ""
Write-Host "   3. Para acceder desde otra PC en la LAN:"
Write-Host "      • Observa la IP al iniciar el servidor"
Write-Host "      • Abre: http://<TU_IP>:3000/notifi.html"
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

Read-Host "`nPresiona Enter para cerrar"
