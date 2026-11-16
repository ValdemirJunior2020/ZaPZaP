@echo off
setlocal EnableExtensions
title ZaPZaP AI - Windows Setup
cd /d "%~dp0"
echo.
echo  ===========================================
echo         ZaPZaP AI - WINDOWS SETUP
echo  ===========================================
echo.
where node >nul 2>&1
if errorlevel 1 (
 echo [!] Node.js is not installed.
 echo     Get the Windows LTS version at https://nodejs.org/
 echo     Install it, then run this file again.
 start "" "https://nodejs.org/en/download"
 goto :end_fail
)
for /f "delims=" %%V in ('node --version') do set "NODE_VERSION=%%V"
echo [OK] Node.js %NODE_VERSION%
where ollama >nul 2>&1
if errorlevel 1 (
 echo [!] Ollama was not found in PATH.
 echo     Install it from https://ollama.com/download/windows
 echo     Then rerun this installer.
 start "" "https://ollama.com/download/windows"
 goto :end_fail
)
echo [OK] Ollama available
powershell -NoProfile -Command "try { $null=Invoke-RestMethod -Uri 'http://127.0.0.1:11434/api/tags' -TimeoutSec 2; exit 0 } catch { exit 1 }"
if errorlevel 1 (
 echo [INFO] Starting Ollama automatically...
 powershell -NoProfile -Command "Start-Process -FilePath 'ollama' -ArgumentList 'serve' -WindowStyle Minimized" 2>nul
 set "OLLAMA_READY="
 for /L %%I in (1,1,15) do (
  if not defined OLLAMA_READY (
   powershell -NoProfile -Command "try { $null=Invoke-RestMethod -Uri 'http://127.0.0.1:11434/api/tags' -TimeoutSec 2; exit 0 } catch { exit 1 }"
   if not errorlevel 1 set "OLLAMA_READY=1"
   if not defined OLLAMA_READY timeout /t 1 /nobreak >nul
  )
 )
 if not defined OLLAMA_READY (
  echo [ERROR] Could not start Ollama. Try opening it manually from the Start menu.
  echo You can also run: ollama serve
  goto :end_fail
 )
)
echo [OK] Local Ollama API responding
echo [OK] Local Ollama API responding
ollama list | findstr /I "qwen3:8b" >nul 2>&1
if errorlevel 1 (
 echo.
 echo qwen3:8b is not installed. This model requires several GB.
 choice /C YN /N /M "Download the free qwen3:8b model now? [Y/N]: "
 if errorlevel 2 goto :end_fail
 ollama pull qwen3:8b
 if errorlevel 1 (
   echo [ERROR] Model download failed. Check Internet or free disk space.
   goto :end_fail
 )
) else (
 echo [OK] qwen3:8b is installed
)
echo.
echo [SUCCESS] ZaPZaP AI is ready.
echo Double-click 02-START-ZAPZAP.bat to open the dashboard.
echo The demo runs only on this PC by default.
echo.
pause
exit /b 0
:end_fail
echo.
echo Setup not finished. Please complete the step above and retry.
pause
exit /b 1
