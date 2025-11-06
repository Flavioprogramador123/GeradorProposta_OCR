# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PIENG-PROPOSTAS is a solar proposal generation system with AI-powered data extraction. Built with Next.js 13.5.11, it provides a complete admin interface for managing clients, processing quotes, and generating professional solar installation proposals.

**Production URL**: https://pieng-propostas.vercel.app
**Main Branch**: `clean-main`
**Deploy**: Auto-deploy on push to `clean-main`

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
5. Proposal Persistence → Supabase (propostas table) with html_gerado + dados_completos
6. Public Access → /proposta/[slug] (reads from Supabase first, then filesystem fallback)
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
- Central config: `src/data/sistema/configuracoes.json`
- API endpoint: `/api/admin/config`
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
/api/admin/extract-data         → AI extraction from PDFs/images
/api/admin/config               → System configuration
/api/gerar-proposta             → Generate proposal HTML + JSON (saves to Supabase)
/api/propostas-publicas         → List public proposals (Supabase + filesystem)
/api/test-supabase              → Test Supabase connection
/api/test-proposta-slug         → Diagnostic API for specific proposal
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
5. Save to `orcamento[N].json`
6. Generate proposal → Calls `/api/gerar-proposta`
7. Python calculator validates and enriches data
8. Template engine creates HTML + updates JSON
9. Files written to both locations (data + public)

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

### **v2.2.1** - 31/10/2025 ✅ **CURRENT**

**🔧 Critical Fixes:**
- ✅ **Admin Orçamentos**: Now fetches from Supabase (was filesystem-only)
- ✅ **Criar Cliente**: Now REQUIRED to save to Supabase in production (was optional)
- ✅ **Botão "Ver Orçamento" null**: Fixed with validation check
- ✅ **ID do banco não aparecia**: API now returns `propostaId` from Supabase
- ✅ **Admin `/orcamentos` page**: Shows ID do banco and "Ver Proposta" button

**🏗️ Architectural Changes:**
- **Storage Strategy**: Supabase is PRIMARY in production
  - All proposals MUST be saved to Supabase (`propostas` table)
  - All clients MUST be saved to Supabase (`clientes` table)
  - Filesystem is fallback for development only
  - `/admin/orcamentos` queries Supabase first, filesystem second

**📋 Supabase Integration:**
- ✅ Configured: `https://asmvbrcxzvfvvolnalxw.supabase.co`
- ✅ Tables: `clientes`, `propostas`, `orcamentos`, `configuracoes`
- ✅ APIs updated: All admin APIs prioritize Supabase
- ✅ Error handling: Clear messages when Supabase not configured

**📦 Key Files Modified:**
- `src/pages/api/admin/orcamentos-todos.ts` - Supabase integration
- `src/pages/api/admin/criar-cliente.ts` - Required Supabase save
- `src/pages/admin/orcamentos/index.tsx` - Shows ID do banco
- `src/pages/admin/novo-cliente.tsx` - Better error messages

**✅ Status:**
- All features working in production
- Supabase fully integrated
- Production-ready

---

### **v2.2.0** - 26/10/2025

**🔧 Critical Fixes:**
- Fixed error 404 in SSG routes (dynamic `getStaticPaths`)
- `src/pages/proposta/[slug].tsx` now reads all clients automatically
- Changed fallback from `true` to `'blocking'` for better UX

**🏗️ Architectural Decisions:**
- Migrated from filesystem-only to Supabase + filesystem hybrid
- Supabase became primary storage for production reliability

---

### **v2.1.0** - 25/10/2025

**🔧 Bug Fixes:**
- Fixed error 500 in `/api/admin/clientes` (date sorting crash)
- Added safe date validation with NaN checks
- Improved error handling with detailed logging

**✨ Improvements:**
- Added version badge in admin header (`v2.1.0`)
- Created VERSION.md with complete version history
- Implemented Semantic Versioning (SemVer) convention
- Updated README.md with version badges
- Enhanced documentation for continuity

---

### **v2.3.0** - 06/11/2025 ✅ **CURRENT**

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
- `scripts/generate-icons.js` - Icon generation helper
- `scripts/create-placeholder-icons.js` - Placeholder icons for testing

**✨ Features:**
- Installable on Android, iPhone, Windows, Mac, Linux
- Works offline after first visit (cached pages)
- Native app experience (standalone window)
- Fast loading with Service Worker cache
- Automatic updates when new version deployed
- iOS Safari support (manual installation)

**🎨 Design:**
- Theme color: Orange (#f59e0b) - PIENG brand
- Icon: Solar panel + sun symbol
- Splash screen configured
- Status bar styled

**📊 Testing:**
- ✅ Tested locally with `npm run dev`
- ✅ Service Worker registers correctly
- ✅ Manifest loads without errors
- ⏳ Production deployment pending

**📖 Documentation:**
- Complete guide in [PWA.md](PWA.md)
- Installation instructions for all platforms
- Troubleshooting section
- Technical details (cache strategy, offline behavior)
- Roadmap (v1.1.0: Push notifications, Background sync)

---

**Last Updated**: 2025-11-06 ✅ **v2.3.0**
**System Status**: ✅ Production Ready + PWA Enabled
**Current Issues**: None - All fixes applied
**Supabase**: ✅ Fully integrated and required for production
**PWA Status**: ✅ Implemented (pending production deployment)
**Next Version**: v2.4.0 (Potential: Push notifications, Background sync, Share API)
