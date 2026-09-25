# Registro — Maquininha de Cartão Ton (até 21x) + fallback PagSeguro

> Última atualização: 2026-09-22
> Status: ✅ **funcional e validado** (proposta emite 21x com a tabela da Ton)

Este documento registra **tudo** que foi feito para a IA (Cursor/Claude) entender o
contexto da nova maquininha de cartão da PIENG. Leia isto antes de mexer em
precificação de cartão, proposta ou configurações.

---

## 1. Contexto do negócio

- A PIENG contratou uma **maquininha Ton** que parcela **até 21x**.
- O recebimento escolhido é de **1 dia útil** (não é "Na Hora").
- A **faixa de faturamento atual** é a **primeira: até R$ 20 mil/mês**.
  Quando vender mais de R$ 20 mil/mês, a faixa sobe e basta **alterar nas configurações** (> `/admin/configuracoes`) — sem mexer em código.
- O **PagSeguro continua como plano B**: se a Ton der problema, basta trocar o
  `adquirente` nas configurações e o sistema volta para a taxa manual do PagSeguro (18x).

⚠️ Regra do cliente (`RESTRICOES_CLIENTE.mdc`): na proposta **nunca** explicar
fórmulas, juros, taxa da maquininha, "à vista = total 12x", markup ou custo.
O cliente só vê **valores finais** + a **tag de economia no PIX** (sem fórmula).

---

## 2. Fonte de dados — `tontaxa.json`

Arquivo na **raiz do projeto** (e cópia em `public/tontaxa.json` para o browser).

Estrutura: um objeto `{ "tabela": [ { ...linhas... } ] }`. Cada linha tem:

| Campo | Exemplo | Significado |
|---|---|---|
| `Modalidade` | `"Parcelado em 21x"` / `"Débito"` / `"Crédito à vista"` | tipo/parcelas |
| `Todas as faixas Na Hora` | `"27,81%"` | taxa se receber na hora (não usado) |
| `Até R$20mil 1 dia útil` | `"20,64%"` | **faixa 0 — usada hoje** |
| `R$20mil até R$40mil 1 dia útil` | `"17,87%"` | faixa 1 |
| `R$40mil até R$80mil 1 dia útil` | `"17,19%"` | faixa 2 |
| `Acima de R$80mil 1 dia útil` | `"16,50%"` | faixa 3 |

### ⚠️ Pegadinha do arquivo

O valor da linha **"Parcelado em 20x"** na faixa "Até R$20mil 1 dia útil" veio
**sem o `%`** (`"20,00"` em vez de `"20,00%"`). O parser falhava nessa linha.
A correção foi aplicada no JSON. **Se voltar a quebrar, verifique isso primeiro.**

---

## 3. Arquitetura do código

```
tontaxa.json (raiz + public/)
        │
        ├─► src/lib/maquininha/tonTabela.ts   ← parsing puro (sem fs)
        │       parseTaxaTon / parseTabelaTon / parcelasDaModalidade /
        │       jurosParcelaMensal / multiplicadorFromTotal / PRAZOS_RECEBIMENTO / FAIXAS_TON
        │
        ├─► src/lib/maquininha/tonTotaisServer.ts   ← SERVER-ONLY (lê o fs)
        │       resolverTonTotaisServer(prazo, faixa) → LinhasTon | null
        │
        ├─► src/lib/maquininha/taxaAdapter.ts   ← escolhe a fonte
        │       resolverTaxaCartao({ adquirente, tonTotais, … })
        │       ADQUIRENTE_PADRAO = 'ton' | PARCELAS_REFERENCIA = 12
        │
        └─► src/lib/maquininha/faturamento.ts   ← ponte com as configurações
                resolverTaxaCartaoDaConfig(config)
                carregarTabelaTonBrowser()   ← usa /tontaxa.json no browser
```

### Regra de ouro sobre `fs` (aprendida na dor)

`src/utils/configuracoes.ts` é importado por **páginas do cliente**
(`proposta/[slug].tsx`, `admin/configuracoes.tsx`, `templateEngine.ts`…). Se ele
importar `fs` direto, o **build quebra** ("Module not found: fs").

**Solução adotada**: `fs` fica isolado em `tonTotaisServer.ts`, que **nenhuma
página do cliente importa**. A ligação é feita por `import()` dinâmico dentro de
`completarTonTotais()`:

```ts
async function completarTonTotais(config) {
  if (config.tonTotais?.keys().length) return config;
  if (typeof window !== 'undefined') return config;   // browser usa /tontaxa.json
  const { resolverTonTotaisServer } = await import('@/lib/maquininha/tonTotaisServer');
  const totais = await resolverTonTotaisServer(config.prazoRecebimento, config.faixaFaturamento);
  if (totais) config.tonTotais = totais;
  return config;
}
```

> ❌ **Não recriar** `tonTabelaServer.ts` / `tonTabelaFile.node.ts` com
> `require('...node.ts')`. O Next **não compila** arquivos `.node.ts` para
> `.next/server`, então o require falhava em runtime e caía silenciosamente no
> fallback PagSeguro. Esses arquivos foram **removidos**.

---

## 4. Configurações da maquininha

Persistidas em **Supabase** (`configuracoes`) e espelhadas em
`src/data/sistema/configuracoes.json` (dev).

| Chave | Valores | Padrão atual |
|---|---|---|
| `adquirente` | `'ton'` \| `'pagseguro'` | `ton` |
| `prazoRecebimento` | `'naHora'` \| `'umDiaUtil'` | `umDiaUtil` |
| `faixaFaturamento` | `0` \| `1` \| `2` \| `3` | `0` (até R$ 20 mil) |
| `taxaMensalPagSeguro` | número (% a.m.) | `1.3` |
| `taxaCartaoMensal` | número (% a.m.) — legado | `1.51` |
| `tonTotais` | `LinhasTon` (parcela → total %) | resolvido em runtime |

- **Seed/migração**: `scripts/seed-maquininha-config.ts`
- **SQL auxiliar**: `sql/maquininha_configuracoes.sql`

`GET /api/admin/config` **sempre** devolve esses campos, mesmo que o banco ainda
não os tenha (`comDefaultsMaquininha`) — e agora também **resolve `tonTotais`** no
servidor antes de responder, para o admin exibir a tabela correta no browser.

---

## 5. Como a precificação funciona

1. **PIX** é a base (preço cheio).
2. **À vista** = total de **12 parcelas**.
3. As demais parcelas saem do **total %** da tabela da Ton:
   `total% → multiplicador = total/100` (ex.: 21x = `20,64%` → **1,2064**).
4. `PARCELAS_CARTAO_MAX = 21`; seletor exibido: `[3, 6, 10, 12, 18, 21]`
   (`opcoesSeletorCartao`).
5. **Fallback PagSeguro**: quando `adquirente = 'pagseguro'` (ou a tabela Ton não
   estiver disponível), o sistema volta ao cálculo de juros mensal manual
   (limite de **18x**).

### Validação real (servidor limpo, `/api/gerar-proposta`)

```
parcelas: 1 … 21
opções do seletor: [3, 6, 10, 12, 18, 21]
21x citado no HTML: true
multiplicador 21x: 1.2064   (= 20,64% da faixa "Até R$20mil / 1 dia útil")
```

Script de conferência: `scripts/check-cartao-proposta.ts`

```bash
npx tsx scripts/check-cartao-proposta.ts
```

---

## 6. Arquivos criados / alterados

### Criados
| Arquivo | Papel |
|---|---|
| `src/lib/maquininha/tonTabela.ts` | parsing + utilitários da tabela Ton |
| `src/lib/maquininha/taxaAdapter.ts` | escolha Ton × PagSeguro |
| `src/lib/maquininha/faturamento.ts` | ponte config → taxa (+ leitura browser) |
| `src/lib/maquininha/tonTotaisServer.ts` | **server-only**: lê `tontaxa.json` do fs |
| `scripts/check-cartao-proposta.ts` | valida precificação/parcelas |
| `scripts/check-ton-tabela.ts` | valida parsing do JSON |
| `scripts/seed-maquininha-config.ts` | semeia as configs da maquininha |
| `scripts/check-proposta-cartao.ts` | gera proposta via HTTP e inspeciona o HTML |
| `sql/maquininha_configuracoes.sql` | DDL/upsert das configs |
| `docs/REGISTRO_MAQUININHA_TON.md` | **este arquivo** |

### Alterados
| Arquivo | O que mudou |
|---|---|
| `src/lib/tabelaJurosCartao.ts` | `TabelaCartao`, `buildTabelaCartao`, `buildTabelaCartaoFromParcelaPercent`, max 21x, campos `p21x_*` |
| `src/utils/configuracoes.ts` | campos novos na config + `completarTonTotais` (fs isolado) |
| `src/pages/api/admin/config.ts` | devolve defaults da maquininha + resolve `tonTotais` no GET |
| `src/pages/api/gerar-proposta.ts` | resolve `TabelaCartao` e persiste `config`/`cartao` na proposta |
| `src/lib/propostaOrcamentoProcessor.ts` | propaga `p21x_parcela` / `p21x_total` |
| `src/lib/templateEngine.ts` + `templateEngineVariants.ts` | injeta o modal com a `TabelaCartao` resolvida |
| `src/components/FormasPagamentoModal.tsx` | recebe `tabela` / `jurosParcelaPercent`; renderiza até `maxParcelas` |
| `src/components/SystemCard.tsx` | repassa `cartao` / `jurosParcelaPercent` |
| `src/pages/admin/configuracoes.tsx` | selects de adquirente/prazo/faixa + tabela dinâmica |
| `src/pages/gerador-rapido.tsx` | usa `buildTabelaCartao` + `calcularPrecosDePixComTabela` |
| `src/pages/proposta/[slug].tsx` | monta a `TabelaCartao` do cliente e passa ao card |
| `src/lib/types.ts` | `PropostaData` ganhou `slug`, `config`, `cartao` |
| `tontaxa.json` | 21x + correção do `%` faltante na linha 20x |

### Removidos (não recriar)
- `src/lib/maquininha/tonTabelaServer.ts`
- `src/lib/maquininha/tonTabelaFile.node.ts`

---

## 7. Armadilhas encontradas (para não repetir)

1. **`fs` no bundle do cliente** → isolar em módulo server-only. Módulos
   `.node.ts` **não** são compilados pelo Next.
2. **Cache do dev server** → alterações em `configuracoes.json` / `tontaxa.json`
   podem exigir **reiniciar** o `npm run dev`.
3. **`%` faltando no JSON** → o parser retornava `null` para a linha e a parcela
   sumia silenciosamente.
4. **Alias `@/` dentro de `eval('require')`** → não resolve fora do webpack; usar
   caminho absoluto com `process.cwd()`.
5. **Testar pelo script, não só pelo admin** → o admin pode mascarar o problema
   com defaults; o teste que vale é gerar a proposta e conferir o HTML.

---

## 8. Como testar (roteiro)

```powershell
# 1. Parsing da tabela
npx tsx scripts/check-ton-tabela.ts

# 2. Precificação (Ton 21x + fallback + faixas)
npx tsx scripts/check-cartao-proposta.ts

# 3. Ponta a ponta: gera proposta e inspeciona o modal no HTML
npm run dev                                  # em outro terminal
npx tsx scripts/check-proposta-cartao.ts http://localhost:3000
```

Esperado no passo 3: `21x citado no HTML: true` e seletor com `21`.

Para testar o **PagSeguro**, mude `adquirente` em `/admin/configuracoes` para
`pagseguro` e gere de novo — o seletor deve parar em **18**.
