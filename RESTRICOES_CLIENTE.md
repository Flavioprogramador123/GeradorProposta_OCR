# Restrições — o que NÃO pode ir ao cliente

Regra permanente do PIENG Propostas. Vale para HTML público, `/proposta/[slug]`, PDF, WhatsApp e qualquer card gerado.

## Nunca expor ao cliente

1. **Mecânica interna de precificação**
   - Que “à vista” = total das 12× no cartão
   - Que há juros/taxa da **maquininha embutidos**
   - Multiplicadores, taxa % a.m., markup, pdespesa, custo SOOLLAR, margem
2. **Dados de marketing/estratégia comercial**
   - Como a % do PIX é calibrada
   - Premissas de “âncora” PIX vs cartão
   - Textos tipo “total = à vista” sob a parcela
3. **Infra / operação**
   - Credenciais, paths SQLite, dumps de captura, estoque interno de CD misturado

## O que PODE aparecer no card do cliente

- Preço **PIX**, **à vista**, parcelas **12× / 18×** (valores finais)
- Tag de economia tipo “Economize X% no PIX” (benefício, sem explicar a fórmula)
- Geração, cobertura, payback, TIR, specs do kit
- Contato da empresa / validade da proposta

## Onde a mecânica pode existir

Somente **admin** (`/admin/configuracoes`, consultor interno, código, VERSION/changelog técnico).

## Checklist ao alterar templates

- [ ] `SystemCard.tsx`
- [ ] `templateEngine.ts` / `templateEngineVariants.ts`
- [ ] HTML gerado em `gerar-proposta` / consultor
- [ ] Modal “Outras formas de pagamento” — sem explicar maquininha/juros embutidos
