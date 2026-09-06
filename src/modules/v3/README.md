# PIENG V3 (espelho)

Módulo isolado — **não altera** YAML / Gerador Rápido / produção.

## Rotas
- UI: `/admin/v3` · `/admin/v3/equipamentos` · `/admin/v3/precos`
- API: `/api/v3/health` · `/api/v3/equipamentos` · `/api/v3/seed` · `/api/v3/precos` · `/api/v3/captura-precos`

## Banco
- SQLite: `data/v3/pieng_v3.sqlite` (gitignored)
- Seed equipamentos: `node scripts/v3-seed.js`
- Import preços (dumps temp/): `node scripts/v3-atualizar-precos-direct.js`

## Pipeline
Ver `temp/PIPELINE_V3_ORCAMENTO.md`

## Branch
`v3-orcamento` (ciclo V3 — fechamento v2.4.12)

**Próximo:** melhorias **V4** em branch temp → merge em `clean-main` só quando consolidado.
Ver knowledge: `src/data/knowledge/V3_PROPOSTA_AUTO_EDICAO_KIT.md`.

## Premissas — inventário completo

**Changelog canônico (não perder):** `VERSION.md` → seção **v2.4.4 · PREMISSAS V3**.

Resumo operacional abaixo; detalhes e tabelas no `VERSION.md`.

### Estoque (preço válido)
- Módulo: estoque > config `estoqueMinimoSoolar` (20)
- Demais: estoque > `estoqueMinimoOutros` (5)
- UI: `/admin/configuracoes`

### Whitelist (lista principal)
Módulos; inversor ≤30 kW; TRILHO / PERFIL fixação / kits INOX; CABO SOLAR 25|50|100; MC4; DPS.  
Restante → consulta (`ativo=0`). Código: `precos/regrasCaptura.ts`.

## Premissas — MC4, cabos, estrutura (3a / 4a)

Fonte: `orcamentos/kitEngine.ts` → `sugerirComplementos` + `skuCanonico.ts`.

### Catálogo
| SKU canônico | Significado | Resolução SOOLLAR (ex.) |
|-----|-------------|---|
| `MC4-PAR` | Kit com **2 pares** MC4 | `MC4-AUTO-440111` |
| `CABO-4MM-25-V` | Rolo/bola 25 m cabo **vermelho** | `CAB-AUTO-97082` |
| `CABO-4MM-25-P` | Rolo/bola 25 m cabo **preto** | `CAB-AUTO-97081` |
| `KIT-ESTRUTURA-4MOD` | Kit fixação 4 módulos | **Default:** `EST-AUTO-391003` fibro + inox madeira |
| `TRILHO-236` / `TRILHO-250` | **1 perfil por módulo** (preço; qtd final no fechamento) | **Default:** `EST-AUTO-52835` perfil fibro/cerâmica |

Resolver: `orcamentos/skuCanonico.ts` (`resolveEquipPorSkuCanonico` + aliases).

### Microinversor
1. **Strings** ≈ quantidade de módulos (1 entrada/string por módulo).
2. **MC4:** 1 par por string, **menos 1 par por micro** (módulo perto da placa — extensão curta, sem par extra).  
   Kits MC4 = `ceil(pares / 2)` porque o pacote traz 2 pares.  
   Ex.: 2 micros · 8 módulos → 8 strings − 2 = **6 pares** → **3 kits** MC4.
3. **Cabo vermelho:** default **0** (extensões quase sempre com preto).
4. **Cabo preto (25 m):** faixas por nº de micros  
   - 1 micro → **0** bola  
   - 2–3 micros → **2** bolas  
   - 4–5 micros → **3** bolas  
   - 6–7 → 4 … (`bolasCaboPretoMicro` = `floor((n+2)/2)` se n≥2)

### Inversor string
1. **Strings por potência CA** (aprox. — despreza modelo/MPPT; usa “Total de strings” típico):
   | Potência CA | Strings |
   |-------------|---------|
   | ≤ 3,5 kW | **1** |
   | **6–8 kW** | **2** (atalho) |
   | demais até 25 kW | **4** |
   | ≤ 36 kW | **6** |
   | ≤ 49 kW | **8** |
   | ~50 kW | **12** |
   | ~60 kW | **18** |
   | ≥ 70 kW | **24** |
   Código: `estimarStringsInversor` em `kitEngine.ts`.
2. **MC4:** quantidade de kits = **quantidade de strings**.
3. **Cabos bola 25 m (preto + vermelho):** **1 par (V+P) = nº de strings** (`cabo_25m_por_string` = 1).

### Preferência de marca (4a automática)
Ordem ao escolher inversor/micro: **SAJ → DEye → demais** (`INVERSOR_MARCAS_PREFERENCIA` em `propostaAuto.ts`).

### Dimensionamento DC/AC (gerador automático / 4a)
Regras em `calc/dcAcRatio.ts` + `dimensionarString` em `propostaAuto.ts`:
- **Sobrecarga:** kWp módulos ≤ kW inversor × **1,40** (ex.: 6 kW → 8,4 kWp); tolerância **+5 p.p.** → teto **1,45**
- **Subcarga:** kWp ≥ kW × **0,50** (−50%) — evita inversor caro subutilizado
- **Híbridos:** fora da lista principal do auto (3a: optgroup “sob demanda”)

### Fluxos
- **3a** usa essas sugestões ao Incluir/Recalcular (editável no card).
- **4a** herda via `calcularOrcamentoBase` / auto-complementos.
- Ajuste manual no card sempre prevalece (`editado_manual`).

## Changelog / aprendizados
- **2026-09-05:** Gerador automático: DC/AC 0,50–1,40 (+tol 1,45); híbridos fora da lista principal.
- **2026-09-05:** Cabo preto micro 25 m: 1→0 · 2–3→2 · 4–5→3 (`bolasCaboPretoMicro`).
- **2026-09-05:** Strings por faixa de kW CA (+ atalho **6–8 kW → 2**) + cabo 25 m V/P = nº strings; preferência SAJ/DEye na 4a.
- **2026-09-04:** Premissas MC4/cabos micro vs string documentadas e aplicadas em `sugerirComplementos`.
- **2026-09-04:** SKUs canônicos do kit (estrutura/cabo/MC4/trilho) resolvem para `*-AUTO-*` da captura SOOLLAR (`skuCanonico.ts`).
- **2026-09-04:** 3a → Gerador 5a; 4a só dimensionamento automático (sem kits forçados da 3a).
- **2026-09-04:** Micro com **módulos maiores (Wp)** é mais eficiente — preferir maior Wp no mesmo nº de placas/micro ao montar alternativas (além do bônus micro de geração).
- **2026-09-04:** Bridge 5a — pdespesa igual ao Gerador; abrir `/gerador-rapido?modo=v3`.
- **2026-09-04:** Scrape produção-ready: 2º login, paginação, HTML names, 1 sessão × 3 CDs, auto-módulo >20, R$/kWp na 4a.

