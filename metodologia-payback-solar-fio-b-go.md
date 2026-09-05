# Metodologia de Cálculo — Payback Solar com Fio B (Lei 14.300) — Equatorial Goiás

## Propósito deste documento

Este arquivo documenta, de forma completa e rastreável, a metodologia usada para calcular a economia gerada por um sistema fotovoltaico na área de concessão da **Equatorial Goiás**, considerando o escalonamento da cobrança do **Fio B** instituído pela **Lei nº 14.300/2022**. O objetivo é permitir que qualquer IA (incluindo instâncias futuras deste mesmo assistente) reproduza, audite ou estenda esse cálculo sem precisar refazer a pesquisa de fontes primárias.

Este documento foi construído a partir de uma sequência de investigações reais: dados de irradiação solar (HSP) do SunData/CRESESB, dados tarifários oficiais extraídos diretamente da Resolução Homologatória da ANEEL, e parâmetros técnicos/financeiros de um sistema de proposta comercial real da PIENG Soluções Energéticas.

---

## 1. Fonte oficial da tarifa — Resolução Homologatória ANEEL nº 3.544/2025

**Link do documento original:** https://goias.gov.br/agr/wp-content/uploads/sites/43/2026/06/Resolucao-homologatoria-3544-2025-EQTL-GO.pdf

**O que essa resolução faz:** Homologa o Reajuste Tarifário Anual de 2025 da Equatorial Goiás Distribuidora de Energia S.A., com as Tarifas de Energia (TE) e Tarifas de Uso do Sistema de Distribuição (TUSD).

**Vigência:** 22 de outubro de 2025 a 21 de outubro de 2026.

**Reajuste médio aplicado:** 18,55% em relação à Resolução Homologatória nº 3.407/2024.

### 1.1 — Tarifas extraídas (Tabela 2 do Anexo — Grupo B, Subgrupo B1, Classe Residencial, Modalidade Convencional)

Estes são os valores de **"Tarifas de Aplicação"** (não são a base econômica, são os valores efetivamente usados no faturamento), **sem tributos (ICMS, PIS, COFINS)**:

| Componente | Valor | Unidade |
|---|---|---|
| TE (Tarifa de Energia) | R$ 324,14 / MWh | = R$ 0,32414 / kWh |
| TUSD (Tarifa de Uso do Sistema de Distribuição) | R$ 567,67 / MWh | = R$ 0,56767 / kWh |
| **Soma (TE + TUSD, sem tributos)** | **R$ 891,81 / MWh** | **= R$ 0,89181 / kWh** |

> Esses dois valores (TE e TUSD) foram confirmados de forma independente por duas fontes: (1) extração direta do PDF da resolução homologatória e (2) o número trazido pelo usuário a partir de outra pesquisa, que bateu exatamente com o valor oficial. Portanto, **TE = R$0,32414/kWh e TUSD = R$0,56767/kWh são dados confiáveis e verificados**, não estimativas.

### 1.2 — O que a resolução NÃO informa diretamente

A Resolução Homologatória **não separa o TUSD em seus subcomponentes** (Fio A, Fio B, perdas técnicas, encargos setoriais). O TUSD de R$0,56767/kWh é um valor agregado. A quebra granular do Fio B isoladamente está em outro relatório da ANEEL, chamado **"Componentes Tarifários"**, disponível em:

```
aneel.gov.br → Assuntos → Tarifas → Relatórios e Indicadores →
Base de Dados das Tarifas das Distribuidoras de Energia Elétrica →
Componentes Tarifários → buscar "TUSD Fio B" → filtrar Equatorial GO
```

Esse relatório **não foi consultado nesta análise** porque não foi encontrada uma forma de acessá-lo programaticamente (o portal da ANEEL bloqueia acesso automatizado). Isso é uma limitação conhecida e deve ser resolvida manualmente se for necessária precisão cirúrgica no valor do Fio B.

### 1.3 — Tabela 4 da Resolução (percentuais de compensação SCEE) — não totalmente aproveitada

A Resolução também traz, na **Tabela 4**, os percentuais de TUSD e TE efetivamente compensados por unidades consumidoras participantes do Sistema de Compensação de Energia Elétrica (SCEE), por categoria (GD I / GD II / GD III) e por período de vigência (2025 / 2026). **Esta tabela teoricamente contém o dado mais preciso possível** — os percentuais de compensação já prontos, sem precisar isolar o Fio B manualmente.

**Problema encontrado:** ao extrair o PDF, essa tabela veio com as colunas desalinhadas (a extração de texto não preserva a estrutura tabular original), tornando impossível mapear com segurança qual número corresponde a qual categoria/período. Os valores brutos extraídos para a linha "B1 CONVENCIONAL/PRÉ-PAGAMENTO RESIDENCIAL RESIDENCIAL" foram:

```
100,00%  76,86%  100,00%  69,15%  100,00%  42,31%  92,94%
```

Sem conseguir confirmar a correspondência exata coluna-a-coluna, **esses números não foram usados no cálculo final**. Se uma IA futura (ou uma pessoa) conseguir abrir o PDF visualmente (páginas 10-11) e confirmar a estrutura correta dessa tabela para a linha B1 Residencial, o cálculo pode — e deve — ser refeito usando o percentual real em vez da estimativa da seção 2.

---

## 2. Estimativa do Fio B (usada no cálculo, na ausência do dado isolado oficial)

Como não foi possível confirmar o valor isolado do Fio B pela fonte primária, foi usada uma **heurística de mercado documentada em múltiplas fontes do setor solar**: o Fio B representa, em média, entre **28% e 35% do valor total do TUSD**, variando por distribuidora conforme a densidade da rede e os custos operacionais regionais.

**Valor adotado: 30% do TUSD** (ponto médio da faixa, escolha conservadora-neutra).

```
Fio B-base (sem tributos) = TUSD × 30%
                           = R$ 0,56767 × 0,30
                           = R$ 0,170301 / kWh
```

### 2.1 — Conversão para valor com tributos (ICMS, PIS, COFINS)

O cliente informou que a tarifa cheia praticada (já com todos os tributos) é de **R$ 1,17/kWh** — esse é o valor usado como "Tarifa padrão R$/kWh" no ERP da PIENG (ver seção 4). Como a soma TE+TUSD sem tributos é R$0,89181/kWh, o fator de carga tributária é:

```
Fator de imposto = Tarifa cheia com tributos / Tarifa sem tributos
                  = 1,17 / 0,89181
                  = 1,3119 (aprox. 31,19% de tributos agregados)
```

Aplicando esse fator ao Fio B-base:

```
Fio B-base (com tributos) = R$ 0,170301 × 1,3119
                           = R$ 0,2234 / kWh  (valor 2026, ano-base)
```

> **⚠️ ATENÇÃO — ISSO É UMA ESTIMATIVA, NÃO O VALOR OFICIAL EXATO.** Uma IA que reabrir este cálculo no futuro deve tentar substituir esse valor pelo dado real assim que ele for confirmado (ver seção 1.2 e 1.3). Enquanto isso não acontecer, todo cálculo derivado desta seção deve ser apresentado ao cliente final com a ressalva explícita de que o Fio B é estimado.

---

## 3. Cronograma legal do Fio B — Lei nº 14.300/2022, Art. 27

Percentual do Fio B que **deixa de ser compensado** (ou seja, que o consumidor efetivamente paga) sobre a energia injetada/compensada por sistemas de geração distribuída homologados a partir de 7 de janeiro de 2023:

| Ano | % do Fio B cobrado (não compensado) |
|---|---|
| 2023 | 15% |
| 2024 | 30% |
| 2025 | 45% |
| **2026** | **60%** |
| 2027 | 75% |
| 2028 | 90% |
| 2029 em diante | Regra do Art. 17 da Lei 14.300 — **ainda não definida pela ANEEL**. A ANEEL abriu, em dezembro de 2025, a Tomada de Subsídios nº 23/2025 para discutir a valoração definitiva da geração distribuída, com consulta pública prevista até março de 2026 e sem prazo final definido para a conclusão da regulação. |

**Regra de transição/exceção importante:** consumidores que solicitaram a conexão do sistema fotovoltaico **antes de 7 de janeiro de 2023** têm isenção total do Fio B garantida até **2045** (direito adquirido, Art. 26 da Lei 14.300). Essa regra não se aplica a sistemas novos instalados a partir de 2023 — que é o caso do sistema calculado neste documento.

**Premissa adotada para 2029 em diante:** como a regra definitiva não existe, foi assumido, de forma conservadora, que o percentual **permanece em 90%** (mesmo patamar de 2028) a partir de 2029. Isso é uma simplificação de projeto — se a ANEEL definir uma regra diferente, os cálculos de anos posteriores a 2029 precisam ser refeitos.

---

## 4. Parâmetros técnicos e financeiros do sistema (fonte: telas do ERP da PIENG)

Esses valores vieram diretamente de screenshots do sistema interno da PIENG (abas "Financeiro" e "Técnico" de parâmetros), e representam os defaults usados no gerador de propostas automáticas (V3):

### 4.1 — Parâmetros Financeiros
| Parâmetro | Valor |
|---|---|
| Tarifa padrão | R$ 1,17 / kWh |
| Taxa SELIC | 11,25% a.a. |
| Inflação Anual | 4,5% |
| Reajuste Energia | 8,2% a.a. |

### 4.2 — Parâmetros Técnicos
| Parâmetro | Valor | Observação |
|---|---|---|
| Performance Rate (PR) | 78% | Eficiência do sistema considerando perdas |
| HSP Padrão (GO) | 5,3 kWh/m².dia | Horas de Sol Pico — valor fixo usado pelo ERP (não varia mês a mês) |
| Margem de Segurança | 1,12 | Multiplicador para dimensionamento (não usado no cálculo de geração/payback) |
| Eficiência Inversor | 95% | Não entra na fórmula de geração usada pelo ERP — ver nota abaixo |
| Eficiência adicional micro-inversores | 5% | Só se aplica quando o sistema usa micro-inversores (não é o caso do sistema calculado, que usa inversores string DEYE) |
| Dias/mês (geração) | 30,4 | Usado na fórmula: **kWp × HSP × dias × PR** |

**Nota importante sobre a fórmula:** o próprio ERP documenta explicitamente que a fórmula de geração usada é `kWp × HSP × dias × PR`, e que o campo "Dias/mês" (30,4) é "usado em kWp × HSP × dias × PR (padrão 30,4)". Isso confirma que **Eficiência do Inversor (95%) e Eficiência de micro-inversores (5%) NÃO fazem parte da fórmula de geração padrão** — são parâmetros usados em outras partes do sistema (ex: dimensionamento de string, sobrecarga de inversor), não no cálculo de geração/payback. Uma IA que for reproduzir este cálculo **não deve multiplicar por esses dois fatores adicionais**, sob risco de subestimar a geração incorretamente.

---

## 5. Dados do sistema fotovoltaico usado como exemplo de cálculo

| Item | Valor |
|---|---|
| Potência do sistema | 8,16 kWp |
| Equipamentos | 12 módulos RENEPV 680W, 3 inversores DEYE 2,25kW, estrutura de alumínio, cabeamento CC/CA, string box + proteções |
| Preço de tabela | R$ 24.480,00 |
| Preço à vista (cartão/boleto) | R$ 22.806,04 |
| **Preço PIX (usado no cálculo)** | **R$ 20.400,00** |
| Desconto PIX vs tabela | 12% |

---

## 6. Fórmula completa de geração

```
Geração mensal (kWh) = kWp × HSP × PR × dias_por_mês
Geração mensal        = 8,16 × 5,3 × 0,78 × 30,4
                       = 1.025,50 kWh/mês
Geração anual          = 1.025,50 × 12
                       = 12.305,96 kWh/ano
```

---

## 7. Fórmula completa de comparação de custo (com/sem sistema)

### Premissas assumidas (e que precisam ser confirmadas/ajustadas caso a caso):
1. **Consumo do cliente = geração do sistema** (sistema dimensionado para autossuficiência de ~100%). Se o consumo real do cliente for diferente, substituir `geração_anual` por `consumo_anual` na fórmula "sem sistema", mantendo `geração_anual` na fórmula "com sistema" (o Fio B incide sobre a energia gerada/injetada, não sobre o consumo).
2. **Fio B incide sobre toda a energia gerada**, sem descontar autoconsumo instantâneo (energia consumida no exato momento em que é gerada, que tecnicamente não paga Fio B). Isso é uma simplificação conservadora — o custo real "com sistema" tende a ser um pouco **menor** do que o calculado aqui.
3. O custo mínimo de disponibilidade (30 kWh/mês para ligação monofásica, cobrado independentemente da geração) **não foi somado separadamente** porque, na prática, o valor do Fio B sobre a energia gerada (muito maior que 30 kWh/mês neste sistema) já excede esse mínimo — logo, o mínimo não é o fator limitante neste caso. Para sistemas muito pequenos ou clientes com baixo consumo, essa premissa precisa ser reavaliada.
4. Tanto a tarifa cheia quanto o Fio B-base foram projetados crescendo **8,2% ao ano** (mesmo índice de "Reajuste Energia" do ERP), ano após ano, sem interrupção.
5. Degradação de painel fotovoltaico (tipicamente ~0,5%/ano) **não foi incluída** neste cálculo — é uma simplificação para o lado conservador (subestima levemente o custo "com sistema" real ao longo dos anos, já que a geração real cairia um pouco).

### Fórmulas

```
Ano N (N=0 para 2026, N=1 para 2027, ...):

Tarifa_cheia(N)     = 1,17 × (1,082)^N
Fio_B_base(N)       = 0,2234 × (1,082)^N
%_Fio_B(N)          = conforme tabela da Seção 3
Fio_B_efetivo(N)    = Fio_B_base(N) × %_Fio_B(N)

Custo_sem_sistema(N) = Tarifa_cheia(N) × Geração_anual
Custo_com_sistema(N) = Fio_B_efetivo(N) × Geração_anual

Economia_anual(N)    = Custo_sem_sistema(N) − Custo_com_sistema(N)
Economia_acumulada   = soma de Economia_anual(0) até Economia_anual(N)

Payback = primeiro N em que Economia_acumulada ≥ Investimento (R$ 20.400,00)
```

### Resultado do cálculo de exemplo (sistema de 8,16 kWp, R$20.400,00 PIX)

| Ano | Tarifa cheia (R$/kWh) | Fio B efetivo (R$/kWh) | Sem sistema (R$/ano) | Com sistema (R$/ano) | Economia (R$/ano) | Economia acumulada (R$) |
|---|---|---|---|---|---|---|
| 2026 | 1,1700 | 0,1341 | 14.397,97 | 1.649,67 | 12.748,30 | 12.748 |
| 2027 | 1,2659 | 0,1813 | 15.578,61 | 2.231,18 | 13.347,43 | 26.096 |
| 2028 | 1,3697 | 0,2354 | 16.856,05 | 2.896,96 | 13.959,09 | 40.056 |
| 2029 | 1,4821 | 0,2547 | 18.238,25 | 3.134,52 | 15.103,73 | 55.160 |
| 2030 | 1,6036 | 0,2756 | 19.733,78 | 3.391,55 | 16.342,24 | 71.502 |
| 2031 | 1,7351 | 0,2982 | 21.351,95 | 3.669,65 | 17.682,30 | 89.185 |
| 2032 | 1,8774 | 0,3227 | 23.102,81 | 3.970,56 | 19.132,25 | 108.318 |
| 2033 | 2,0313 | 0,3491 | 24.997,25 | 4.296,15 | 20.701,09 | 129.019 |
| 2034 | 2,1979 | 0,3777 | 27.047,02 | 4.648,44 | 22.398,58 | 151.418 |
| 2035 | 2,3781 | 0,4087 | 29.264,87 | 5.029,61 | 24.235,27 | 175.654 |

**Payback calculado: entre 2026 e 2027, aproximadamente 1 ano e 7 meses** (a economia acumulada ultrapassa os R$20.400 investidos em meados de 2027).

---

## 8. Instrução para a IA — como usar este documento

Quando uma IA (ou pessoa) for gerar um gráfico ou uma nova proposta de payback usando os dados deste arquivo, deve seguir esta ordem de prioridade:

1. **Nunca inventar tarifas ou valores de Fio B.** Usar exclusivamente os valores desta seção 1 (TE e TUSD confirmados) e a estimativa da seção 2 (Fio B), deixando claro ao usuário final que o valor do Fio B é estimado (30% do TUSD), não oficial.
2. **Se o usuário fornecer o percentual real da Tabela 4** da Resolução (ver seção 1.3), refazer os cálculos da seção 7 substituindo a fórmula do Fio B pela fórmula direta:
   ```
   Custo_com_sistema(N) = TUSD_aplicação(N) × (1 − %_TUSD_compensado(N)) × Geração_anual
                          + TE_aplicação(N) × (1 − %_TE_compensado(N)) × Geração_anual
   ```
   usando os percentuais reais da Tabela 4 em vez da estimativa de Fio B.
3. **Recalcular a partir de 2029 em diante** assim que a ANEEL publicar a regra definitiva (Art. 17 da Lei 14.300) — atualmente assumida como 90% flat, mas isso é provisório.
4. **Usar a fórmula de geração exatamente como documentada na seção 6** — não multiplicar por eficiência de inversor ou eficiência de micro-inversor, a menos que o parâmetro técnico do sistema mude essa premissa.
5. **Sempre reajustar a tarifa e o Fio B-base pelo índice "Reajuste Energia"** do sistema (8,2% a.a., conforme parâmetro financeiro do ERP da PIENG) — não usar inflação geral (4,5%) para esse fim, pois o reajuste de energia historicamente supera a inflação.
6. Ao apresentar qualquer gráfico derivado deste documento a um cliente final, **incluir a ressalva sobre a estimativa do Fio B** e sobre a indefinição pós-2029, para não passar uma falsa impressão de precisão absoluta em um cálculo que tem componentes estimados.

---

## 9. Histórico de decisões e limitações conhecidas (registro de auditoria)

- ✅ TE e TUSD (Equatorial GO, B1 Residencial Convencional, sem tributos) — **confirmados por fonte primária oficial (ANEEL)**.
- ⚠️ Fio B isolado — **não confirmado por fonte primária**; usada estimativa de mercado (30% do TUSD).
- ⚠️ Tabela 4 da Resolução (percentuais reais de compensação SCEE) — **extraída mas com colunas desalinhadas**; não utilizada por falta de confiabilidade na extração.
- ✅ Cronograma legal do Fio B (Lei 14.300, Art. 27) — **confirmado por múltiplas fontes jornalísticas e do setor, todas concordantes**: 15/30/45/60/75/90% de 2023 a 2028.
- ⚠️ Regra pós-2029 — **indefinida pela ANEEL**; assumido 90% flat como piso conservador.
- ✅ Fórmula de geração e parâmetros técnicos/financeiros — **extraídos diretamente das telas do ERP da PIENG** (screenshots fornecidos pelo usuário), não são estimativas.
