# Tag de marca (scraping → sistema)

Contrato para o módulo V3 / propostas. **Fonte preferida** da marca no card admin e no gerador: campo explícito `marca` — **não** depender de cortar o nome comercial.

## Fluxo desejado (web scraping)

1. Scraper / agente captura o produto (nome, preço, estoque, CD).
2. **Filtra e normaliza a marca** na origem (regex / lista / LLM).
3. Grava no catálogo V3 o campo **`equipamentos.marca`** (tag curta: `TSUN`, `RENEPV`, `SAJ`, `DEYE`, …).
4. O sistema **absorve a tag** sem reparsear o título:
   - `AlternativaProposta.marca_modulo` / `marca_inversor`
   - bridge → `marca_modulo` / `marca_inversor` no gerador
   - card “Todos os Orçamentos” → `resolveMarcaCurtaCard({ marca })`

## Prioridade de resolução

1. **Tag `marca`** (catálogo / scraping) — canônica  
2. Parse do nome completo (`MODULO 680W RENEPV…` → `RENEPV`) — fallback  
3. Hint no SKU (`MOD-AUTO-RENEPV-680`) — último recurso  

## O que NÃO fazer

- Gravar `marca = "MODULO"` ou `"INVERSOR"` (primeira palavra do nome).
- Inventar regras de truncamento de UI para cada marca nova — novas marcas vêm na tag.

## Onde está no código

| Camada | Campo |
|--------|--------|
| SQLite V3 | `equipamentos.marca` |
| Import scrape | `importCatalog.ts` → `inferirModuloDoNome` / `marcaHint` (hoje); futuro = tag do agente |
| Proposta auto | `montarAltFromKit` → `marca_modulo` / `marca_inversor` |
| Bridge | `toGerador.marcaFromNome(marcaTag, nome, sku)` |
| Card admin | `resolveMarcaCurtaCard` |

## Novas marcas

Basta o scraping enviar `marca: "NOVA_MARCA"`. Lista hardcoded em `importCatalog` é só **fallback** enquanto o agente não manda a tag.
