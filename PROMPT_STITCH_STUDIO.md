# Prompt para Stitch Studio – App “PIENG Propostas Solares”

> Cole este prompt no Stitch Studio para gerar um app completo inspirado no PIENG Propostas. Ele descreve arquitetura, principais fluxos e requisitos obrigatórios. Ajuste nomes de variáveis/chaves conforme seu ambiente.

---

## Objetivo

Construir um aplicativo web para gerar propostas solares com:
- Painel admin protegido
- Integração Supabase (clientes, propostas, configurações)
- Geração de proposta HTML/JSON com análise financeira
- Fluxo rápido (`/gerador-rapido`) e CRUD completo (`/admin`)
- Deploy em Vercel

## Stack desejada

- Next.js 13.5.x com App Router desabilitado (usar `/pages`)
- TypeScript + Tailwind CSS
- Supabase JS SDK (`@supabase/supabase-js`)
- Python calculator opcional (mockar caso não tenha serviço real)
- Ambiente híbrido: Supabase primário, filesystem como fallback local

## Requisitos Funcionais

1. **Autenticação simples** (auth básica ou “admin key”) para `/admin`.
2. **CRUD de clientes**:
   - Formulário em `/admin/novo-cliente`
   - Persistir em Supabase (`clientes`) e, em dev, criar pasta `src/data/clientes/[slug]/`.
3. **Gerador rápido** (`/gerador-rapido`):
   - Inputs: cliente, consumo, YAML com orçamentos
   - Faz POST para `/api/gerar-proposta` → salva HTML/JSON em Supabase + filesystem
4. **Dashboard `/admin`**:
   - Cards de estatísticas (total clientes, propostas geradas)
   - Lista consumidores de `/api/admin/clientes`
   - Badge visível com versão (`v2.2.4`)
5. **Orçamentos**:
   - Página `/admin/orcamentos` lista todos (busca Supabase)
   - `/admin/orcamentos/[clienteId]` mostra orçamentos específicos
6. **Configurações**:
   - `/admin/configuracoes` lê/salva via `/api/admin/config`
   - Endpoint persiste em Supabase (tabela `configuracoes`, chave `sistema_config`) com fallback `/tmp` local
7. **APIs obrigatórias**:
   - `/api/admin/clientes` (Supabase-first, fallback filesystem)
   - `/api/admin/clientes/[clienteId]` (GET/PUT/DELETE com Supabase + fallback)
   - `/api/admin/criar-cliente`
   - `/api/admin/orcamentos-todos`
   - `/api/admin/config`
   - `/api/gerar-proposta`
   - `/api/propostas-publicas`
   - Diagnóstico: `/api/test-supabase`, `/api/test-proposta-slug`, `/api/test-cliente-padrao`

## Regras de Persistência

- **Produção (Vercel)**:
  - Necessário `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
  - Todas as escritas devem ir para Supabase (filesystem é read-only).
- **Desenvolvimento**:
  - Manter estrutura local em `src/data/clientes/[slug]/`.
  - HTML de propostas em `public/propostas/orçamento/clientes/`.
  - `/api/admin/config` salva em `src/data/sistema/configuracoes.json`.

## Estrutura Esperada

```
src/
 ├─ pages/
 │   ├─ admin/
 │   │   ├─ index.tsx
 │   │   ├─ novo-cliente.tsx
 │   │   ├─ configuracoes.tsx
 │   │   └─ orcamentos/[clienteId].tsx
 │   ├─ gerador-rapido.tsx
 │   ├─ proposta/[slug].tsx
 │   └─ api/
 │       └─ admin/...
 ├─ lib/
 │   ├─ supabase.ts
 │   ├─ templateEngine.ts
 │   ├─ python-calculator.ts (stub)
 │   └─ calculadorPrecosUnificado.ts
 └─ data/
     └─ clientes/
```

## Template Engine

- Funções `generateTemplateHtmlPadrao` e `generateTemplateHtmlResultados`.
- Detectar `process.env.VERCEL || process.env.NETLIFY` para decidir entre `<link>` (prod) e inline CSS (dev).
- HTML final salvo em Supabase (`html_gerado`) e em `public/propostas/...`.

## Ambiente & Scripts

- `package.json` scripts:
  - `dev`: `next dev -H 0.0.0.0`
  - `build`, `start`, `lint`
- `vercel.json` com `"installCommand": "npm install --legacy-peer-deps"`.
- `env.example` com chaves Supabase obrigatórias.

## Documentação mínima

Gerar/atualizar arquivos:
- `README.md` com versão atual, fluxo e URLs.
- `VERSION.md` com changelog (última versão v2.2.4).
- `CLAUDE.md` (ou equivalente) explicando arquitetura, troubleshooting e comandos.
- Novo `PROMPT_STITCH_STUDIO.md` (este arquivo) para referência futura.

## Critérios de Aceite

- Vercel build passa sem erros (Next 13.5.6, SWC ok).
- `/admin` mostra badge `v2.2.4`.
- `/api/admin/clientes` responde `source: "supabase"` em produção.
- `/api/admin/config` salva e lê do Supabase; sem variáveis mostra erro claro.
- `/api/test-cliente-padrao` confirma se cliente/proposta existem.
- Deploy automático via push em `clean-main`.

---

Use este prompt como blueprint completo para o Stitch Studio reproduzir o app. Mantém os fluxos críticos e evita regressões na integração Supabase + Next.js. Ajuste endpoints extras conforme necessário. Boa criação! 🚀

