@echo off
setlocal EnableExtensions EnableDelayedExpansion
title NexusSales AI - Windows Installer, Local Integration and Launcher
color 0A
set "ROOT=%~dp0"
cd /d "%ROOT%"
set "GITBRANCH=feat/exclusive-nexus-sales-expert-20261118"
set "LOG=%TEMP%\\NEXUS-LOCAL-SETUP.log"
echo [NexusSales AI] %date% %time% > "%LOG%"
echo.
echo ===============================================================
echo   NEXUSSALES AI - ALL IN ONE / INSTALAR, MERGE LOCAL E INICIAR
echo ===============================================================
echo This tool NEVER pushes to GitHub, merges remote main, or deploys.
echo.
where git >nul 2>&1
if errorlevel 1 (
 echo Git for Windows is required. Installing via winget...
 where winget >nul 2>&1 || goto :missingTools
 winget install --id Git.Git --exact --accept-package-agreements --accept-source-agreements
 set "PATH=%ProgramFiles%\Git\cmd;%PATH%"
 where git >nul 2>&1 || goto :restart
)
git rev-parse --is-inside-work-tree >nul 2>&1 || (
 echo This BAT must run inside the downloaded ZaPZaP repository.
 echo First run: git clone -b %GITBRANCH% https://github.com/ValdemirJunior2020/ZaPZaP.git
 goto :error
)
for /f "delims=" %%R in ('git config --get remote.origin.url') do set "REMOTE=%%R"
echo Repository: !REMOTE!
echo.
echo Checking your local changes first...
for /f "delims=" %%S in ('git status --porcelain') do set "DIRTY=1"
if defined DIRTY (
 echo.
 echo [STOP] Existing local changes found. Nothing was overwritten.
 echo Run: git status
 echo Commit or stash your changes, then run this BAT again.
 echo If the original calendar has changes, preserve them before merging.
 goto :error
)
echo [1/6] Fetching all remote branches...
git fetch origin --prune >> "%LOG%" 2>&1 || goto :error
git show-ref --verify --quiet "refs/remotes/origin/%GITBRANCH%"
if errorlevel 1 (
 echo Required feature branch does not exist on origin.
 goto :error
)
echo [2/6] Creating a NEW local integration branch without changing main...
for /f %%T in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMdd-HHmmss"') do set "STAMP=%%T"
set "INTEGRATION=nexus-local-integration-!STAMP!"
git switch --create "!INTEGRATION!" "origin/%GITBRANCH%" >> "%LOG%" 2>&1 || goto :error
echo Local integration branch: !INTEGRATION!
echo.
echo Would you like to attempt to merge ALL other remote branches locally?
echo This can include obsolete or experimental code. Nothing is pushed.
echo Safe mode: conflicts are automatically aborted and reported.
choice /c YN /n /m "Merge all remote branches into local integration [Y/N]? "
if errorlevel 2 goto :dependencies
echo [3/6] Merging remote branches only into !INTEGRATION!...
set /a MERGED=0
set /a SKIPPED=0
set /a PREVIOUS=0
for /f "delims=" %%B in ('git for-each-ref --format^="%%(refname:short)" refs/remotes/origin') do (
 set "NEXT=%%B"
 if /i not "!NEXT!"=="origin/HEAD" if /i not "!NEXT!"=="origin/%GITBRANCH%" (
  git merge-base --is-ancestor "!NEXT!" HEAD >nul 2>&1
  if errorlevel 1 (
   echo Attempting !NEXT!...
   git merge --no-ff --no-edit "!NEXT!" >> "%LOG%" 2>&1
   if errorlevel 1 (
    echo [CONFLICT/SKIPPED] !NEXT!
    echo SKIPPED !NEXT! >> "%LOG%"
    git merge --abort >> "%LOG%" 2>&1
    set /a SKIPPED+=1
   ) else (
    echo [MERGED] !NEXT!
    set /a MERGED+=1
   )
  ) else set /a PREVIOUS+=1
 )
)
echo Results: merged !MERGED!, skipped conflicts !SKIPPED!, already present !PREVIOUS!.
if not "!SKIPPED!"=="0" (
 echo Some branches could NOT be integrated safely. See %LOG%.
 echo You can continue testing the integration, but do NOT publish it.
)
:dependencies
echo.
echo [4/6] Checking local software...
where node >nul 2>&1
if errorlevel 1 (
 echo Installing Node.js LTS...
 where winget >nul 2>&1 || goto :missingTools
 winget install --id OpenJS.NodeJS.LTS --exact --accept-package-agreements --accept-source-agreements
 set "PATH=%ProgramFiles%\nodejs;%PATH%"
 where node >nul 2>&1 || goto :restart
)
node --version
where ollama >nul 2>&1
if errorlevel 1 (
 echo Installing Ollama...
 where winget >nul 2>&1 || goto :missingTools
 winget install --id Ollama.Ollama --exact --accept-package-agreements --accept-source-agreements
 set "PATH=%LOCALAPPDATA%\Programs\Ollama;%PATH%"
 where ollama >nul 2>&1 || goto :restart
)
echo.
echo [5/6] Ensuring local AI is available...
powershell -NoProfile -Command "try { (Invoke-WebRequest 'http://127.0.0.1:11434/api/tags' -TimeoutSec 3 -UseBasicParsing).StatusCode -eq 200 } catch { exit 1 }" >nul 2>&1
if errorlevel 1 (
 start "Nexus Ollama Local" /min cmd /c "ollama serve"
 timeout /t 6 /nobreak >nul
)
ollama list | findstr /i /c:"qwen3:8b" >nul
if errorlevel 1 (
 echo qwen3:8b not installed. Download may take several GB.
 choice /c YN /n /m "Download qwen3:8b [Y/N]? "
 if errorlevel 2 (echo Skipping qwen3:8b) else ollama pull qwen3:8b
)
ollama list | findstr /i /c:"qwen3:4b" >nul
if errorlevel 1 (
 echo qwen3:4b is the FREE local backup model.
 choice /c YN /n /m "Download qwen3:4b [Y/N]? "
 if errorlevel 2 (echo Skipping qwen3:4b) else ollama pull qwen3:4b
)
echo.
echo [6/6] Testing and launching NexusSales...
if not exist ".env.local" (
 echo [IMPORTANT] .env.local does not exist.
 echo Configure your existing private Supabase and gateway secrets locally.
 echo Never paste your API secrets into GitHub.
)
call npm run test:ci >> "%LOG%" 2>&1
if errorlevel 1 (
 echo [STOP] Tests FAILED. View "%LOG%"
 echo No server was started. Your original main and feature branches are intact.
 goto :error
)
echo All local tests passed.
echo Launching http://127.0.0.1:8788/business.html
start "NexusSales AI Server" cmd /k "cd /d ""%ROOT%"" && npm start"
timeout /t 4 /nobreak >nul
start "" "http://127.0.0.1:8788/business.html"
echo.
echo DONE. Active LOCAL branch: !INTEGRATION!
echo Setup log: "%LOG%"
echo OpenAI remains OFF until you explicitly enable its private env flag.
echo.
pause
exit /b 0
:missingTools
echo winget is missing. Install Git, Node.js LTS and Ollama manually.
goto :error
:restart
echo A tool was installed. Close and reopen this BAT so Windows updates PATH.
goto :error
:error
echo.
echo Setup stopped safely. Check "%LOG%" and the console above.
pause
exit /b 1
