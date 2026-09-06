# Print / PDF nas propostas

Regras portadas do mock `.temp/proposta_andreia-jorge-neto-05-09-2026-alt.html` para o CSS canônico `public/styles/proposta-print.css` (+ `chartGenerator` / `ProjecaoGeracaoChart`).

## Comportamento

| Situação | Comportamento |
|----------|----------------|
| Tela (mobile) | Fundo temático ok; gráfico compacto (toque no mês) |
| `@media print` | Sem fundo quadriculado/padrão; gráfico 12 meses completo; CTA/WhatsApp/pay ocultos |
| `body.proposta-pdf-mode` (`?pdf=1`) | Mesmas regras — cobre headless que ignora `print` |
| Quebras | `page-break-inside: avoid` em cards, linhas de sistema, notas, gráficos, tr de tabela |
| Tabela larga | Hint de scroll só na tela (`.table-scroll-hint` / `.annex-scroll-hint`) |

## Arquivos

- `public/styles/proposta-print.css` — fonte da verdade print/PDF
- `src/lib/chartGenerator.ts` — CSS + `isCompleto()` considera pdf-mode/print
- `src/components/ProjecaoGeracaoChart.tsx` — React: força modo completo em print/pdf
- `src/lib/propostaPdf.ts` — injeta `proposta-pdf-mode`

## Nota

KPIs Otimista/Pessimista no gerador usam faixa PR 72–80%, não mês pico/vale (mesmo que mocks em `.temp` ainda mostrem Out/Jun).
