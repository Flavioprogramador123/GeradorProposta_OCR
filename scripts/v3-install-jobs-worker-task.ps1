# Instala worker de fila pieng_jobs (poll a cada 2 min via Task Scheduler).
# Não substitui PIENG-V3-CapturaSoolar (agenda 07:30) — só sob demanda.
#
#   powershell -ExecutionPolicy Bypass -File scripts/v3-install-jobs-worker-task.ps1
# UNDO: Unregister-ScheduledTask -TaskName 'PIENG-V3-JobsWorker' -Confirm:$false
#
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
if (-not (Test-Path (Join-Path $root 'package.json'))) { $root = Get-Location }

$taskName = 'PIENG-V3-JobsWorker'
$npmCmd = Get-Command npm -ErrorAction SilentlyContinue
$npm = if ($npmCmd) { $npmCmd.Source } else { 'npm' }

$action = New-ScheduledTaskAction `
  -Execute 'cmd.exe' `
  -Argument "/c cd /d `"$root`" && `"$npm`" run v3:jobs:worker:once" `
  -WorkingDirectory $root

# A cada 2 minutos enquanto o usuário estiver logado
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).Date.AddMinutes(1) `
  -RepetitionInterval (New-TimeSpan -Minutes 2) `
  -RepetitionDuration (New-TimeSpan -Days 9999)

$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited

Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Force | Out-Null

Write-Host "OK: tarefa '$taskName' — a cada 2 min (npm run v3:jobs:worker:once)"
Write-Host "UNDO: Unregister-ScheduledTask -TaskName '$taskName' -Confirm:`$false"
Write-Host "Teste: npm run v3:jobs:test"
