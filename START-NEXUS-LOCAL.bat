@echo off
setlocal EnableExtensions
title NexusSales - Iniciar todos os servicos localmente
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-nexus-services.ps1"
if errorlevel 1 (
 echo O inicio falhou. Veja: %LOCALAPPDATA%\NexusSales\startup.log
 pause
 exit /b 1
)
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-nexus-services.ps1" -Status
echo Para iniciar automaticamente com o Windows, execute NEXUS-AUTO-START.bat uma vez.
pause
