@echo off
setlocal
cd /d "%~dp0"
title Install WA-AKG Locally for Nexus AI (No Cloud)
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\install-wa-akg-local.ps1"
if errorlevel 1 (
 echo.
 echo WA-AKG installation did not complete. Read the error above.
)
echo.
pause
