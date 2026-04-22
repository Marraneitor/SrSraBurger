@echo off
REM ═══════════════════════════════════════════════════════════════════════════
REM  SR & SRA BURGER — Abre notifi.html (WhatsApp Notifications)
REM ═══════════════════════════════════════════════════════════════════════════

setlocal enabledelayedexpansion

REM Obtener la ruta del directorio del script
cd /d "%~dp0"

REM Construir la URL
set "LOCAL_URL=http://localhost:3000/notifi.html"

echo.
echo ╔═══════════════════════════════════════════════════════════════════════════╗
echo ║  SR ^& SRA BURGER — Panel de Notificaciones WhatsApp                      ║
echo ╚═══════════════════════════════════════════════════════════════════════════╝
echo.
echo [*] Abriendo: %LOCAL_URL%
echo.

REM Verificar si el servidor está corriendo
powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://localhost:3000' -TimeoutSec 2 -ErrorAction Stop; Write-Host '[✓] Servidor conectado' } catch { Write-Host '[!] ADVERTENCIA: El servidor podría no estar inicializado'; Write-Host '[!] Asegúrate de ejecutar start-server.bat primero'; Write-Host '' }"

REM Abrir el navegador
start "" msedge "%LOCAL_URL%" 2>nul
if errorlevel 1 (
    start "" "%LOCAL_URL%"
)

timeout /t 2 /nobreak
exit /b 0
