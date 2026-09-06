# Roadmap — Consultor (próxima linha / V4)

Referência de UX: tabelas do **V3** (`proposta-auto`, `orcamento-base`) ficaram mais claras — marca curta, selects, qtd editável, recalc por card. O **Consultor** (`/admin/orcamentos/[id]/consultor` + `OrcamentosComparisonTable`) ainda é o fluxo “manual / comparação comercial” e deve herdar o padrão sem copiar o kit SQLite inteiro.

## Gap atual (Consultor vs V3)

| Aspecto | V3 hoje | Consultor hoje |
|--------|---------|----------------|
| Marca no card/tabela | Tag `marca` + `resolveMarcaCurtaCard` | Campo livre; risco de “MODULO”/genérico |
| Edição de equipamento | Select mód/inv + qtd + Recalcular kit | Inputs soltos (marca/qtd/pcusto) sem catálogo |
| Precificação | `precificarComercialV2` unificada | `useConsultorConfig` + processor (paralelo OK, alinhar fatores) |
| Origem dos dados | SQLite kit + bridge | Proposta Supabase / localStorage |
| Status workflow | — | Aprovar / rejeitar (manter) |
| Visual tabela | Compacta, colunas Nome/Qtd/Preço | Comparativa larga com muitas colunas |

## Fases sugeridas

### Fase A — Paridade visual / marca (rápido)
1. Usar `resolveMarcaCurtaCard` / `marcaCurtaEquipamento` na tabela do consultor e no modal “adicionar”.
2. Colunas: **Marca + potência** (como cards “Todos os Orçamentos”), não nome genérico.
3. Ordenar linhas por menor PIX / menor payback (toggle), no espírito do sort por preço do V3.
4. Remover ruído de `console.log` em produção no `consultor.tsx`.

### Fase B — Edição assistida (médio)
1. Opcional: quando cliente veio do V3, oferecer select de módulo/inversor do catálogo CD (read-only preço) sem obrigar SQLite no consultor.
2. Recalcular **só performance/preços** da linha ao mudar qtd/potência (já tem engine; UX tipo “Recalcular linha”).
3. Destacar melhor payback / melhor cobertura com o mesmo padrão visual dos cards V3.

### Fase C — Unificação comercial (médio/alto)
1. Uma fonte de fatores: HSP, tarifa, pdespesa, desconto PIX, 12×/18× — consultor lê as mesmas configs do admin (`/api/admin/config`).
2. Bridge explícito: “Abrir no Consultor” a partir da proposta-auto já com `marca_*` e pcusto corretos.
3. Persistência: preferir Supabase orçamentos; localStorage só rascunho.

### Fase D — Scraping / marcas novas
1. Mesmo contrato da tag `marca` (`V3_MARCA_TAG_SCRAPING.md`).
2. Consultor nunca inventa marca pelo first-token do nome.

## Fora de escopo (não misturar)
- Trocar o consultor pelo V3 kit engine.
- Expor markup/pdespesa/juros no HTML do cliente (`RESTRICOES_CLIENTE.md`).
- Merge em `clean-main` a cada WIP — trabalhar em **branch temp / V4**, merge consolidado.

## Branch
- Trabalho: `v4-consultor` (ou temp) a partir de `clean-main` pós-v2.4.13.
- Produção: só após A+B estáveis e smoke no fluxo cliente → consultor → gerar proposta.
