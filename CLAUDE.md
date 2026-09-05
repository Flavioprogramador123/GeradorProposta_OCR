# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PIENG-PROPOSTAS is a solar proposal generation system with AI-powered data extraction. Built with Next.js 13.5.11, it provides a complete admin interface for managing clients, processing quotes, and generating professional solar installation proposals.

**Production URL**: https://pieng-propostas.vercel.app
**Main Branch**: `clean-main`
**Deploy**: Auto-deploy on push to `clean-main`

### 🔒 Client-facing restrictions (mandatory)

See `RESTRICOES_CLIENTE.md`. **Never** put internal pricing/marketing mechanics on client proposals (HTML/PDF/cards): no “à vista = total 12×”, no “juros da maquininha embutidos”, no markup/multiplicadores/taxa a.m./custo. Client sees only final prices + PIX benefit tag. Internal rules stay in admin/code/changelog only.

---

## Development Commands

```bash
# Development
npm run dev              # Start dev server on localhost:3000
npm run build            # Production build
npm start                # Run production build locally
npm run lint             # Run ESLint

# Type checking
npx tsc --noEmit         # Check TypeScript errors without building

# Vercel deployment
git push origin clean-main           # Triggers auto-deploy
npx vercel --prod                    # Manual deploy
npx vercel logs                      # View deployment logs
```

---

## Architecture Overview

### Core Data Flow

```
1. Client Creation → Supabase (clientes table) + src/data/clientes/[slug]/
2. Quote Upload → AI Extraction → src/pages/api/admin/extract-data.ts
3. Quote Processing → Python Calculator → Financial Analysis
4. Proposal Generation → Template Engine → HTML/JSON output
5. Proposal Persistence → Supabase (propostas table) with html_gerado + dados_completos (filesystem fallback only in dev)
6. Configurações globais → Supabase (`configuracoes` table) com fallback local em `src/data/sistema/configuracoes.json`
7. Public Access → /proposta/[slug] (reads from Supabase first, then filesystem fallback)
```

**⚠️ IMPORTANT:** In production (Vercel), data MUST be saved to Supabase. Filesystem is read-only.

### Key Architectural Concepts

#### 1. **Hybrid Storage System (Supabase + Filesystem)**
- **PRODUCTION (Vercel)**: Supabase is PRIMARY storage
  - `propostas` table: Stores `html_gerado`, `dados_completos`, `slug`, `status`
  - `clientes` table: Stores client information
  - APIs prioritize Supabase queries
- **DEVELOPMENT (Local)**: Filesystem fallback
  - `src/data/clientes/[slug]/proposta.json` - Used by Next.js SSG
  - `public/propostas/orçamento/clientes/proposta_[slug].html` - Direct access
- Both must be kept in sync when generating proposals

#### 2. **Template Engine (`src/lib/templateEngine.ts`)**
- Generates HTML from `proposta.json` data
- **CRITICAL**: Detects production environment (Vercel/Netlify)
  - Development: Loads CSS from filesystem
  - Production: Uses `<link>` tags to `public/styles/*.css`
- Two template types:
  - `generateTemplateHtmlPadrao()`: Standard comparison view
  - `generateTemplateHtmlResultados()`: Results-focused view
- Variant system for different property types (residential, commercial, etc.)

#### 3. **AI Data Extraction**
The system recognizes multiple solar distributors automatically:
- **BelEnergy/PIENG**: Web quotes with WEB-XXXXXXX codes
- **SOOLLAR**: N-Plus modules, SAJ inverters
- **Canadian Solar**: HiKu6 modules, Growatt inverters
- **WEG**: WEG equipment
- Patterns defined in `src/pages/api/admin/extract-data.ts`

#### 4. **Financial Calculator (`src/lib/python-calculator.ts`)**
- Interfaces with Python backend for complex financial calculations
- Calculates: TIR (IRR), VPL (NPV), Payback, ROI
- Validates extracted data consistency

#### 5. **Configuration System**
- Primary storage: Supabase `configuracoes` table (`chave = 'sistema_config'`)
- API endpoint: `/api/admin/config`
- Fallback: `src/data/sistema/configuracoes.json` (dev) or `/tmp/configuracoes.json` (serverless fallback)
- Controls: pricing margins, discount rates, performance factors
- Editable through `/admin/configuracoes`

---

## Critical File Locations

### Pages & Routes
```
/admin                          → src/pages/admin/index.tsx
/admin/novo-cliente             → src/pages/admin/novo-cliente.tsx
/admin/orcamentos/[clienteId]   → src/pages/admin/orcamentos/[clienteId].tsx
/admin/configuracoes            → src/pages/admin/configuracoes.tsx
/proposta/[slug]                → src/pages/proposta/[slug].tsx (SSG)
/gerador-rapido                 → src/pages/gerador-rapido.tsx (Quick generator)
```

### APIs
```
/api/admin/clientes             → List all clients (Supabase + filesystem fallback)
/api/admin/criar-cliente        → Create client (MUST save to Supabase in production)
/api/admin/orcamentos-todos     → List all proposals as orçamentos (Supabase first)
/api/admin/orcamentos/[cliente] → CRUD orçamentos (GET/POST - Supabase-first)
/api/admin/orcamentos/[cliente]/[orcamentoId] → GET/PUT/DELETE orçamento específico
/api/admin/extract-data         → AI extraction from PDFs/images
/api/admin/config               → System configuration
/api/gerar-proposta             → Generate proposal HTML + JSON (saves to Supabase)
/api/propostas-publicas         → List public proposals (Supabase + filesystem)
/api/test-supabase              → Test Supabase connection
/api/test-proposta-slug         → Diagnostic API for specific proposal
/api/test-cliente-padrao        → Diagnóstico rápido para cliente/proposta em produção
```

### Core Libraries
```
src/lib/templateEngine.ts           → HTML generation engine
src/lib/python-calculator.ts        → Financial calculations
src/lib/calculadorPrecosUnificado.ts → Unified pricing calculator
src/lib/types.ts                    → TypeScript interfaces
src/lib/variantConfig.ts            → Property type variants
src/lib/supabase.ts                 → Supabase client & helper functions
src/lib/google-drive.ts             → Cloud storage integration (optional)
src/utils/orcamentosSupabase.ts     → Orçamentos Supabase utilities (resolve, map, sanitize)
```

---

## Important Development Notes

### Working with Proposals

When generating proposals:
1. **Always update both** `proposta.json` and HTML files
2. HTML goes to: `public/propostas/orçamento/clientes/proposta_[slug].html`
3. JSON goes to: `src/data/clientes/[slug]/proposta.json`
4. Use `templateEngine.ts` functions - don't manually write HTML
5. CSS files must be in `public/styles/` for production

### Production vs Development

```typescript
// Template engine automatically detects environment
const isProduction = process.env.VERCEL || process.env.NETLIFY;

if (isProduction) {
  // Use <link> tags to public CSS
  html += `<link rel="stylesheet" href="/styles/${variant}.css">`;
} else {
  // Inline CSS from filesystem
  const cssPath = path.join(process.cwd(), 'src/styles', `${variant}.css`);
  const css = fs.readFileSync(cssPath, 'utf8');
  html += `<style>${css}</style>`;
}
```

### Client Data Structure

Each client has a folder: `src/data/clientes/[slug]/`
```
[slug]/
├── proposta.json          # Complete proposal data (used by SSG)
├── cliente.json           # Basic client info
├── orcamento1.json        # Quote 1 (up to 5 quotes)
├── orcamento2.json        # Quote 2
└── uploads/               # Original PDFs/images
```

### Quote Processing Flow

1. User uploads PDF/image → `/admin/orcamentos/[clienteId]/upload`
2. File sent to `/api/admin/extract-data`
3. AI extracts: modules, inverters, prices, distributor
4. User reviews/edits → `/admin/orcamentos/[clienteId]/manual`
5. Save to Supabase (`orcamentos` table) via `/api/admin/orcamentos/[clienteId]` (POST)
   - **PRODUCTION**: Saved to Supabase `orcamentos` table
   - **DEVELOPMENT**: Fallback to `orcamento[N].json` in filesystem
6. Generate proposal → Calls `/api/gerar-proposta`
7. Python calculator validates and enriches data
8. Template engine creates HTML + updates JSON
9. Files written to both locations (Supabase + public filesystem)

### Orçamentos (Quotes) Storage

**Supabase Table: `orcamentos`**
- `id` (UUID) - Primary key
- `cliente_id` (UUID) - Foreign key to `clientes`
- `arquivo_nome` (text) - Original file name
- `fornecedor` (text) - Distributor name
- `valor_total` (numeric) - Total value
- `data_orcamento` (timestamp) - Quote date
- `componentes` (JSONB) - Modules, inverters, etc.
- `dados_extraidos` (JSONB) - Full extracted data (precoCustoYaml, pdespesa, etc.)
- `created_at` (timestamp) - Creation timestamp

**Helper Functions** (`src/utils/orcamentosSupabase.ts`):
- `resolveClienteSupabase(clienteId)` - Resolves client by ID, slug, nome, or pasta
- `mapSupabaseOrcamentoRow(row)` - Maps Supabase row to API format
- `sanitizeId(value)` - Sanitizes IDs for matching

---

## Environment Variables

Required for full functionality:
```bash
# 🗄️ Supabase (REQUIRED for production)
NEXT_PUBLIC_SUPABASE_URL=https://asmvbrcxzvfvvolnalxw.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...  # Get from Supabase Dashboard → Settings → API

# Google Drive Integration (optional)
GOOGLE_DRIVE_CLIENT_ID=
GOOGLE_DRIVE_CLIENT_SECRET=
GOOGLE_DRIVE_REFRESH_TOKEN=

# AI Providers (for extraction)
GEMINI_API_KEY=          # Gemini AI
OPENAI_API_KEY=          # GPT-4 fallback
OPENROUTER_API_KEY=      # Alternative

# Vercel (auto-configured in production)
VERCEL=1
VERCEL_URL=
```

**⚠️ CRITICAL:** In production, Supabase variables MUST be configured in Vercel Environment Variables.

---

## Common Tasks

### Adding a New Client
1. Navigate to `/admin/novo-cliente`
2. Fill form with: name, city, consumption, property type
3. System creates slug: `[name-city-date]`
4. Creates folder: `src/data/clientes/[slug]/`

### Processing a Quote
1. Go to `/admin/orcamentos/[clienteId]/upload`
2. Upload PDF/image
3. AI extracts data automatically
4. Review extracted data, make corrections if needed
5. Save (creates `orcamento[N].json`)
6. Repeat for up to 5 quotes per client

### Generating Proposal
1. From client's quotes page, click "Gerar Proposta"
2. System processes all quotes for that client
3. Runs financial analysis (payback, TIR, ROI)
4. Generates comparison between quotes
5. Creates HTML (`public/propostas/...`) and JSON (`src/data/clientes/...`)
6. Proposal available at `/proposta/[slug]`

### Quick Proposal (No Client Record)
1. Use `/gerador-rapido`
2. Enter client data + paste quote data (or YAML)
3. Get instant proposal without creating client record
4. Useful for quick estimates

---

## TypeScript Interfaces

Key types in `src/lib/types.ts`:

```typescript
interface PropostaData {
  cliente: ClienteInfo;
  sistemas: SistemaData[];        // Up to 5 quotes/systems
  analise: AnaliseEstrategica;    // Financial comparison
  empresa: ConfiguracoesEmpresa;
  dataGeracao: string;
  dataValidade: string;
}

interface SistemaData {
  titulo: string;
  potencia: string;
  especificacoes: string[];
  precoPixDecimal: number;
  preco12x: string;
  preco18x: string;
  geracao: string;
  cobertura: string;              // % of consumption covered
  payback: string;
  tir: string;                    // Internal rate of return
  isRecommended?: boolean;
}
```

---

## Git Workflow

```bash
# Main development branch
git checkout clean-main

# Make changes
git add .
git commit -m "✨ Description"

# Deploy to production
git push origin clean-main      # Triggers Vercel auto-deploy

# Check deployment
# Visit: https://pieng-propostas.vercel.app/admin
```

### Commit Message Conventions
Use emoji prefixes:
- ✨ New feature
- 🔧 Bug fix
- 📝 Documentation
- 🚀 Deployment
- ⚡ Performance
- 🎨 UI/styling

---

## Troubleshooting

### Error 500 in Production
- **Likely cause**: Template engine trying to read files from filesystem
- **Solution**: Ensure CSS files are in `public/styles/` and template engine uses `<link>` tags in production

### `/api/admin/config` returning 500
- **Likely cause**: Supabase vars ausentes. Endpoint agora salva em Supabase; sem `NEXT_PUBLIC_SUPABASE_*` ele cai para `/tmp` apenas em dev.
- **Diagnóstico**: Ver `VERIFICAR_VARIAVEIS_VERCEL.md` e checar `/api/admin/config` + logs (`savedToSupabase: false`).
- **Solução**: Configure as variáveis em Vercel ou rode localmente com `.env`; apenas em dev o fallback para arquivo é permitido.

### Proposal Shows 404
- **First**: Check if proposal exists in Supabase: `/api/test-proposta-slug?slug=[slug]`
- **Second**: Check if `proposta.json` exists in `src/data/clientes/[slug]/` (local only)
- Verify slug matches URL format
- Run `npm run build` locally to test SSG
- **In production**: Proposals MUST be in Supabase (`/proposta/[slug]` uses `getServerSideProps` which queries Supabase first)

### AI Extraction Fails
- Check if GOOGLE_AI_API_KEY or OPENAI_API_KEY is set
- Verify PDF/image is readable (not scanned poorly)
- Check distributor patterns in `extract-data.ts`

### Client Not Listed in Admin
- **In Production**: Verify client exists in Supabase (`clientes` table)
- **In Development**: Verify `cliente.json` exists in `src/data/clientes/[slug]/`
- Check API `/api/admin/clientes` response (should show `source: 'supabase'` or `source: 'filesystem'`)
- Ensure folder name matches slug pattern
- **Test Supabase connection**: `/api/test-supabase`
- **Diagnóstico rápido**: usar `/api/test-cliente-padrao` (ou clone desse endpoint) para validar cliente + proposta por slug.

### Python Calculator Errors
- Check if Python backend is accessible
- Verify data format matches expected schema
- Review `src/lib/python-calculator.ts` error logs

---

## Performance Considerations

- Proposals use SSG (Static Site Generation) with 60s revalidation
- Cache headers configured in `vercel.json`
- Large client list may slow down `/admin` - consider pagination
- Image optimization: Use Next.js `<Image>` component
- CSS is inlined in development but linked in production for faster loads

---

## Testing Checklist

Before deploying major changes:

- [ ] Test proposal generation locally: `npm run dev` → `/gerador-rapido`
- [ ] Verify production build: `npm run build && npm start`
- [ ] Check TypeScript: `npx tsc --noEmit`
- [ ] Test admin CRUD: Create/edit/delete client
- [ ] Verify AI extraction with sample PDF
- [ ] Check proposal URLs work in both formats:
  - `/proposta/[slug]` (SSG route)
  - `/propostas/orçamento/clientes/proposta_[slug].html` (static)
- [ ] Confirm CSS loads in production build
- [ ] Test WhatsApp share and copy link buttons

---

## Additional Documentation

- **MIGRACAO-VERCEL-COMPLETA.md**: Details of Netlify → Vercel migration
- **README.md**: User-facing overview and features
- **VERSION.md**: Complete version history and changelog
- **template_variables.json**: Available template variables reference

---

## Recent Updates & Changelog

### v2.3.3 — 01/12/2025 ✅ **CURRENT PRODUCTION**

**🔧 Critical Fixes:**
- ✅ **TypeError Fix**: Fixed `Cannot read properties of undefined (reading 'toLocaleString')` in `/admin/orcamentos`
  - Added robust type checking before calling `toLocaleString()`
  - Safe fallback for undefined/null values
  - Using nullish coalescing (`??`) to preserve `0` values

**🎨 UI/UX Improvements:**
- ✅ Removed "Enviar Proposta" card from main admin screen
- ✅ Integrated "Email" button in client list action row
- ✅ Email modal pre-filled with client data (name, slug, city)

**📦 Files Modified:**
- `src/pages/admin/orcamentos/index.tsx` - TypeError fix with type checking
- `src/pages/admin/index.tsx` - Removed "Enviar Proposta" card, added Email button

**✅ Status:**
- All fixes tested and deployed
- Production ready (Vercel) - v2.3.3

---

### v2.3.2 — 01/12/2025
- ✅ Removed "Novo Cliente" card from admin
- ✅ Improved existing proposal loading

---

### v2.3.1 — 01/12/2025

**🔧 Critical Fixes:**
- ✅ **Window Opening Fix**: Proposta agora abre diretamente na URL correta sem `about:blank`
  - Antes: `window.open('', '_blank')` + `document.write()` causava página em branco
  - Agora: `window.open(propostaUrl, '_blank')` abre diretamente com URL correta
  - Removido: Alert bloqueante que prendia a janela anterior
  - Impacto: UX muito melhorada - usuário vê proposta instantaneamente

- ✅ **Favicons Corrigidos**: Logo PIENG agora aparece corretamente
  - Problema: Arquivos PNG corrompidos (70 bytes vazios)
  - Solução: Usar `favicon.svg` (839KB) como fonte principal
  - Arquivos atualizados: `_document.tsx`, `manifest.json`
  - Deletados: `favicon.ico`, `favicon-16x16.svg` (corrompidos)
  - Status: Favicons funcionando em todos os navegadores

- ✅ **Configurações Dinâmicas**: Sistema agora usa Supabase para todas as configs
  - Criada tabela `configuracoes` no Supabase (20 configs)
  - API `/api/admin/config` refatorada para ler todas as configs individualmente
  - `gerador-rapido.tsx`: useEffect sincroniza HSP e outras configs do Supabase
  - `gerar-proposta.ts`: Todos os fallbacks agora usam `configSistema`
  - Impacto: HSP 5.30 (ou qualquer valor) agora reflete em todo o app

**🎨 UI/UX Improvements:**
- ✅ Removido card "Google Drive" da área administrativa
- ✅ Removido card "Atualizar" (recarregar dados) - desnecessário com Supabase
- ✅ Admin dashboard mais limpo e focado

**📦 SQL Scripts Created:**
- `1_criar_tabela_configuracoes.sql` - Estrutura da tabela
- `2_inserir_configuracoes_padrao.sql` - 20 configurações padrão
- `3_testar_configuracoes.sql` - Testes de validação
- `4_atualizar_schema_cache.sql` - Refresh do schema cache

**📦 Files Modified:**
- `src/pages/gerador-rapido.tsx` - Window opening fix + config sync (linhas 930-952)
- `src/pages/api/admin/config.ts` - Multi-config pattern
- `src/pages/api/gerar-proposta.ts` - HSP fallbacks (linhas 499, 626, 789, 815)
- `src/pages/admin/index.tsx` - Removed "Atualizar" button
- `src/pages/_document.tsx` - Favicon links updated
- `public/manifest.json` - Icons updated to use SVG

**🛠️ Tools Created:**
- `convert-svg-to-png.html` - Ferramenta web para converter SVG → PNG
- `test-supabase-config.js` - Script de teste direto da API Supabase

**✅ Status:**
- Todas as funcionalidades testadas localmente
- Configurações Supabase validadas (20 configs)
- Deploy para produção (Vercel) - v2.3.1
- Favicons aparecendo corretamente

### v2.2.5 — 18/11/2025
- Corrigido erro 500 em `/api/admin/orcamentos/[cliente]` - integração completa com Supabase.
- Orçamentos agora persistem no banco de dados (tabela `orcamentos`) com CRUD completo (GET/POST/PUT/DELETE).
- Criado `src/utils/orcamentosSupabase.ts` com funções helper para resolução de cliente e mapeamento de dados.
- Resolução automática de cliente por múltiplos identificadores (ID, slug, nome, pasta).
- Configuração do ESLint (eslint@8.57.0 compatível com Next.js 13.5.6).
- Documentação atualizada com detalhes da integração de orçamentos no Supabase.

### v2.2.4 — 18/11/2025
- `/api/admin/config` salva no Supabase (`configuracoes`) e só cai para filesystem local quando necessário.
- `/api/admin/clientes` ganhou sanitização completa, estatísticas consistentes (`propostasGeradas`) e logs indicando fonte (`supabase`/`filesystem`).
- `/api/admin/clientes/[clienteId]` consulta/atualiza clientes diretamente no Supabase antes do filesystem, evitando 404 em produção.
- Nova rota diagnóstica `/api/test-cliente-padrao` confirma se cliente/proposta existem no banco.
- Badge da área admin, README e VERSION atualizados para `v2.2.4`, garantindo visibilidade da versão deployada.

### v2.2.3 — 17/11/2025
- Corrigido download de SWC (Next 13.5.6 fixado) e sincronização `package-lock.json`.
- `/api/gerar-proposta` recebeu validações extras (dados obrigatórios, divisões por zero, fallback de HTML, try/catch em Python).
- Supabase client ficou null-safe; página duplicada `/proposta-supabase/[slug]` removida.
- Documentação operacional expandida: `VERIFICAR_VARIAVEIS_VERCEL.md`, `DIAGNOSTICO_404_SUPABASE.md`, `VERIFICAR_VERSAO_LOCAL.md`.

### v2.2.2 — 06/11/2025
- `/proposta/exemplo`, `/propostas-publicas` e `/validar-ambiente` modernizados (busca, filtros, ações rápidas).
- Fluxo público ganhou botões WhatsApp, copiar link e limpeza automática de propostas de teste.
- Branch strategy formalizada (`clean-main` produção, `desenvolvimento` sandbox) com guias de workflow.

### v2.2.1 — 31/10/2025
- `/api/admin/orcamentos-todos` e `/admin/orcamentos` passaram a usar Supabase como fonte principal (IDs e botões corrigidos).
- `/api/admin/criar-cliente` agora exige Supabase em produção e retorna mensagens detalhadas.
- Definição oficial do modo híbrido: Supabase obrigatório em Vercel, filesystem apenas em desenvolvimento.

### v2.2.0 — 26/10/2025
- Migração plena para estratégia Supabase + filesystem; rotas dinâmicas configuradas com fallback `'blocking'`.
- Correções de 404 em propostas SSG.

### v2.1.0 — 25/10/2025
- Primeira versão com controle de versão visual (`VERSION.md`, badge no admin).
- Correções de ordenação em `/api/admin/clientes` e melhorias de logs/erros.


---

### v2.3.0 — 06/11/2025 (branch `desenvolvimento`)
**📱 PWA Implementation (Progressive Web App):**
- ✅ **Manifest.json**: Full PWA configuration with shortcuts
- ✅ **Service Worker**: Offline cache with Network First strategy
- ✅ **Install Component**: Smart installation banner for all platforms
- ✅ **Icons**: SVG source + PNG exports (192x192, 512x512)
- ✅ **Meta Tags**: Apple/Android specific tags in _document.tsx
- ✅ **Offline Support**: Cached pages work without internet
- ✅ **Shortcuts**: Quick access to Admin, Nova Proposta, Propostas Públicas

**📦 New Files:**
- `public/manifest.json` - PWA configuration
- `public/sw.js` - Service Worker with caching logic
- `public/icon.svg` - Vector icon (source)
- `public/icon-192x192.png` - Small icon
- `public/icon-512x512.png` - Large icon
- `src/pages/_document.tsx` - PWA meta tags
- `src/components/InstallPWA.tsx` - Installation component
- `PWA.md` - Complete PWA documentation

**✨ Features:**
- Installable on Android, iPhone, Windows, Mac, Linux
- Works offline after first visit (cached pages)
- Native app experience (standalone window)
- Fast loading with Service Worker cache

---

**Last Updated**: 2025-12-01 ✅ **v2.3.3**
**System Status**: ✅ Production Ready
**Current Issues**: None - All fixes applied and tested
**Supabase**: ✅ Fully integrated and required for production
**Configurations**: ✅ 20 configs in Supabase (dynamic, no hardcode)
**Favicons**: ✅ Working (favicon.svg 839KB)
**Window UX**: ✅ Fixed (direct URL opening, no blocking alerts)
**Next Version**: v2.3.2 (PWA icons optimization, PNG generation)
