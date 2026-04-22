@echo off
REM ═══════════════════════════════════════════════════════════════════════════
REM  SR & SRA BURGER — Verificador de Configuración
REM ═══════════════════════════════════════════════════════════════════════════
REM  Valida que todo esté listo para correr el servidor

setlocal enabledelayedexpansion

cd /d "%~dp0"

cls
echo.
echo ╔═══════════════════════════════════════════════════════════════════════════╗
echo ║              SR ^& SRA BURGER — Verificador de Configuración              ║
echo ╚═══════════════════════════════════════════════════════════════════════════╝
echo.

REM ══════════════════════════════════════════════════════════════════════════
REM 1. Verificar Node.js
REM ══════════════════════════════════════════════════════════════════════════
echo [*] Verificando Node.js...
where node >nul 2>nul
if errorlevel 1 (
    echo [✗] Node.js no está instalado
    echo [!] Descargar desde: https://nodejs.org
    goto fail
) else (
    for /f "tokens=1,2" %%a in ('node --version') do echo [✓] Node.js encontrado: %%a
)
echo.

REM ══════════════════════════════════════════════════════════════════════════
REM 2. Verificar npm
REM ══════════════════════════════════════════════════════════════════════════
echo [*] Verificando npm...
where npm >nul 2>nul
if errorlevel 1 (
    echo [✗] npm no está instalado
    goto fail
) else (
    for /f "tokens=1,2" %%a in ('npm --version') do echo [✓] npm encontrado: %%a
)
echo.

REM ══════════════════════════════════════════════════════════════════════════
REM 3. Verificar .env
REM ══════════════════════════════════════════════════════════════════════════
echo [*] Verificando .env...
if not exist ".env" (
    echo [!] ADVERTENCIA: .env no encontrado
    echo [!] Debes crear un archivo .env con tus credenciales
    echo.
    echo Variables requeridas en .env:
    echo   - FIREBASE_SERVICE_ACCOUNT_JSON
    echo   - MERCADOPAGO_ACCESS_TOKEN (opcional)
    echo   - GOOGLE_MAPS_API_KEY (opcional)
    echo.
) else (
    echo [✓] .env encontrado
    REM Verificar variables importantes
    setlocal enabledelayedexpansion
    for /f "tokens=1,2 delims==" %%a in (type .env) do set "var_%%a=%%b"
)
echo.

REM ══════════════════════════════════════════════════════════════════════════
REM 4. Verificar archivos del proyecto
REM ══════════════════════════════════════════════════════════════════════════
echo [*] Verificando archivos principales...
set "missing="
if not exist "server.js" set "missing=!missing! server.js"
if not exist "package.json" set "missing=!missing! package.json"
if not exist "notifi.html" set "missing=!missing! notifi.html"
if not exist "paginaburger.html" set "missing=!missing! paginaburger.html"
if not exist "js\firebase-config.js" set "missing=!missing! js/firebase-config.js"

if not "!missing!"=="" (
    echo [✗] Faltan archivos: !missing!
    goto fail
) else (
    echo [✓] Archivos principales presentes
)
echo.

REM ══════════════════════════════════════════════════════════════════════════
REM 5. Verificar node_modules
REM ══════════════════════════════════════════════════════════════════════════
echo [*] Verificando node_modules...
if not exist "node_modules" (
    echo [!] node_modules no encontrado
    echo [*] Ejecutando: npm install
    call npm install
    if errorlevel 1 (
        echo [✗] Error durante npm install
        goto fail
    )
    echo [✓] Dependencias instaladas
) else (
    REM Contar paquetes instalados
    dir /b node_modules | find /v /c "^" > temp.txt
    set /p count=<temp.txt
    del temp.txt
    echo [✓] node_modules encontrado (!count! paquetes)
)
echo.

REM ══════════════════════════════════════════════════════════════════════════
REM 6. Verificar puerto 3000
REM ══════════════════════════════════════════════════════════════════════════
echo [*] Verificando puerto 3000...
netstat -ano | find ":3000" >nul 2>nul
if errorlevel 1 (
    echo [✓] Puerto 3000 disponible
) else (
    echo [!] ADVERTENCIA: Puerto 3000 ya está en uso
    echo [!] Algo más podría estar corriendo en ese puerto
)
echo.

REM ══════════════════════════════════════════════════════════════════════════
REM 7. Resumen
REM ══════════════════════════════════════════════════════════════════════════
echo ╔═══════════════════════════════════════════════════════════════════════════╗
echo ║                          ✓ TODO ESTÁ LISTO                               ║
echo ╚═══════════════════════════════════════════════════════════════════════════╝
echo.
echo [✓] Puedes iniciar el servidor:
echo    - Haz doble clic en: start-server.bat
echo.
echo [✓] O ejecuta en terminal:
echo    npm start
echo.
echo [✓] Luego abre: http://localhost:3000/notifi.html
echo.
pause
exit /b 0

:fail
echo.
echo ╔═══════════════════════════════════════════════════════════════════════════╗
echo ║                    ✗ ERROR: Faltan configuraciones                       ║
echo ╚═══════════════════════════════════════════════════════════════════════════╝
echo.
echo Lee AUTOSTART-SETUP.md o INICIO-RAPIDO.md para más información
echo.
pause
exit /b 1
