# Análise: divergência entre À vista, PIX e 12x sem juros

## Onde a lógica está

- **API principal:** `src/pages/api/gerar-proposta.ts` → função `calcularPrecos(totalFinal)`
- **Admin gerar-propostas:** `src/pages/api/admin/gerar-propostas/[clienteId].ts`
- **Configuração:** `configuracoes.json` → `descontoPix`, `fator12x`, `fator18x`
- **Frontend (gerador rápido):** `src/pages/gerador-rapido.tsx` (mesma fórmula)

---

## Fórmulas atuais (gerar-proposta.ts)

Entrada da função: `totalFinal` (na prática é o valor **PIX** que vem do frontend).

```ts
ppix         = totalFinal
pavista      = ppix / (1 - descontoPix)   // À vista = PIX “revertendo” o desconto
priscado     = ppix * markupParcelado
p12x_total   = ppix / fator12x           // Total 12x
p12x         = p12x_total / 12            // Parcela 12x
```

Config padrão (ex.): `descontoPix = 0,10` (10%), `fator12x = 0,88`.

---

## Exemplo numérico (PIX = R$ 50.000)

| Conceito    | Fórmula           | Valor        |
|------------|-------------------|--------------|
| **PIX**    | ppix              | R$ 50.000,00 |
| **À vista**| 50.000 / 0,9      | R$ 55.555,56 |
| **Total 12x** | 50.000 / 0,88 | R$ 56.818,18 |
| **Parcela 12x** | 56.818,18 / 12 | R$ 4.734,85 |

Na tela hoje:
- Banner: “À vista: R$ 55.555,56” e “PIX: R$ 50.000” (e desconto % sobre à vista) → coerente entre si.
- “12x S/Juros”: parcela R$ 4.734,85 e total 12x = R$ 56.818,18.

Ou seja: **o total das 12x (56.818) é diferente do valor à vista (55.555)**.

---

## Onde está a divergência

- **À vista:** preço “cheio” sem desconto PIX → R$ 55.555,56.
- **12x “sem juros”:** hoje está calculado como `PIX / fator12x` (fator 0,88 = absorver taxa de cartão), então o **total 12x** fica **maior** que o à vista.

Em geral, quando se escreve **“12x sem juros”**, o cliente entende:
- Total das 12 parcelas = preço à vista (ou pelo menos um único preço de referência).
- Parcela = (preço de referência) ÷ 12.

No sistema hoje:
- Total 12x ≠ à vista (56.818 ≠ 55.555).
- Total 12x está amarrado ao PIX e ao `fator12x`, não ao valor à vista.

Isso gera a **divergência** entre “valor à vista” e “12x sem juros”.

---

## Duas interpretações possíveis

### A) “12x sem juros” = mesmo preço do à vista (comportamento esperado pelo cliente)

- **Total 12x** = **à vista**  
  `p12x_total = pavista`
- **Parcela 12x** = à vista ÷ 12  
  `p12x = pavista / 12`

Assim, o banner e a tabela mostrariam:
- À vista: R$ 55.555,56  
- PIX: R$ 50.000 (desconto sobre o à vista)  
- 12x sem juros: 12 × R$ 4.629,63 = R$ 55.555,56 (igual ao à vista).

Mudança de lógica: **parar de usar** `p12x_total = ppix / fator12x` para o caso “12x sem juros”; usar `pavista` como base.

---

### B) “12x no cartão” com taxa (como está hoje)

- Mantém:  
  `p12x_total = ppix / fator12x`  
  (total 12x > PIX e diferente do à vista).
- Ajuste apenas de **texto**: trocar o rótulo de **“12x S/Juros”** para algo como:
  - “12x no cartão”, ou  
  - “12x (total R$ …)”,  
  para não dar a entender que o total é igual ao à vista.

Nenhuma alteração foi feita no código; este arquivo é só análise para você decidir.

---

## Resumo

| Item              | Situação atual                                                                 | Possível correção (se quiser “12x sem juros” = à vista) |
|-------------------|-------------------------------------------------------------------------------|---------------------------------------------------------|
| À vista           | ppix / (1 - descontoPix) → OK como “preço sem desconto PIX”                   | Manter                                                  |
| PIX               | ppix (com desconto) → OK                                                      | Manter                                                  |
| Total 12x         | ppix / fator12x → diferente do à vista                                        | Fazer p12x_total = pavista                              |
| Parcela 12x       | (ppix / fator12x) / 12                                                       | Fazer p12x = pavista / 12                               |
| Rótulo “12x S/Juros” | Usado mesmo com total 12x ≠ à vista                                       | Ou mudar lógica (acima) ou mudar rótulo para “12x no cartão” |

Quando você definir se a regra de negócio é (A) ou (B), dá para aplicar a alteração só na função `calcularPrecos` e nos pontos que repetem essa conta (admin, consultor, etc.), mantendo o resto da proposta igual.
