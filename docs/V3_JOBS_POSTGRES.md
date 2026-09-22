# PIENG Jobs — disparo local via Postgres (Tailscale) + Vercel via Supabase

Atualizado: **2026-09-22**

## Ideia

- **Vercel** (botões Scraping live / Probe) → INSERT em `pieng_captura_jobs` (Supabase)
- **Postgres Tailscale em F:** (`pieng_saas.pieng_jobs`) = fila da UI `:3099`
- **PC (CCA_TECNICA)** = worker Playwright (`npm run v3:captura:force`)
- **Supabase** = recebe o **resultado** (publish do catálogo)

```text
Vercel botão → pieng_captura_jobs (pending)
         ↓
Worker PC claim → v3:captura:force (3 CDs) → push catálogo → done

UI Tailscale :3099 → pieng_jobs (Postgres F:) → mesmo worker
```

## 0) SQL obrigatório (Supabase)

No SQL Editor do projeto:

`sql/8_pieng_captura_jobs.sql`

## 1) App UI Tailscale (Postgres F:)

```powershell
cd E:\Projetos\pieng_postgres\apps\captura-dispatch
npm install
npm start
```

http://127.0.0.1:3099 · http://100.93.167.45:3099

> IP Tailscale do PC (`cca-tecnica-1`) confirmado em 2026-09-22. Se mudar de
> novo, checar com `tailscale status` no PC — o IP não é fixo entre
> reinstalações/reset do Tailscale.

## 2) Worker no logon (recomendado)

```powershell
powershell -ExecutionPolicy Bypass -File E:\Projetos\Prompt_ORC_pieng\scripts\v3-install-jobs-worker-task.ps1
```

## 3) Teste

```powershell
cd E:\Projetos\Prompt_ORC_pieng
npm run v3:jobs:test
```

## 4) Disparo real

- **Vercel:** `/admin/v3/precos` → Scraping live (teal) ou `/admin/soollar-captura` → Probe (sky)
- **Local / Tailscale:** botão Disparar em `:3099` ou `npm run v3:jobs:enqueue`

## DESFAZER

Dropar `pieng_captura_jobs` no Supabase se necessário; tarefa `PIENG-V3-JobsWorker`; app `:3099`.
