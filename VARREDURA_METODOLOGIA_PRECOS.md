# Varredura: alinhamento à nova metodologia de preços

**Data:** 20/02/2025  
**Metodologia:** Opção B (12x no cartão) + valor riscado em vermelho + texto "Promoção de … para …".

---

## 1. Resumo da varredura

Foi feita uma varredura no código e templates para garantir que **todas** as ações (gerar, editar, salvar, salvar como, consultor, admin, fallback e templates legados) usem:

- **Rótulo 12x:** "12x no cartão" (nunca "12x S/Juros" ou "12x sem juros").
- **Valor riscado:** texto "Promoção de R$ [valor riscado] para R$ [valor atual]", com o valor riscado em vermelho, fonte maior e riscado.

---

## 2. Correções feitas nesta varredura

| Arquivo | Ajuste |
|--------|--------|
| `src/pages/api/gerar-proposta.ts` | Cabeçalho da tabela no **fallback** (quando o template falha): `<th>12x S/Juros</th>` → `<th>12x no cartão</th>`. |
| `src/data/knowledge/templates/proposta_template.html` | Sistema 01, 02 e 03: price-old com "Promoção de … para …" + span `.valor-riscado`; "12x:" → "12x no cartão:". |
| `src/data/knowledge/templates/proposta_template_v2.html` | Mesmo padrão para sistemas 01, 02 e 03. |
| `src/data/knowledge/templates/proposta_template_v3_pnl.html` | Propostas 01–05: price-old com "Promoção de … para …" + `.valor-riscado`; "12x:" → "12x no cartão:"; CSS `.price-old` e `.valor-riscado` (vermelho, maior, riscado só no valor antigo). |

*(As alterações anteriores já haviam coberto: pieng_proposal_template.html, templateEngine.ts, templateEngineVariants.ts, templateEngine.backup.ts, ComparisonTable.tsx, gerador-rapido.tsx, SystemCard.tsx, globals.css e o bloco principal de preços em gerar-proposta.ts.)*

---

## 3. Fluxos que já estavam alinhados (após correções)

| Fluxo | Como gera o HTML | Alinhado? |
|-------|-------------------|-----------|
| **Gerador Rápido → Salvar / Salvar como** | Chama `/api/gerar-proposta` → `generateTemplateHtmlPadrao` / `generateTemplateHtmlResultados` (templateEngine) | ✅ Sim |
| **Admin → Gerar proposta** | `src/pages/api/admin/gerar-propostas/[clienteId].ts` usa o mesmo templateEngine | ✅ Sim |
| **Consultor → Gerar proposta** | `src/pages/api/consultor/gerar-proposta.ts` usa `generateTemplateHtmlResultados` | ✅ Sim |
| **Página da proposta (`/proposta/[slug]`)** | Se vier **dados** (Supabase): renderiza com React (SystemCard, ComparisonTable) já atualizados. Se vier **HTML direto**: conteúdo gerado na hora do save (já com a nova metodologia em novos saves) | ✅ Sim |
| **Fallback da API gerar-proposta** | Se o template falhar, usa HTML inline da própria API; a tabela desse HTML foi corrigida para "12x no cartão" | ✅ Sim |
| **Processar modular / processar modular simples** | Usam a classe antiga `TemplateEngine` com `proposta_template.html` (e variantes). Templates legados foram atualizados para "Promoção de … para …" e "12x no cartão" | ✅ Sim |

---

## 4. Arquivos de proposta já salvos (HTML estático)

Os arquivos em:

- `src/data/clientes/*/proposta_*.html` e `proposta_resultados_*.html`
- `public/propostas/**/*.html`

foram gerados **antes** das mudanças. Eles continuarão exibindo "12x sem juros" e "De R$ …" até que a proposta seja **regenerada** (por exemplo: editar no Gerador Rápido e salvar de novo, ou gerar proposta novamente pelo admin/consultor). Não é necessário alterar esses HTMLs manualmente.

---

## 5. Checklist final

- [x] Template principal PIENG: rótulo 12x e valor riscado (promoção de/para, vermelho).
- [x] templateEngine.ts e templateEngineVariants.ts: cartões e tabelas.
- [x] templateEngine.backup.ts: idem.
- [x] API gerar-proposta: bloco principal de preços e **fallback** (tabela 12x).
- [x] ComparisonTable.tsx e SystemCard.tsx (React).
- [x] gerador-rapido.tsx: tabela e legenda.
- [x] Templates legados: proposta_template.html, proposta_template_v2.html, proposta_template_v3_pnl.html.
- [x] globals.css: classes pieng para valor riscado.

Com isso, **editar, salvar, salvar como e demais ações** que geram ou exibem proposta ficam alinhados à nova metodologia.
