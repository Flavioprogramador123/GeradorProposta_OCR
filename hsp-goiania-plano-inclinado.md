# Irradiação Solar — Goiânia, GO (Plano Inclinado)

## Fonte
SunData / CRESESB — Centro de Referência para Energia Solar e Eólica Sérgio Brito (CEPEL)

**Estação:** Goiânia
**Município:** Goiânia, GO - BRASIL
**Latitude:** 16,701° S
**Longitude:** 49,349° O
**Distância do ponto de referência** (16,67° S; 49,25° O): 11,1 km

## Dados — Irradiação solar diária média mensal [kWh/m².dia]

| Ângulo              | Inclinação | Jan  | Fev  | Mar  | Abr  | Mai  | Jun  | Jul  | Ago  | Set  | Out  | Nov  | Dez  | Média | Delta |
|----------------------|------------|------|------|------|------|------|------|------|------|------|------|------|------|-------|-------|
| Plano Horizontal      | 0° N       | 5,48 | 5,53 | 5,17 | 5,04 | 4,79 | 4,59 | 4,76 | 5,68 | 5,56 | 5,60 | 5,40 | 5,50 | 5,26  | 1,09  |
| Ângulo igual à latitude | 17° N    | 5,05 | 5,29 | 5,23 | 5,48 | 5,57 | 5,55 | 5,67 | 6,42 | 5,79 | 5,45 | 5,02 | 5,01 | 5,46  | 1,41  |
| **Maior média anual** | **18° N** | **5,01** | **5,27** | **5,22** | **5,49** | **5,61** | **5,59** | **5,71** | **6,45** | **5,79** | **5,43** | **4,99** | **4,97** | **5,46** | **1,48** |
| Maior mínimo mensal   | 10° N      | 5,26 | 5,43 | 5,25 | 5,34 | 5,29 | 5,19 | 5,34 | 6,17 | 5,74 | 5,55 | 5,21 | 5,24 | 5,42  | 0,97  |

> A linha **"Maior média anual"** (inclinação 18°N) é a referência recomendada para dimensionamento padrão de sistemas fotovoltaicos conectados à rede — maximiza a geração anual total. Use "Maior mínimo mensal" (10°N) apenas em projetos onde o fornecimento contínuo é crítico (ex: sistemas isolados, backup).

## Metadados para cálculo de geração

```
estado: GO
cidade: Goiânia
fonte: SunData/CRESESB
angulo_referencia: Maior média anual (18°N)
unidade: kWh/m².dia (HSP)
hsp_mensal:
  jan: 5.01
  fev: 5.27
  mar: 5.22
  abr: 5.49
  mai: 5.61
  jun: 5.59
  jul: 5.71
  ago: 6.45
  set: 5.79
  out: 5.43
  nov: 4.99
  dez: 4.97
hsp_media_anual: 5.46
dias_por_mes:
  jan: 31
  fev: 28
  mar: 31
  abr: 30
  mai: 31
  jun: 30
  jul: 31
  ago: 31
  set: 30
  out: 31
  nov: 30
  dez: 31
```

---

## Instrução para a IA gerar o gráfico

Ao processar este arquivo, a IA deve:

1. **Extrair** os 12 valores mensais de `hsp_mensal` (kWh/m²/dia), na linha "Maior média anual".
2. **Perguntar ao usuário**, se ainda não informado:
   - Potência do sistema em kWp
   - Performance Ratio (PR) — padrão sugerido: 0,80
3. **Calcular a geração mensal estimada** com a fórmula:

   ```
   Geração_mês (kWh) = HSP_mês × kWp × PR × dias_do_mês
   ```

   Usando os valores de `dias_por_mes` listados acima.

4. **Gerar um gráfico de barras** (eixo X = meses Jan–Dez, eixo Y = kWh gerados) com o resultado mensal.
5. **Exibir também**:
   - Geração anual total (soma dos 12 meses)
   - Mês de maior e menor geração
   - Variação percentual entre pico e vale: `(máximo - mínimo) / máximo × 100`
6. **Não inventar dados de HSP** — usar exclusivamente os valores da tabela acima. Se o usuário pedir dados de outro município/estado, sinalizar que este arquivo cobre apenas Goiânia/GO e que novos dados de HSP devem ser obtidos do SunData/CRESESB antes de gerar o gráfico.
