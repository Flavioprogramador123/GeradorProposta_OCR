# Avaliação Fortlev — fort.yaml (Airton Ximenes)

Gerado: 2026-09-16T16:59:22.467Z  
Cliente: **Airton Ximenes** · Anápolis · consumo **2500 kWh/mês**

Premissa estrutura (estimada): 1 perfil IEF00229/módulo + ceil(n/4)×BOM grampos/junção/prisioneiro (avulso). Sem duto/MC4/cabo 4mm (exceto tronco NEP).  
Desconto config atual: **11%** no kit Fortlev.

## Resumo dos 3 orçamentos

| # | Tipo | kWp | Preço pedido | Σ avulso (mód+inv+est) | c/ −11% | Gap pedido−avulso | R$/Wp pedido |
|---|------|----:|-------------:|-----------------------:|------------------:|------------------:|-------------:|
| 1 | micro | 22.05 | 31.969,15 | 35.232,38 | 31.356,82 | -3.263,23 (-9.26%) | 1.4498 |
| 2 | string | 22.05 | 29.381,22 | 30.397,24 | 27.053,54 | -1.016,02 (-3.34%) | 1.3325 |
| 3 | string | 22.05 | 29.458,90 | 30.495,68 | 27.141,16 | -1.036,78 (-3.4%) | 1.336 |

**Mais barato no pedido (R$/Wp):** #2 · string · R$ 29.381,22 · 1.3325 R$/Wp

## Detalhe

### 1. pedido-6aaac5bad33edd6ea09aacc4.pdf
- YAML: 35× JINKO 630W + 6× NEP 2.5kW → **22.05 kWp** · pedido **R$ 31.969,15**
- Módulo catálogo: MOD-AUTO-JINKO-630 @ R$ 644.64 → R$ 22562.399999999998
- Inversor catálogo: MIC-AUTO-IIN00521 (microinversor) @ R$ 1500.09 → R$ 9000.539999999999
- Estrutura est.: R$ 3395.6 (perfil EST-AUTO-IEF00229 ×35; kits×9 [6×IEF00227@4.56, 4×IEF00226@3.89, 2×IEF00224@5.3, 8×IEF00223@13.91])
- Cabo tronco: R$ 273.84
- **Pedido bem abaixo do avulso → desconto/kit Fortlev forte (ou BOM nosso incompleto/superestimado)**

### 2. pedido-6aaac5e4bd1c5a16a070cebe (1).pdf
- YAML: 35× JINKO 630W + 1× LIVOLTEK 20kW → **22.05 kWp** · pedido **R$ 29.381,22**
- Módulo catálogo: MOD-AUTO-JINKO-630 @ R$ 644.64 → R$ 22562.399999999998
- Inversor catálogo: INV-AUTO-IIN00421 (inversor) @ R$ 4439.24 → R$ 4439.24
- Estrutura est.: R$ 3395.6 (perfil EST-AUTO-IEF00229 ×35; kits×9 [6×IEF00227@4.56, 4×IEF00226@3.89, 2×IEF00224@5.3, 8×IEF00223@13.91])
- Cabo tronco: R$ 0
- **Pedido bem abaixo do avulso → desconto/kit Fortlev forte (ou BOM nosso incompleto/superestimado)**

### 3. pedido-6aaac5e4bd1c5a16a070cebe.pdf
- YAML: 35× JINKO 630W + 2× FOXESS 6kW → **22.05 kWp** · pedido **R$ 29.458,90**
- ⚠️ **Foxess 6 kW (F6000 / IIN00530) ausente no catálogo Fortlev local** — o script casou por engano o F5000-G2 (5 kW @ R$ 2.268,84). Soma avulsa #3 fica **subestimada**; gap real deve ser maior (pedido ainda mais abaixo do avulso pleno).
- Estrutura est.: R$ 3.395,60 (igual aos demais)
- **Ação:** re-capturar aba inverter Fortlev para trazer FOXESS 6KW / IIN00530.


## Leitura para o kit automático
1. String (Livoltek 20 kW / Foxess 6 kW) no pedido fica **bem abaixo** do micro NEP 6×2,5 kW — coerente com custo.
2. Se o auto Fortlev ainda sobe no micro caro (2 MPPT), a seleção por R$/Wp + desconto 11% deve aproximar o string/micro NEP 6 MPPT.
3. Gap pedido×avulso calibra o `descontoFortlevCustoPct` (hoje 11%).
