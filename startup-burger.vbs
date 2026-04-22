' ═══════════════════════════════════════════════════════════════════════════
' SR & SRA BURGER — Script de autostart para Windows
' ═══════════════════════════════════════════════════════════════════════════
' Este script inicia el servidor automáticamente al encender tu PC
' Se ejecuta minimizado en background

' Obtener rutas
Set objShell = CreateObject("WScript.Shell")
strScriptDirectory = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)

' Ruta del script start-server.bat
strBatchFile = strScriptDirectory & "\start-server.bat"

' Verificar que el archivo existe
Set objFSO = CreateObject("Scripting.FileSystemObject")
If NOT objFSO.FileExists(strBatchFile) Then
    WScript.Echo "Error: No se encontró start-server.bat en: " & strBatchFile
    WScript.Quit 1
End If

' Ejecutar el batch silenciosamente (minimizado)
' Parámetro 0 = ventana oculta, false = no esperar a que termine
objShell.Run strBatchFile, 7, false

' El script termina; el batch continúa corriendo en background
