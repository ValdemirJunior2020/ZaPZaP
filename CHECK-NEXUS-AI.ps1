# Private Windows health checks; no tokens or customer data are logged.
param([switch]$Quiet)
$ErrorActionPreference='SilentlyContinue'
$ollama=$false; $app=$false; $gateway='not-configured'
try { $r=Invoke-WebRequest 'http://127.0.0.1:11434/api/tags' -TimeoutSec 3 -UseBasicParsing; $ollama=($r.StatusCode -eq 200) } catch {}
try { $r=Invoke-WebRequest 'http://127.0.0.1:8788/business.html' -TimeoutSec 3 -UseBasicParsing; $app=($r.StatusCode -eq 200) } catch {}
# Optional locally configured gateway health URL. Never send a token to the health check.
if ($env:NEXUS_LOCAL_GATEWAY_HEALTH_URL -match '^http://127\.0\.0\.1:[0-9]{2,5}/health$') {
 try { $r=Invoke-WebRequest $env:NEXUS_LOCAL_GATEWAY_HEALTH_URL -TimeoutSec 3 -UseBasicParsing; $gateway=($r.StatusCode -eq 200) } catch { $gateway=$false }
}
$result=[pscustomobject]@{ checkedAt=(Get-Date -Format 'yyyy-MM-dd HH:mm:ss'); ollamaRunning=$ollama; localWebsite=$app; gatewayCheck=$gateway }
if (-not $Quiet) { $result | Format-List }
$result