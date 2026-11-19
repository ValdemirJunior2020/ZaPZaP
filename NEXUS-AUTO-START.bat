@echo off
setlocal EnableExtensions
title NexusSales - Instalar inicio automatico no Windows
cd /d "%~dp0"
echo.
echo ==========================================================
echo  NEXUSSALES AI - INICIAR TUDO + AUTOMATICO COM WINDOWS
echo ==========================================================
echo  Ollama 11434, gateway seguro 8789, website 8788
echo  Cloudflare: usa SOMENTE configuracao existente e segura
echo  NEXUS Agent do HotelPlanner NAO sera modificado.
echo.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-nexus-services.ps1" -Install
if errorlevel 1 (
 echo.
 echo [ERRO] Falha ao ativar inicio automatico. Verifique o log.
 pause
 exit /b 1
)
echo.
echo STATUS DOS SERVICOS:
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-nexus-services.ps1" -Status
echo.
echo Log: %LOCALAPPDATA%\NexusSales\startup.log
echo Inicia automaticamente ao entrar nesta conta do Windows.
echo Para desligar autostart: reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v NexusSalesAI /f
echo.
pause
