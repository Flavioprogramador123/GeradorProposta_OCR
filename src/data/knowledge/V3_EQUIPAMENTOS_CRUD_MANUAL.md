# Equipamentos — CRUD manual ↔ Preços por CD

Página `/admin/v3/equipamentos`: cadastro manual (sem seed YAML).

## Fluxo

1. **Adicionar** equipamento (SKU, nome, marca, potência…).
2. **Editar / preços** → preencher preço (e estoque opcional) por CD.
3. Salvar → `precos_cd` com **`fonte = manual`** (visível em Preços por CD).
4. Opcional: **Publicar no Supabase** em Preços.

## Regras

- Manual: preço &gt; 0 já vale no kit (`valido_estoque`), mesmo sem estoque.
- Scrape/import: continua exigindo estoque &gt; mínimo.
- Scrape posterior no mesmo SKU pode sobrescrever o preço manual.

## API

- `GET/POST /api/v3/equipamentos`
- `GET/PATCH/DELETE /api/v3/equipamentos/[id]` — PATCH aceita `precos: [{ cdId, preco_custo, estoque }]`
