# PIENG Jobs — disparo local via Postgres (Tailscale)

Atualizado: **2026-09-10**

## Ideia

- **Postgres Tailscale** (`pieng_saas.pieng_jobs`) = fila de **comando**
- **PC** = executa o que já existe (`npm run v3:captura:force`)
- **Supabase** = recebe o **resultado** (publish do catálogo após scrape)

Vercel/Netlify **não** entram no disparo.

```text
INSERT pending → worker claim → v3:captura:force → push Supabase → status done
```

## 1) Criar tabela (no cluster)

```powershell
$env:PGPASSWORD = 'pieng_saas_dev_only'
& "C:\Program Files\PostgreSQL\17\bin\psql.exe" -h 100.104.172.12 -U pieng_saas -d pieng_saas `
  -f "E:\Projetos\pieng_postgres\scripts\postgres\02_pieng_jobs.sql"
```

## 2) Teste sem Playwright (dry-run)

Na pasta `Prompt_ORC_pieng`:

```powershell
cd E:\Projetos\Prompt_ORC_pieng
npm run v3:jobs:test
```

Enfileira + claim + `done` com mensagem `dry-run OK` (não abre Chromium).

## 3) Disparo real

```powershell
npm run v3:jobs:enqueue
npm run v3:jobs:worker:once
# ou loop:
npm run v3:jobs:worker
```

O worker chama `npm run v3:captura:force` (já publica no Supabase se `publicarAposOk`).

Enfileirar só pelo SQL:

```powershell
$env:PGPASSWORD = 'pieng_saas_dev_only'
& "C:\Program Files\PostgreSQL\17\bin\psql.exe" -h 100.104.172.12 -U pieng_saas -d pieng_saas `
  -f "E:\Projetos\pieng_postgres\scripts\postgres\02_pieng_jobs_enqueue.sql"
```

## 4) Agenda 07:30 (já existente)

Continua independente:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/v3-install-task-scheduler.ps1
```

O worker de jobs é **sob demanda** (fila); a agenda é o horário fixo.

## Env opcional

```text
PIENG_JOBS_DATABASE_URL=postgresql://pieng_saas:...@100.104.172.12:5432/pieng_saas
PIENG_JOBS_POLL_MS=15000
```

## DESFAZER (UNDO)

### Remover tabela

```powershell
$env:PGPASSWORD = 'pieng_saas_dev_only'
& "C:\Program Files\PostgreSQL\17\bin\psql.exe" -h 100.104.172.12 -U pieng_saas -d pieng_saas `
  -f "E:\Projetos\pieng_postgres\scripts\postgres\02_pieng_jobs_UNDO.sql"
```

### Reverter código Git

```powershell
# Prompt_ORC_pieng
cd E:\Projetos\Prompt_ORC_pieng
git log --oneline -5
git revert <commit>   # ou reset se ainda não push

# pieng_postgres
cd E:\Projetos\pieng_postgres
git log --oneline -5
git revert <commit>
```

### Remover dependência `pg` (se reverter o package.json)

```powershell
cd E:\Projetos\Prompt_ORC_pieng
npm uninstall pg @types/pg
```
