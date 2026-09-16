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
- `src/pages/api/admin/fortlev/captura.ts`
- `src/pages/admin/fortlev-captura.tsx`

## Precificação kit automático

Ver [`docs/FORTLEV_PRECIFICACAO.md`](FORTLEV_PRECIFICACAO.md) — desconto 11%, frete embutido, ranking R$/Wp, curva portal e amostras em `docs/fortlev/`.

## Nota estoque

Os cards de produto-avulso **não mostram** quantidade. Na gravação V3 usamos estoque assumido `999` para o preço ficar válido (`valido_estoque`).
