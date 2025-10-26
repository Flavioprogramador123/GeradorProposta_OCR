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
1. Client Creation → src/data/clientes/[slug]/
2. Quote Upload → AI Extraction → src/pages/api/admin/extract-data.ts
3. Quote Processing → Python Calculator → Financial Analysis
4. Proposal Generation → Template Engine → HTML/JSON output
5. Public Access → /proposta/[slug] or /propostas/orçamento/clientes/
```

### Key Architectural Concepts

#### 1. **Dual Storage System**
- **Dynamic data**: `src/data/clientes/[slug]/proposta.json` - Used by Next.js SSG
- **Static HTML**: `public/propostas/orçamento/clientes/proposta_[slug].html` - Direct access
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
/api/admin/clientes             → List all clients
/api/admin/clientes/[id]        → CRUD operations for client
/api/admin/extract-data         → AI extraction from PDFs/images
/api/admin/config               → System configuration
/api/gerar-proposta             → Generate proposal HTML + JSON
/api/orcamentos/[cliente]/processar-modular → Process quotes
```

### Core Libraries
```
src/lib/templateEngine.ts           → HTML generation engine
src/lib/python-calculator.ts        → Financial calculations
src/lib/calculadorPrecosUnificado.ts → Unified pricing calculator
src/lib/types.ts                    → TypeScript interfaces
src/lib/variantConfig.ts            → Property type variants
src/lib/google-drive.ts             → Cloud storage integration
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
# Google Drive Integration (optional)
GOOGLE_DRIVE_CLIENT_ID=
GOOGLE_DRIVE_CLIENT_SECRET=
GOOGLE_DRIVE_REFRESH_TOKEN=

# AI Providers (for extraction)
GOOGLE_AI_API_KEY=          # Gemini AI
OPENAI_API_KEY=             # GPT-4 fallback

# Vercel (auto-configured in production)
VERCEL=1
VERCEL_URL=
```

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
- Check if `proposta.json` exists in `src/data/clientes/[slug]/`
- Verify slug matches URL format
- Run `npm run build` locally to test SSG

### AI Extraction Fails
- Check if GOOGLE_AI_API_KEY or OPENAI_API_KEY is set
- Verify PDF/image is readable (not scanned poorly)
- Check distributor patterns in `extract-data.ts`

### Client Not Listed in Admin
- Verify `cliente.json` exists in `src/data/clientes/[slug]/`
- Check API `/api/admin/clientes` response
- Ensure folder name matches slug pattern

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

### **v2.2.0** - 26/10/2025 ✅ **CURRENT**

**🔧 Critical Fixes:**
- Fixed error 404 in SSG routes (dynamic `getStaticPaths`)
- `src/pages/proposta/[slug].tsx` now reads all clients automatically
- Changed fallback from `true` to `'blocking'` for better UX

**🏗️ Architectural Decisions:**
- **Storage Strategy**: Hybrid Local + Google Drive (decided 26/10/2025)
  - Primary: File-based system (`src/data/clientes/`)
  - Backup: Google Drive (already integrated in `src/lib/google-drive.ts`)
  - Deploy: Vercel auto-deploy from `clean-main` branch
  - Supabase: Not prioritized (RLS complexity vs simple file storage)

**📋 Technical Context:**
- Google Drive API: ✅ Configured and ready (credentials in .env)
- AI APIs available: Gemini, OpenAI, OpenRouter
- Dropbox: Auto-syncs local files to cloud
- Vercel Token: Configured for deployments

**🎯 Strategy:**
1. Keep file-based system (simple, fast, reliable)
2. Use Google Drive for backup + public URLs (optional)
3. Focus on Vercel deployment stability
4. No database migration needed (data not confidential)

**📦 Key Files Modified:**
- `src/pages/proposta/[slug].tsx` - Dynamic SSG paths
- `CLAUDE.md` - Updated with architectural decisions

**🔜 Next Steps:**
- Test complete system on Vercel
- Validate all routes working
- Optional: Activate Google Drive auto-upload

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

**Last Updated**: 2025-10-26 ✅ **v2.2.0**
**System Status**: ✅ Testing Vercel deployment
**Current Issues**: None - 404 fix applied
**Next Version**: v2.3.0 (Google Drive auto-upload integration)
