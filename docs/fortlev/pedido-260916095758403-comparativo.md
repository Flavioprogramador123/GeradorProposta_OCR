# Comparativo Fortlev — Pedido 260916095758403

Gerado: 2026-09-16T14:40:28.830Z

## Pedido
- Potência declarada: **10.88 kWp** (soma módulos catálogo: **10.88 kWp**, 17 módulos: 15×630 + 2×715)
- Valor pedido: **R$ 16.877,44**
- PIX: **R$ 16.539,89** → desconto **2%** (no PDF; você citou ~4% — aqui a conta fecha em **2%**)
- Telhado: Telhado Fibrocimento - Estrutura em madeira (200mm) · Layouts: 44M, L2M

## Preço kit vs avulso (catálogo V3 Fortlev)

Códigos do pedido normalizados: `IM000175`→`IMO00175`, `IC000001`→`ICO00001`.

| | R$ |
|---|---:|
| Soma preços **avulsos** × qtds do pedido | 18.150,21 |
| Valor do **kit/pedido** (antes PIX) | 16.877,44 |
| Delta (kit − avulso) | -1.272,77 (-7.01%) |

**Leitura:** Kit mais barato que soma avulsa → há desconto/preço de kit nos equipamentos.

Itens sem preço avulso no SQLite: IEF00167, IDT00071

### Por grupo (avulso)
- **modulos**: R$ 11.314,36
- **inversores**: R$ 4.500,27
- **acessorios_inv**: R$ 136,92
- **estrutura**: R$ 1.618,96
- **eletrico**: R$ 579,70

## Linha a linha

| Código | Catálogo | Qtd | Preço avulso | Subtotal | Nome |
|--------|----------|----:|-------------:|---------:|------|
| IMO00179 | IMO00179 | 15 | 644.64 | 9669.60 | MÓDULO JINKO 630WP BIFACIAL N-TYPE |
| IM000175 | IMO00175 | 2 | 822.38 | 1644.76 | MÓDULO DMEGC 715WP BIFACIAL N-TYPE |
| IIN00521 | IIN00521 | 3 | 1500.09 | 4500.27 | NEP MICROINVERSOR 2,5KW BDM-2500 |
| IIN00283 | IIN00283 | 3 | 45.64 | 136.92 | NEP CABO TRONCO-BDC-T |
| IEF00167 | IEF00167 | 6 | — | — | PORCA SEXT FLANG M8 |
| IEF00166 | IEF00166 | 6 | 1.20 | 7.20 | PARAFUSO MARTELO M8X20 |
| IEF00229 | IEF00229 | 18 | 54.64 | 983.52 | PERFIL CER/FIBRO - 2400 MM |
| IEF00227 | IEF00227 | 26 | 4.56 | 118.56 | GRAMPO INTERMEDIARIO 30/35MM |
| IEF00226 | IEF00226 | 20 | 3.89 | 77.80 | GRAMPO FINAL 30/35MM |
| IEF00223 | IEF00223 | 28 | 13.91 | 389.48 | PARAFUSO PRISIONEIRO + SUPORTE L M10X200 |
| IEF00224 | IEF00224 | 8 | 5.30 | 42.40 | JUNCAO LAT PERFIL |
| IC000001 | ICO00001 | 20 | 21.92 | 438.40 | KIT CONECTOR 2 PARES |
| ICA00008 | ICA00008 | 30 | 4.71 | 141.30 | CABO PRETO 4MM2 |
| IDT00071 | IDT00071 | 25 | — | — | DUTO CONDUFORT LP DN 32 |

## Estrutura — correlação

Nossa regra (kit 391003 × ceil(n/4)=**5**) vs pedido:

| Peça | Pedido | Nosso (escala kit) | Δ |
|------|-------:|-------------------:|--:|
| Perfil 2400 | 18 | 17 (1/módulo) | 1 |
| Grampo intermediário | 26 | 30 | -4 |
| Grampo final | 20 | 20 | 0 |
| Prisioneiro+suporte | 28 | 40 | -12 |
| Junção | 8 | 10 | -2 |

**Veredito estrutura:** Perfil (~1:1, +1 no pedido) e grampo final batem com a nossa escala. Nosso BOM 391003×5 OVERESTIMA prisioneiros (40 vs 28) e grampos intermediários (30 vs 26) — o layout Fortlev 44M+L2M é mais enxuto que 5 kits genéricos de 4 módulos.

## CA
- 3× BDM-2500 = 7.5 kW CA · DC/AC ≈ **1.45**
- 3× cabo tronco (1:1 com micros)

## Observações
- Desconto PIX no PDF: 2,00% (R$ 16.877,44 → R$ 16.539,89), não 4%. Confirmar se havia outro desconto comercial além do PIX.
- Pedido traz IM000175 e IC000001; catálogo usa IMO00175 e ICO00001 (aliases/normalização).
- Ainda sem preço avulso: IEF00167 (porca M8) e IDT00071 (duto) — delta kit×avulso fica ligeiramente enviesado para cima no lado kit.
