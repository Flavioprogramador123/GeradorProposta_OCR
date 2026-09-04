# Instala tarefa no Agendador do Windows para captura V3 (seg–sex).
# Lê horário de data/v3/captura-agenda.json (padrão 07:30).
#
#   powershell -ExecutionPolicy Bypass -File scripts/v3-install-task-scheduler.ps1
#
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
if (-not (Test-Path (Join-Path $root 'package.json'))) {
  $root = Get-Location
}

$agendaPath = Join-Path $root 'data\v3\captura-agenda.json'
$hora = '07:30'
if (Test-Path $agendaPath) {
  try {
    $j = Get-Content $agendaPath -Raw | ConvertFrom-Json
    if ($j.hora) { $hora = [string]$j.hora }
  } catch { }
}

$taskName = 'PIENG-V3-CapturaSoolar'
$npm = (Get-Command npm -ErrorAction SilentlyContinue)?.Source
if (-not $npm) { $npm = 'npm' }

# Dispara todo dia; o script Node valida seg–sex + janela de horário
$action = New-ScheduledTaskAction `
  -Execute 'cmd.exe' `
  -Argument "/c cd /d `"$root`" && $npm run v3:captura" `
  -WorkingDirectory $root

$trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Monday,Tuesday,Wednesday,Thursday,Friday -At $hora
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited

Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Force | Out-Null

Write-Host "OK: tarefa '$taskName' criada — seg a sex às $hora"
Write-Host "Pasta: $root"
Write-Host "Ative a agenda em http://localhost:3001/admin/v3/precos (checkbox Ativo)"
Write-Host "Teste agora: npm run v3:captura -- --force"
