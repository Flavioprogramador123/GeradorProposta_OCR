# Fortlev Solar — captura V3

Branch: `feature/fortlev-scraping`

## Portal

- Login: https://fortlevsolar.app/login
- Catálogo (1 tela / 1 CD): https://fortlevsolar.app/produto-avulso
- SPA + **HTMX**: grid `#single-grid` carrega mais via `?pagina=N` no scroll de `#main`

## Integração como CD

Fortlev entra na tabela `cds` com `slug_portal=fortlev` (id tipicamente **4**), no **mesmo seletor** de Aeroporto/Matriz/Feira:

- Proposta auto / Orçamento base → “CD / fornecedor”
- Scraping live (`atualizarPrecosFromScrape`) inclui Fortlev por padrão junto com os 3 CDs SOOLLAR
- Fallback de preço complementar: Aeroporto → Matriz → Feira → Fortlev

Na prática você escolhe **um** CD por proposta (SOOLLAR·Feira **ou** Fortlev). Comparar fornecedores = gerar duas propostas (ou, no futuro, multi-CD na mesma tela).

## Env

```bash
FORTLEV_BASE_URL=https://fortlevsolar.app
FORTLEV_USER=...
FORTLEV_PASSWORD=...
```

## Uso

1. Local: `npm run dev` → [/admin/fortlev-captura](http://localhost:3000/admin/fortlev-captura) **ou** Scraping live em [/admin/v3/precos](http://localhost:3000/admin/v3/precos) (já puxa Fortlev)
2. Revisar CD Fortlev em Preços V3
3. Em Proposta auto, selecionar **Fortlev (fornecedor)**

API dedicada: `GET/POST /api/admin/fortlev/captura` (`action=probe|capturar`).

### Captura pela Vercel (fila → PC)

Na nuvem não há Playwright. Ao clicar em **Capturar produto-avulso** no `/admin/fortlev-captura` em produção, o endpoint enfileira um job `fortlev_scrape` no Supabase (`pieng_captura_jobs`, fallback `configuracoes.v3_captura_job`) e o worker do PC executa:

```bash
npm run v3:jobs:worker          # loop (poll Supabase)
npm run v3:jobs:worker:once     # roda 1 job e sai
```

O job roda `npm run v3:captura:fortlev` (Fortlev-only + publish no Supabase). `action=probe` continua exclusivo do PC (é só diagnóstico de login).

Requisitos: `sql/8_pieng_captura_jobs.sql` aplicado, `.env` da Fortlev **no PC** (não precisa na Vercel) e o worker rodando.

## BOM ≈ kit SOOLLAR 391003

Trilho / cabo / MC4 **não** entram no BOM Fortlev (regras atuais do `kitEngine`).
Na Fortlev o **trilho/perfil de fixação** é vendido como **PERFIL** (`IEF00229` · PERFIL CER/FIBRO 2400 MM · `EST-AUTO-IEF00229`) e resolve o canônico `TRILHO-236`.

Inversores Fortlev muitas vezes **não trazem a palavra “INVERSOR”** no nome (ex.: FoxESS On-Grid, Sungrow SG…). A inferência usa On-Grid / marca+kW / modelo. RSD/PVG não entram como inversor.

Filtros de potência mínima (Configurações): módulo ≥ `moduloPotenciaMinW` (padrão 500 Wp) e inversor/micro ≥ `inversorPotenciaMinKw` (padrão 1 kW) — exclui Maxeon ~415 W e Enphase ~0,475 kW.

## Catálogo + imagens (knowledge)

Dump classificado e fotos alinhados ao app:

| Artefato | Caminho |
|----------|---------|
| Inversores / MPPT | [`src/data/knowledge/fortlev/INVERSORES.md`](../src/data/knowledge/fortlev/INVERSORES.md) |
| Mapa código ↔ imagem | [`src/data/knowledge/fortlev/imagens-map.json`](../src/data/knowledge/fortlev/imagens-map.json) |
| PNGs públicos | `public/equipamentos/fortlev/{codigo}.png` → URL `/equipamentos/fortlev/{codigo}.png` |
| Helper TS | `src/lib/fortlev/imagens.ts` |

Uso futuro: cards de orçamento/proposta com foto do equipamento.

| Papel | Qty | Código preferido | Peça |
|-------|-----|------------------|------|
| Grampo intermediário | 6 | `ILS00027` | GRAMPO INTERMEDIARIO ALUM / INOX LS |
| Grampo final | 4 | `ILS00028` | GRAMPO FINAL ALUM / INOX LS |
| Junção | 2 | `IEF00009` | JUNCAO U DO PERFIL |
| Suporte + prisioneiro M10×250 | 8 | `IEF00232` | PARAFUSO PRISIONEIRO SUPORTE L M10X250 |

A captura injeta um item sintético `391003` com a soma dessas peças para casar `EST-AUTO-391003` / `KIT-ESTRUTURA-4MOD`.

## Código

- `src/lib/fortlev/scraper.ts` — login + HTMX/DOM
- `src/lib/fortlev/bom.ts` — receita 391003
- `src/lib/fortlev/ensureCd.ts` / `sqlite.ensureFortlevCdRow` — CD no SQLite
- `src/modules/v3/precos/capturaJob.ts` — scrape SOOLLAR + Fortlev
- `src/modules/v3/precos/capturaJobsQueue.ts` — fila Vercel → PC (`job_type=fortlev_scrape`)
- `scripts/v3-captura-fortlev.ts` — captura Fortlev-only + publish (`npm run v3:captura:fortlev`)
- `scripts/v3-jobs-worker.ts` — worker que consome a fila
- `src/pages/api/admin/fortlev/captura.ts`
- `src/pages/admin/fortlev-captura.tsx`

### Scripts de exploração/debug (`scripts/obsoletos/`)

Scripts descartáveis usados para investigar a estrutura HTML/HTMX do portal
Fortlev durante o desenvolvimento do scraper (parsing, probes de seletor,
inspeção do SQLite, etc.). **Não fazem parte da pipeline** — não são
chamados por nenhum `npm run`, API ou tarefa agendada.

No `.gitignore` (não versionados) — mantidos só localmente como referência
caso o portal mude de estrutura de novo e seja preciso re-investigar. Se
depois de um tempo sem uso não fizerem falta, apagar a pasta inteira.

## Captura diária agendada (SOOLLAR + Fortlev juntos)

**Requisito do negócio: rodar a captura todo dia útil (seg–sex).** Isso já
está implementado, mas com falhas recorrentes — ver "Problemas conhecidos"
abaixo antes de assumir que está 100% confiável.

- **Config**: `data/v3/captura-agenda.json` (`enabled`, `hora`, `dias`,
  `fonte`, `publicarAposOk`, e o histórico `lastRunAt/lastRunOk/lastRunMsg`
  da última execução — é o primeiro lugar pra checar se rodou).
- **Script**: `scripts/v3-captura-agendada.ts` (`npm run v3:captura`, ou
  `--force` pra ignorar a janela dia/hora). Com `fonte: "scrape"`, captura
  **SOOLLAR (3 CDs: Aeroporto, Matriz, Feira de Santana) + Fortlev na mesma
  execução**, depois publica no Supabase (`pushCatalogToSupabase`).
- **Disparo**: Tarefa do Agendador do Windows `PIENG-V3-CapturaSoolar`
  (apesar do nome, já cobre Fortlev também), seg-sex, horário definido em
  `captura-agenda.json` (`hora`, hoje `07:30`), instalada por
  `scripts/v3-install-task-scheduler.ps1`.
- **Disparo sob demanda**: fila Tailscale/Vercel — ver
  `docs/V3_JOBS_POSTGRES.md`. Para o job Fortlev-only,
  `scripts/v3-jobs-worker.ts` roda `npm run v3:captura:fortlev`.

### Problemas conhecidos (checados em 2026-09-22)

1. **Fortlev falhava com timeout no login** (~60s em `page.goto`,
   `https://fortlevsolar.app/login`). Aconteceu na captura de 21/09 — SOOLLAR
   completou normal (100 produtos válidos, publicado), só o trecho Fortlev
   deu erro. Não trava a publicação do catálogo (SOOLLAR sobe mesmo assim),
   mas o preço Fortlev fica desatualizado nesse dia.
   **✅ Fix já está no código** (`src/lib/fortlev/scraper.ts`, `loginFortlev`
   e `capturarFamilia`): `networkidle` cai para `domcontentloaded` se não
   estabilizar em 60s/90s, mesmo padrão já usado no scraper SOOLLAR. Ainda
   **não validado em execução real** (o fix é posterior à falha de 21/09) —
   conferir `lastRunMsg` na próxima captura.
2. **A tarefa `PIENG-V3-CapturaSoolar` às vezes não completa** — em 22/09 às
   07:30 o processo foi encerrado abruptamente (exit code Windows
   `3221225786` / `STATUS_CONTROL_C_EXIT`) antes mesmo de gravar
   `lastRunAt` em `captura-agenda.json`. Causa provável: `WakeToRun=False`
   (não acordava o PC se estivesse em suspensão nesse horário) combinado com
   `LogonType=Interactive` (precisa da sessão do usuário ativa).
   **✅ `WakeToRun` ligado em 2026-09-22** (`Set-ScheduledTask`). O
   `LogonType=Interactive` continua — se a captura seguir falhando mesmo
   com o PC acordado, o próximo passo é trocar pra "executar estando ou não
   o usuário conectado" (S4U, sem precisar guardar senha) via
   `scripts/v3-install-task-scheduler.ps1`.
3. **Diagnóstico rápido**: `Get-ScheduledTaskInfo -TaskName
   PIENG-V3-CapturaSoolar` (último resultado/horário) +
   `data/v3/captura-agenda.json` → `lastRunAt/lastRunOk/lastRunMsg` (mensagem
   detalhada por CD, incluindo erro do Fortlev se houver).

## Precificação kit automático

Ver [`docs/FORTLEV_PRECIFICACAO.md`](FORTLEV_PRECIFICACAO.md) — desconto 11%, frete embutido, ranking R$/Wp, curva portal e amostras em `docs/fortlev/`.

## Nota estoque

Os cards de produto-avulso **não mostram** quantidade. Na gravação V3 usamos estoque assumido `999` para o preço ficar válido (`valido_estoque`).
