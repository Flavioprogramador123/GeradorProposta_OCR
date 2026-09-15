# Instala tarefa Windows: worker de captura (poll Supabase Vercel + Postgres F:)
# Rode como Administrador uma vez neste PC (CCA_TECNICA).

$ErrorActionPreference = 'Stop'
$root = 'E:\Projetos\Prompt_ORC_pieng'
$npmCmd = Get-Command npm.cmd -ErrorAction SilentlyContinue
$npm = if ($npmCmd) { $npmCmd.Source } else { 'C:\Program Files\nodejs\npm.cmd' }
if (-not (Test-Path $npm)) { throw "npm.cmd não encontrado: $npm" }
if (-not (Test-Path $root)) { throw "Repo não encontrado: $root" }

$taskName = 'PIENG-V3-JobsWorker'
$existing = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($existing) {
  Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
  Write-Host "Removida tarefa antiga $taskName"
}

$action = New-ScheduledTaskAction `
  -Execute 'cmd.exe' `
  -Argument "/c cd /d `"$root`" && `"$npm`" run v3:jobs:worker" `
  -WorkingDirectory $root

$trigger = New-ScheduledTaskTrigger -AtLogOn
$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable `
  -RestartCount 3 `
  -RestartInterval (New-TimeSpan -Minutes 1) `
  -ExecutionTimeLimit (New-TimeSpan -Days 0)

$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Highest

Register-ScheduledTask `
  -TaskName $taskName `
  -Action $action `
  -Trigger $trigger `
  -Settings $settings `
  -Principal $principal `
  -Description 'PIENG: poll fila captura (Vercel Supabase + Postgres F:) e roda v3:captura:force' | Out-Null

Start-ScheduledTask -TaskName $taskName
Write-Host "OK: $taskName iniciada (logon + agora)."
Write-Host "Teste: cd $root; npm run v3:jobs:test"
Write-Host "Dispatch UI: http://127.0.0.1:3099  /  http://100.104.172.12:3099"
