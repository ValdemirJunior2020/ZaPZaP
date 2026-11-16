@echo off
setlocal EnableExtensions
title ZaPZaP AI - Local Ollama
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
 echo Node.js was not found. Run 01-INSTALL-ZAPZAP.bat first.
 pause
 exit /b 1
)
powershell -NoProfile -Command "try { $null=Invoke-RestMethod -Uri 'http://127.0.0.1:11434/api/tags' -TimeoutSec 3; exit 0 } catch { exit 1 }"
if errorlevel 1 (
 echo Ollama is not running. Open Ollama, then retry.
 pause
 exit /b 1
)
set "PORT=8788"
set "HOST=127.0.0.1"
set "AI_PROVIDER=ollama"
set "OLLAMA_BASE_URL=http://127.0.0.1:11434"
set "OLLAMA_MODEL=qwen3:8b"
set "ENABLE_LOCAL_AI=true"
set "ENABLE_PUBLIC_AI_DEMO=false"
set "MAX_AI_CONCURRENCY=2"
echo.
echo ============================================
echo  ZaPZaP AI local demo: http://localhost:8788
echo  AI model: qwen3:8b
echo  Press Ctrl+C in this window to stop.
echo ============================================
echo.
start "" "http://localhost:8788"
node server.mjs
if errorlevel 1 (
 echo.
 echo ZaPZaP did not start. Port 8788 may already be in use.
 pause
 exit /b 1
)
