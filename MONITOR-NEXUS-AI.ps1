# Local status monitor. Start manually; stop with Ctrl+C. No tokens or conversations recorded.
$ErrorActionPreference='Continue'
$log=Join-Path $PSScriptRoot 'nexus-ai-health.log'
Write-Host 'Nexus AI local monitor. Ctrl+C to stop.'
while($true){
 try{ $x=& (Join-Path $PSScriptRoot 'CHECK-NEXUS-AI.ps1') -Quiet | Select-Object -Last 1
  $line="$($x.checkedAt) ollama=$($x.ollamaRunning) website=$($x.localWebsite) gateway=$($x.gatewayCheck)"
  Add-Content -LiteralPath $log -Value $line;Write-Host $line
 }catch{Write-Warning 'Monitor check failed'}
 Start-Sleep -Seconds 60
}