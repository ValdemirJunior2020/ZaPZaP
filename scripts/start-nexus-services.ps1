# NexusSales startup at user sign-in; no admin needed. Other NEXUS projects untouched.
param([switch]$Install,[switch]$Status)
$ErrorActionPreference='Stop'
$Root=(Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$Data=Join-Path $env:LOCALAPPDATA 'NexusSales'
New-Item -ItemType Directory -Force -Path $Data | Out-Null
$Log=Join-Path $Data 'startup.log'
function Log([string]$Value) { $line="$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') $Value"; Add-Content -LiteralPath $Log -Value $line -Encoding UTF8; Write-Host $Value }
function IsUp([int]$Port,[string]$Route) {
 try {
  $c=New-Object System.Net.Sockets.TcpClient
  $p=$c.BeginConnect('127.0.0.1',$Port,$null,$null)
  if (-not $p.AsyncWaitHandle.WaitOne(1200)) { $c.Close(); return $false }
  $c.EndConnect($p);$c.Close()
  if (-not $Route) { return $true }
  return (Invoke-WebRequest -Uri "http://127.0.0.1:$Port$Route" -TimeoutSec 3 -UseBasicParsing).StatusCode -eq 200
 } catch { return $false }
}
function Cmd([string]$Name) { $x=Get-Command $Name -ErrorAction SilentlyContinue | Select-Object -First 1; if($x){return $x.Source};return $null }
function Launch([string]$Label,[string]$File,[string[]]$ProcessArgs) {
 $safe=($Label -replace '[^A-Za-z0-9]','-').ToLowerInvariant()
 Start-Process -FilePath $File -ArgumentList $ProcessArgs -WorkingDirectory $Root -WindowStyle Hidden -RedirectStandardOutput (Join-Path $Data "$safe-out.log") -RedirectStandardError (Join-Path $Data "$safe-error.log") | Out-Null
 Log "Starting $Label."
}
if($Install) {
 $key='HKCU:\Software\Microsoft\Windows\CurrentVersion\Run'
 $path=Join-Path $PSScriptRoot 'start-nexus-services.ps1'
 $value='powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -WindowStyle Hidden -File "'+$path+'"'
 New-Item -Path $key -Force | Out-Null
 New-ItemProperty -Path $key -Name 'NexusSalesAI' -PropertyType String -Value $value -Force | Out-Null
 Log 'Automatic startup registered at Windows sign-in (current user; no admin).'
}
if($Status) {
 [pscustomobject]@{Ollama11434=(IsUp 11434 '/api/tags');Gateway8789=(IsUp 8789 '/health');NexusSales8788=(IsUp 8788 '/business.html');LogFile=$Log}|Format-List
 exit 0
}
$mutex=New-Object System.Threading.Mutex($false,'Local\NexusSalesAIStartup')
$locked=$false
try {
 $locked=$mutex.WaitOne(0)
 if(-not $locked){Log 'Startup already in progress.';exit 0}
 Log "Starting NexusSales from $Root"
 $node=Cmd 'node.exe';if(-not $node){$node=Cmd 'node'}
 if(-not $node){Log 'ERROR Node.js missing.';exit 1}
 if(-not (IsUp 11434 '/api/tags')) {
  $ollama=Cmd 'ollama.exe';if(-not $ollama){$ollama=Cmd 'ollama'}
  if(-not $ollama){$candidate=Join-Path $env:LOCALAPPDATA 'Programs\Ollama\ollama.exe';if(Test-Path $candidate){$ollama=$candidate}}
  if($ollama){Launch 'Ollama' $ollama @('serve');for($i=0;$i -lt 15 -and -not (IsUp 11434 '/api/tags');$i++){Start-Sleep -Seconds 1}}
  else{Log 'ERROR Cannot find Ollama executable.'}
 }
 if(IsUp 11434 '/api/tags'){Log 'OK Ollama API 11434.'}else{Log 'ERROR Ollama API offline.'}
 $envPath=Join-Path $Root '.env.local'
 $hasToken=$false
 if(Test-Path $envPath){$hasToken=[bool](Select-String -LiteralPath $envPath -Pattern '^\s*NEXUS_OLLAMA_GATEWAY_TOKEN\s*=\s*[^#\s]{24,}' -Quiet -ErrorAction SilentlyContinue)}
 if(-not (IsUp 8789 '/health')) {
  if(-not $hasToken){Log 'ERROR Gateway token missing/too short in .env.local. No unauthenticated gateway started.'}
  elseif(-not (Test-Path (Join-Path $Root 'scripts\nexus-ollama-gateway.mjs'))){Log 'ERROR Gateway script missing.'}
  else{Launch 'Nexus gateway' $node @('scripts/nexus-ollama-gateway.mjs');for($i=0;$i -lt 10 -and -not (IsUp 8789 '/health');$i++){Start-Sleep -Seconds 1}}
 }
 if(IsUp 8789 '/health'){Log 'OK protected gateway 8789.'}else{Log 'ERROR Gateway 8789 offline; see nexus-gateway-error.log.'}
 if(-not (IsUp 8788 '/business.html')){Launch 'Nexus website' $node @('server.mjs');for($i=0;$i -lt 10 -and -not (IsUp 8788 '/business.html');$i++){Start-Sleep -Seconds 1}}
 if(IsUp 8788 '/business.html'){Log 'OK NexusSales 8788.'}else{Log 'ERROR NexusSales 8788 offline; see nexus-website-error.log.'}
 $cf=Cmd 'cloudflared.exe';if(-not $cf){$cf=Cmd 'cloudflared'}
 $cfg=Join-Path $env:USERPROFILE '.cloudflared\config.yml'
 if(-not(Test-Path $cfg)){$cfg=Join-Path $env:USERPROFILE '.cloudflared\config.yaml'}
 if(-not $cf){Log 'TUNNEL PENDING cloudflared not found.'}
 elseif(-not(Test-Path $cfg)){Log 'TUNNEL PENDING existing Cloudflare tunnel config not found.'}
 elseif(-not(IsUp 8789 '/health')){Log 'TUNNEL PENDING gateway offline.'}
 elseif(-not(Select-String -LiteralPath $cfg -Pattern '(127\.0\.0\.1|localhost):8789' -Quiet)){Log 'TUNNEL PENDING existing config does not point to 8789; not changing it.'}
 else{
  $existing=Get-CimInstance Win32_Process -Filter "name = 'cloudflared.exe'" -ErrorAction SilentlyContinue|Where-Object{$_.CommandLine -match 'tunnel' -and $_.CommandLine -match 'run' -and $_.CommandLine -match [regex]::Escape($cfg)}
  if($existing){Log 'Existing cloudflared tunnel running; not starting another.'}
  else{Launch 'Cloudflare tunnel' $cf @('tunnel','--config',('"'+$cfg+'"'),'run');Log 'Tunnel started with existing configuration (public route unverified).'}
 }
 Log "Logs stored in $Data"
}finally{
 if($locked){$mutex.ReleaseMutex()}
 $mutex.Dispose()
}
