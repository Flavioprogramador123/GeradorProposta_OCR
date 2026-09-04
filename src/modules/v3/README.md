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
`v3-orcamento`

## Premissas — MC4 e cabos (3a semi-auto + 4a auto)

Fonte de verdade no código: `orcamentos/kitEngine.ts` → `sugerirComplementos`.

### Catálogo
| SKU | Significado |
|-----|-------------|
| `MC4-PAR` | Kit com **2 pares** MC4 |
| `CABO-4MM-25-V` | Rolo/bola 25 m cabo **vermelho** |
| `CABO-4MM-25-P` | Rolo/bola 25 m cabo **preto** |

### Microinversor
1. **Strings** ≈ quantidade de módulos (1 entrada/string por módulo).
2. **MC4:** 1 par por string, **menos 1 par por micro** (módulo perto da placa — extensão curta, sem par extra).  
   Kits MC4 = `ceil(pares / 2)` porque o pacote traz 2 pares.  
   Ex.: 2 micros · 8 módulos → 8 strings − 2 = **6 pares** → **3 kits** MC4.
3. **Cabo vermelho:** default **0** (extensões quase sempre com preto).
4. **Cabo preto (25 m):** `max(0, nMicros − 1)`  
   - 1 micro → 0  
   - 2 micros → 1 bola  
   - 3 micros → 2 bolas  

### Inversor string
1. **Strings por inversor:** **3–7,5 kW → 1 string**; faixas maiores sobem (≤12 → 2; ≤20 → 3; …).
2. **MC4:** quantidade de kits = **quantidade de strings**.
3. **Cabos vermelho e preto:** seguem a **quantidade de strings** (1 V + 1 P por string).

### Fluxos
- **3a** usa essas sugestões ao Incluir/Recalcular (editável no card).
- **4a** herda via `calcularOrcamentoBase` / auto-complementos.
- Ajuste manual no card sempre prevalece (`editado_manual`).

## Changelog / aprendizados
- **2026-09-04:** Premissas MC4/cabos micro vs string documentadas e aplicadas em `sugerirComplementos`.
- **2026-09-04:** 3a → Gerador 5a; 4a só dimensionamento automático (sem kits forçados da 3a).
- **2026-09-04:** Micro com **módulos maiores (Wp)** é mais eficiente — preferir maior Wp no mesmo nº de placas/micro ao montar alternativas (além do bônus micro de geração).
- **2026-09-04:** Bridge 5a — pdespesa igual ao Gerador; abrir `/gerador-rapido?modo=v3`.
- **2026-09-04:** Scrape produção-ready: 2º login, paginação, HTML names, 1 sessão × 3 CDs, auto-módulo >20, R$/kWp na 4a.

