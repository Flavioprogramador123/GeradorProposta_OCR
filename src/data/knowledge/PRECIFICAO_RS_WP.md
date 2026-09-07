# Precificação por R$/Wp (ponte → pdespesa)

**Status:** especificação aprovada · **não implementada** (06/09/2026)  
**Objetivo:** oferecer referência comercial forte (R$/Wp) sem abandonar o motor atual `Pcusto + pdespesa`.

## Motor que permanece

```
pdespesa_total = fixa + (Pcusto × variável%)
PIX ≈ Pcusto + pdespesa_total
```

- **Pcusto** = preços dos produtos (módulo, inversor, etc.).
- **pdespesa** = parte fixa + parte variável (% sobre Pcusto).
- Gerador rápido e Consultor continuam podendo editar fixa/variável.

## Nova entrada (usuário)

- Campo **R$/Wp** digitado por experiência (sem tabela/curva automática).
- Solo / telhado: o usuário embute no valor digitado (ex.: solo → R$/Wp maior).
- Alvo de venda: `alvo = R$/Wp × potência_Wp` (ou equivalente em kWp × 1000).

## Conversão intermediária (sugestão)

```
pdespesa_sugerido = max(0, alvo − Pcusto)
variável_R$       = 40% × pdespesa_sugerido
fixa_R$           = 60% × pdespesa_sugerido
variável_%        = Pcusto > 0 ? (variável_R$ / Pcusto) × 100 : 0
```

- Preenche **sugestão** de fixa e variável; o usuário adequa se houver discrepância.
- Se `alvo ≤ Pcusto`, sugerir pdespesa 0 (ou aviso) — não forçar preço abaixo do custo.

## O que não fazer

- Não explicar ao cliente a ponte R$/Wp → pdespesa (restrições de proposta).
- Não substituir Pcusto por R$/Wp.
- Não gravar R$/Wp como única fonte de verdade no HTML/PDF do cliente.

## Onde encaixar (quando implementar)

- V3 proposta-auto / orçamento-base (antes do bridge).
- Gerador rápido / Consultor (campo + botão “Sugerir pdespesa”).
- Configurações: opcional default de R$/Wp; split 40/60 pode ser constante inicial.
