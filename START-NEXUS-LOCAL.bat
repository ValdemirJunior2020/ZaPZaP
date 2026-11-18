@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>&1 || (echo Node.js not found. & pause & exit /b 1)
echo NexusSales AI - local Windows launcher. No deployment, no Git operations.
powershell -NoProfile -Command "try {Invoke-WebRequest 'http://127.0.0.1:11434/api/tags' -TimeoutSec 3 -UseBasicParsing | Out-Null; exit 0} catch {exit 1}" >nul 2>&1
if errorlevel 1 (
  where ollama >nul 2>&1 && start "Nexus Ollama" /min cmd /c "ollama serve"
)
echo Starting local web app at http://127.0.0.1:8788
start "NexusSales Local" cmd /k "npm start"
timeout /t 5 /nobreak >nul
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0CHECK-NEXUS-AI.ps1"
echo Your existing authenticated gateway/tunnel remains a separate service.
pause