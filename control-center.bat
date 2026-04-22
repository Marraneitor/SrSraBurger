@echo off
REM ═══════════════════════════════════════════════════════════════════════════
REM  SR & SRA BURGER — Centro de Control
REM ═══════════════════════════════════════════════════════════════════════════
REM  Panel rápido para iniciar servidor, abrir notifi, etc.

setlocal enabledelayedexpansion

cd /d "%~dp0"

:menu
cls
echo.
echo ╔═══════════════════════════════════════════════════════════════════════════╗
echo ║                  SR ^& SRA BURGER — Centro de Control                     ║
echo ╚═══════════════════════════════════════════════════════════════════════════╝
echo.
echo  [1] Iniciar servidor (LAN)
echo  [2] Abrir Panel de Notificaciones WhatsApp
echo  [3] Abrir Panel de Admin
echo  [4] Abrir Menú (paginaburger.html)
echo  [5] Verificar que .env está configurado
echo  [6] Instalar/Actualizar dependencias (npm install)
echo  [0] Salir
echo.
set /p choice="Selecciona opción: "

if "%choice%"=="1" (
    echo.
    echo [*] Iniciando servidor...
    start cmd /k "cd /d "%cd%" && npm start"
    timeout /t 3
    goto menu
)

if "%choice%"=="2" (
    echo.
    echo [*] Abriendo notifi.html...
    start "" msedge "http://localhost:3000/notifi.html" 2>nul
    if errorlevel 1 start "" "http://localhost:3000/notifi.html"
    timeout /t 2
    goto menu
)

if "%choice%"=="3" (
    echo.
    echo [*] Abriendo admin.html...
    start "" msedge "http://localhost:3000/admin.html" 2>nul
    if errorlevel 1 start "" "http://localhost:3000/admin.html"
    timeout /t 2
    goto menu
)

if "%choice%"=="4" (
    echo.
    echo [*] Abriendo menú principal...
    start "" msedge "http://localhost:3000/paginaburger.html" 2>nul
    if errorlevel 1 start "" "http://localhost:3000/paginaburger.html"
    timeout /t 2
    goto menu
)

if "%choice%"=="5" (
    echo.
    echo [*] Verificando configuración...
    echo.
    if exist ".env" (
        echo [✓] Archivo .env encontrado
        echo.
        echo Contenido (variables configuradas):
        type .env
    ) else (
        echo [!] ERROR: .env NO encontrado
        echo [!] Debes crear .env en la raíz del proyecto
        echo.
        echo Variables requeridas:
        echo   - FIREBASE_SERVICE_ACCOUNT_JSON
        echo   - MERCADOPAGO_ACCESS_TOKEN (opcional)
        echo   - GOOGLE_MAPS_API_KEY (opcional)
    )
    echo.
    pause
    goto menu
)

if "%choice%"=="6" (
    echo.
    echo [*] Instalando/Actualizando dependencias...
    call npm install
    pause
    goto menu
)

if "%choice%"=="0" (
    echo.
    echo [✓] Saliendo...
    exit /b 0
)

echo.
echo [!] Opción no reconocida
timeout /t 2
goto menu
