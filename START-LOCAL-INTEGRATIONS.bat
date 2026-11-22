@echo off
setlocal
cd /d "%~dp0"
title Nexus AI - Start Everything Locally (NO NETLIFY)
echo.
echo ===================================================
echo  NEXUS AI - START ALL LOCAL SERVICES
echo  Nexus 8788 ^| WhatsApp 8791 ^| WA-AKG 3790 ^| Ollama 11434
echo ===================================================
echo.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0START-LOCAL-INTEGRATIONS.ps1"
if errorlevel 1 (
 echo.
 echo Local startup stopped. Read the first error above.
 pause
)
