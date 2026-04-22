
@echo off
REM ═══════════════════════════════════════════════════════════════════════════
REM  SR & SRA BURGER — Inicia servidor en LAN
REM ═══════════════════════════════════════════════════════════════════════════
REM  Este script inicia el servidor Node.js en el puerto 3000
REM  Accesible desde tu PC: http://localhost:3000
REM  Accesible desde la LAN: http://<TU_IP>:3000

setlocal enabledelayedexpansion

REM Obtener la ruta del directorio del script
cd /d "%~dp0"

title SR & SRA BURGER — Servidor Local

echo.
echo ╔═══════════════════════════════════════════════════════════════════════════╗
echo ║  SR ^& SRA BURGER — Servidor en LAN                                        ║
echo ╚═══════════════════════════════════════════════════════════════════════════╝
echo.
echo [*] Iniciando servidor...
echo [*] Puerto: 3000
echo.

REM Verificar que Node.js está instalado
where node >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Node.js no está instalado o no está en PATH
    echo [INFO] Descargue Node.js desde: https://nodejs.org
    pause
    exit /b 1
)

REM Verificar que las dependencias están instaladas
if not exist "node_modules" (
    echo [*] Instalando dependencias...
    call npm install
    if errorlevel 1 (
        echo [ERROR] Error instalando dependencias
        pause
        exit /b 1
    )
)

REM Iniciar servidor
echo [✓] Servidor iniciando...
echo.
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo   Servidor corriendo en: http://localhost:3000
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.
echo  Para acceder desde otra computadora en la LAN:
echo    - Abre tu navegador
echo    - Ingresa: http://<TU_IP>:3000
echo    - Tu IP será mostrada aquí abajo ↓
echo.
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.

REM Ejecutar el servidor
npm start

REM Si llega aquí, el servidor se cerró o hubo error
echo.
echo [!] El servidor se ha detenido
echo [!] Cierre esta ventana para salir
pause
