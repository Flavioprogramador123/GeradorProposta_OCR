# Precificação por R$/Wp (ponte → pdespesa)

**Status:** ideia em aberto · **piloto de UI removido** (06/09/2026)  
Motivo: a ponte `alvo − Pcusto → 40% var / 60% fixa` não fechou bem no uso real. Nova lógica a definir depois.

## Motor que permanece (inalterado)

```
pdespesa_total = fixa + (Pcusto × variável%)
PIX ≈ Pcusto + pdespesa_total
```

- **Pcusto** = preços dos produtos.
- **pdespesa** = fixa + variável (%), editável no Gerador / Consultor / V3.

## Ideia original (não em produção)

- Usuário digita R$/Wp; alvo = R$/Wp × Wp.
- Converter residual em sugestão de pdespesa (fixa/variável).
- Não substituir Pcusto nem expor a ponte no HTML do cliente (`RESTRICOES_CLIENTE.md`).

## Próximo passo

Redesenhar a regra comercial (quando houver) antes de voltar a colocar UI.
