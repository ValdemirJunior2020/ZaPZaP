@echo off
setlocal
cd /d "%~dp0"
title Nexus AI WhatsApp Local Test (NO NETLIFY)
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 22+ is required. Install Node.js first.
  pause
  exit /b 1
)
if not exist ".env.wa-local" (
  copy /y ".env.wa-local.example" ".env.wa-local" >nul
  echo.
  echo CREATED .env.wa-local
  echo Edit it with your WA-AKG API key and your own spare test number.
  echo Do NOT paste the key into chat or GitHub.
  notepad ".env.wa-local"
  echo.
)
echo Starting Nexus WhatsApp Local Bridge. WA-AKG must also be running at 127.0.0.1:3790.
start "" "http://127.0.0.1:8791"
node scripts\wa-akg-local-bridge.mjs
echo.
pause
