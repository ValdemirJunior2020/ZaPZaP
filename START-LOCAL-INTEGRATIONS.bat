@echo off
setlocal
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0START-LOCAL-INTEGRATIONS.ps1"
if errorlevel 1 pause
