# Instala tarefa no Agendador do Windows para captura V3.
# Le horario e dias de data/v3/captura-agenda.json.
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
$diasJs = @(1, 2, 3, 4, 5)
if (Test-Path $agendaPath) {
  try {
    $j = Get-Content $agendaPath -Raw -Encoding UTF8 | ConvertFrom-Json
    if ($j.hora) { $hora = [string]$j.hora }
    if ($j.dias) { $diasJs = @($j.dias | ForEach-Object { [int]$_ }) }
  } catch { }
}

$map = @{
  0 = 'Sunday'
  1 = 'Monday'
  2 = 'Tuesday'
  3 = 'Wednesday'
  4 = 'Thursday'
  5 = 'Friday'
  6 = 'Saturday'
}
$daysOfWeek = @()
foreach ($d in $diasJs) {
  $name = $map[[int]$d]
  if ($name -and ($daysOfWeek -notcontains $name)) {
    $daysOfWeek += $name
  }
}
if ($daysOfWeek.Count -eq 0) {
  $daysOfWeek = @('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday')
}

$taskName = 'PIENG-V3-CapturaSoolar'
$npmCmd = Get-Command npm -ErrorAction SilentlyContinue
if ($npmCmd) { $npm = $npmCmd.Source } else { $npm = 'npm' }

$action = New-ScheduledTaskAction `
  -Execute 'cmd.exe' `
  -Argument "/c cd /d `"$root`" && `"$npm`" run v3:captura" `
  -WorkingDirectory $root

$trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek $daysOfWeek -At $hora
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited

Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Force | Out-Null

$diasTxt = [string]::Join(', ', $daysOfWeek)
Write-Host "OK: tarefa '$taskName' criada - $diasTxt as $hora"
Write-Host "Pasta: $root"
Write-Host "Agenda: $agendaPath"
Write-Host "Teste agora: npm run v3:captura:force"
