# Divergência de preço entre CDs (mesmo SKU)

## Objetivo
Após scrape/import, alertar se o **mesmo equipamento** tem preços muito diferentes entre CDs (ex.: mismatch — bateria colada em inversor).

## Regra
- Compara `precos_cd.preco_custo > 0` por `equipamento_id` em CDs ativos.
- Alerta se **máx / mín ≥ 1,4** (config: `DIVERGENCIA_RAZAO_MIN` em `divergenciaPrecos.ts`).

## Onde avisa
1. **Logo após scrape** (`POST /api/v3/captura-precos`) e **import pasta** — campo `divergencias` + texto `divergenciasResumo` no log da UI Preços.
2. Banner vermelho em **Preços por CD** (também ao carregar a página).
3. Linhas da tabela em vermelho + ⚠ no SKU.
4. **Equipamentos**: banner + coluna Preço/CD em vermelho + aviso ao editar.

## Código
- `src/modules/v3/precos/divergenciaPrecos.ts`
- APIs: `precos`, `captura-precos`, `importar-pasta-precos`, `equipamentos`
- UI: `admin/v3/precos.tsx`, `admin/v3/equipamentos.tsx`
