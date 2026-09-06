# V3 — Proposta automática: edição de kit por card

Documento de fechamento **v2.4.12** (05/09/2026).

## O que ficou em produção

Após **Dimensionar** em `/admin/v3/proposta-auto`:

1. Cada card mantém a tabela **Itens do orçamento**.
2. Nas linhas **módulo** e **inversor/micro**:
   - coluna **Nome** = select do catálogo do CD
   - coluna **Qtd** = editável
3. Botão **Recalcular kit** recalcula **somente aquele card** via `POST /api/v3/orcamentos-base` (`preview: true`, `autoComplementos: true`).
4. Os demais cards **não** são redimensionados (não usa `incluir_auto: false` em massa — isso colapsava para 1 alt).
5. PIX comercial atualizado com `precificarComercialV2` + frete do card.
6. Bridge para Proposta manual usa o estado atualizado dos cards.

## Defaults de topologia

- Checkboxes **micro** e **string** começam **marcados** (gera as duas famílias conforme a faixa / `maxAlternativas`).

## DC/AC (motor)

- kWp ≤ kW × 1,40 (+tol → teto 1,45); subcarga mín. 0,50.
- Híbridos fora da lista principal do auto; sob demanda no select.

## Layout proposta ao cliente (mesmo release)

- Layout **clássico** (sem skin-alt no pipeline).
- Skins em `public/styles/_estudo/`.
- Header: marca PIENG em destaque; nome do cliente menor (ajustável).

## Próxima linha (V4)

Melhorias futuras: branch **temp / V4** (não `clean-main`), merge só quando consolidado — evita regressão do que está funcionando (lição 05/09/2026).

## Arquivos-chave

- `src/pages/admin/v3/proposta-auto.tsx` — UI edição + recalc por card
- `src/modules/v3/calc/dcAcRatio.ts` / `propostaAuto.ts` — DC/AC
- `src/modules/v3/bridge/comercial.ts` — PIX = gerador
- `src/lib/propostaTemplatePolicy.ts` — templates produção vs estudo
