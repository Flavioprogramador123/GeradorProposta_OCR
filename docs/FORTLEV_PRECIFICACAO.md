# Fortlev — precificação no kit automático

Atualizado: 16/09/2026 · Versão: v2.4.22

Calibração a partir de pedidos reais e curva portal (ver `docs/fortlev/`).

## Premissas

1. Preços do catálogo V3 são **avulsos**; o portal vende **kit** mais barato (~7–11%).
2. Config **`descontoFortlevCustoPct`** (padrão **11%**) reduz o custo do kit **só no CD Fortlev**, antes da pdespesa.
3. **Frete Fortlev já vem embutido** no preço do portal → no auto, frete efetivo = **0** (não soma `fretePadrao`). SOOLLAR continua kit + frete.
4. Ranking de alternativas **dentro da faixa**: menor **R$/Wp** (PIX ÷ Wp), depois PIX, depois desvio.
5. Micros: prioriza menor **R$/Wp conectável** (`preço ÷ placas×Wp`), depois mais MPPT — evita Foxess 2 MPPT vencer NEP 6 MPPT só por desvio de faixa.
6. Parse BDM: `IIN00349` / BDM-2250 = 2,25 kW · 4 MPPT; `IIN00521` / BDM-2500 = 2,5 kW · 6 MPPT.

## Fórmula comercial (CD Fortlev)

```
kit_liquido = kit_avulso × (1 − descontoFortlevCustoPct/100)
pcusto      = kit_liquido          // frete embutido
pdespesa    = fixo + pcusto × (var%/100)
PIX         = pcusto + pdespesa    // + tabela cartão no bloco comercial
```

Ajuste em **Admin → Configurações → Desconto Fortlev no custo (%)** ou no campo da Proposta automática.

## Curva portal R$/Wp (referência)

Dados: [`src/data/fortlev/curva-rs-wp.json`](../src/data/fortlev/curva-rs-wp.json)  
Regenerar: `npx tsx scripts/fortlev-curva-rs-wp.ts`

| kWp | Micro R$/Wp | String R$/Wp | Nota |
|----:|------------:|-------------:|------|
| 5.04 | 1.51 | 1.55 | |
| 10.08 | 1.48 | 1.40 | |
| 15.12 | 1.44 | 1.43 | |
| **22.05** | **1.52** | **1.51** | referência comercial |
| 30.24 | 1.51 | 1.43 | |
| 39.69 | 1.44 | 1.38 | |

**Fora da curva:** 22,05 string a **1,33 R$/Wp** (desconto pontual de vendedor, ex. Airton) — **não** usar como meta do auto.

## Amostras de calibração

| Artefato | Uso |
|----------|-----|
| [`docs/fortlev/pedido-260916095758403-comparativo.md`](fortlev/pedido-260916095758403-comparativo.md) | Kit 10,88 kWp · avulso vs pedido (~−7% kit) · estrutura |
| [`docs/fortlev/fort-yaml-airton-avaliacao.md`](fortlev/fort-yaml-airton-avaliacao.md) | 3 orçamentos 22,05 kWp · gap vs −11% |
| [`docs/fortlev/fort-yaml-airton.exemplo.yaml`](fortlev/fort-yaml-airton.exemplo.yaml) | YAML exemplo |

## UI Proposta automática

- Badge sky = **nome do CD** (`Feira de Santana`, `Fortlev`, …).
- Sob o PIX: **pcusto** (com −Fortlev e frete embutido quando aplicável).
- Campo **Desc. Fortlev custo (%)** nas configs rápidas.

## Relacionado

- Captura / CD: [`docs/FORTLEV_SCRAPING.md`](FORTLEV_SCRAPING.md)
- Código: `propostaAuto.ts`, `bridge/comercial.ts`, `parsePotencia.ts`, `configuracoes.ts`
