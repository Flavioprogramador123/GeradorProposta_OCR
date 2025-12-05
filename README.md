# 🌞 PIENG - Sistema de Propostas Solares com IA

[![Versão](https://img.shields.io/badge/versão-v2.4.1-blue.svg)](CHANGELOG_v2.4.1.md)
[![Status](https://img.shields.io/badge/status-produção-success.svg)](https://pieng-propostas.vercel.app)
[![Deploy](https://img.shields.io/badge/deploy-vercel-black.svg)](https://vercel.com)
[![Branch](https://img.shields.io/badge/branch-clean--main-green.svg)](https://github.com/Flavioprogramador123/GeradorProposta_OCR)
[![PWA](https://img.shields.io/badge/PWA-desenvolvimento-purple.svg)](PWA.md)

Sistema completo de geração de propostas solares com administração web, extração inteligente de dados e análise financeira automatizada.

**📌 Versão Atual**: `v2.4.1` (05/12/2025) ✅ **PRODUÇÃO**
**📖** [Ver Changelog Completo](CHANGELOG_v2.4.1.md) | [Documentação PWA](PWA.md)

## 🆕 Novidades v2.4.1 (05/12/2025)

**🖼️ Sistema de Logos Profissional:**
- ✅ Sistema centralizado de configuração de logos (`logoConfig.ts`)
- ✅ Logos adicionados em Header, Footer, Favicon e Meta Tags
- ✅ Configuração via variáveis de ambiente (sem alterar código)
- ✅ Suporte a múltiplos formatos (JPG, PNG, SVG)
- ✅ Logo configurável para WhatsApp/Facebook (Open Graph)
- ✅ Documentação completa: `GUIA_CONFIGURAR_LOGO.md`

## 🆕 Novidades v2.3.3 (01/12/2025)

**🔧 Correções Críticas:**
- ✅ **TypeError Fix**: Corrigido erro `toLocaleString()` em `/admin/orcamentos`
- ✅ Verificação robusta de valores undefined/null
- ✅ Fallback seguro para exibição de valores monetários

**🎨 Melhorias UI/UX:**
- ✅ Removido card "Enviar Proposta" da tela principal
- ✅ Botão "Email" integrado na linha de ações dos clientes
- ✅ Modal pré-preenchido com dados do cliente

## 🆕 Novidades v2.3.1 (01/12/2025)

**🔧 Correções Críticas:**
- ✅ **Window Opening Fix**: Propostas agora abrem diretamente sem `about:blank`
- ✅ **Favicons Corrigidos**: Logo PIENG aparecendo em todos os navegadores
- ✅ **Configurações Dinâmicas**: 20 configs no Supabase (HSP, tarifas, margens)

**🎨 Melhorias UI/UX:**
- ✅ Removidos cards desnecessários do admin (Google Drive, Atualizar)
- ✅ Gerador rápido sincroniza valores do Supabase automaticamente
- ✅ Sistema totalmente sem hardcode - tudo configurável

**🛠️ Ferramentas:**
- ✅ Criado conversor SVG→PNG web (`/convert-svg-to-png.html`)
- ✅ Scripts SQL para configurações (4 arquivos)
- ✅ Teste direto da API Supabase (`test-supabase-config.js`)

## 🆕 PWA v2.3.0 (branch desenvolvimento)

- 📱 **Instalável como App**: Android, iPhone, Windows, Mac
- ⚡ **Acesso Offline**: Propostas em cache para visualização sem internet
- 🚀 **Performance**: Carregamento instantâneo com Service Worker
- 🎯 **Atalhos**: Admin, Nova Proposta, Propostas Públicas
- 🔔 **Notificações** (futuro): Push notifications para novas propostas
- 📖 [Documentação Completa do PWA](PWA.md)

## ✨ Principais Funcionalidades

- 🤖 **Extração Inteligente**: IA reconhece dados de orçamentos PDF/imagem automaticamente
- 🏢 **Área Administrativa**: CRUD completo de clientes com dashboard profissional
- 🎯 **Propostas Personalizadas**: URLs únicas para cada cliente com análise financeira
- 💾 **Banco de Dados Supabase**: Persistência confiável em produção
- ⚡ **Performance Otimizada**: SSG com Next.js para carregamento instantâneo
- 🎨 **Design Responsivo**: Visual moderno com Tailwind CSS
- 🔒 **Dados Protegidos**: Sistema seguro sem exposição de informações sigilosas
- 📱 **Progressive Web App**: Instalável como app nativo em qualquer dispositivo
- 🌐 **CDN Global**: Deploy automático no Vercel Edge Network
- 💾 **Modo Offline**: Funciona sem conexão após primeira visita

### 🆕 Novidades v2.2.5 (18/11/2025)
- ✅ Corrigido erro 500 em `/api/admin/orcamentos/[cliente]` - integração completa com Supabase
- ✅ Orçamentos agora persistem no banco de dados (tabela `orcamentos`)
- ✅ CRUD completo de orçamentos funcionando com Supabase-first
- ✅ Criado `src/utils/orcamentosSupabase.ts` para gerenciar orçamentos
- ✅ Configuração do ESLint (eslint@8.57.0 compatível com Next.js 13.5.6)
- ✅ Documentação atualizada com integração de orçamentos

### 🆕 Novidades v2.2.4 (18/11/2025)
- ✅ `admin/config` agora persiste no Supabase com fallback seguro
- ✅ `/api/admin/clientes` corrigido (variáveis e nomes sanitizados)
- ✅ Detalhe de cliente `/api/admin/clientes/[id]` busca direto do Supabase
- ✅ Nova rota de diagnóstico `/api/test-cliente-padrao`
- ✅ Documentação e badge atualizados

### 🆕 Novidades v2.2.3 (17/11/2025)
- ✅ Correções de build e erros no Vercel
- ✅ Melhorias no tratamento de erros Supabase
- ✅ Debug aprimorado para diagnóstico

### 🆕 Novidades v2.2.2 (06/11/2025)

- 🔍 **Propostas Públicas Modernizada**: Busca, filtros por mês, botões WhatsApp
- ✨ **Rota /proposta/exemplo**: Sempre mostra proposta mais recente
- 🛡️ **Ambiente Protegido**: Branch desenvolvimento separado, workflow documentado
- 🧪 **Validação de Ambiente**: `/validar-ambiente` para verificar configuração
- 📋 **Organização**: 12 arquivos obsoletos movidos, documentação completa

## 🏗️ Arquitetura

```
src/
├── components/          # Componentes React reutilizáveis
│   ├── Header.tsx
│   ├── SystemCard.tsx
│   ├── ComparisonTable.tsx
│   └── ...
├── pages/              # Páginas Next.js
│   ├── admin/          # 🏢 Área administrativa completa
│   │   ├── index.tsx   # Dashboard com estatísticas
│   │   ├── novo-cliente.tsx     # Cadastro de clientes
│   │   ├── configuracoes.tsx    # Configurações do sistema
│   │   ├── orcamentos/         # 📋 Gestão de orçamentos
│   │   │   └── [clienteId]/
│   │   │       ├── index.tsx   # Lista orçamentos cliente
│   │   │       ├── upload.tsx  # 🤖 Upload com extração IA
│   │   │       └── manual.tsx  # ✏️ Entrada manual
│   │   └── clientes/           # CRUD completo clientes
│   ├── api/            # 🔧 APIs do sistema
│   │   └── admin/
│   │       ├── extract-data.ts      # 🤖 Extração inteligente IA
│   │       ├── clientes/[id].ts     # CRUD clientes API
│   │       ├── orcamentos/[id].ts   # Gestão orçamentos API
│   │       └── config.ts            # Configurações API
│   ├── index.tsx       # 🏠 Página inicial
│   └── proposta/[slug].tsx  # 📄 Propostas geradas
├── data/clientes/      # 📁 Dados dos clientes
└── utils/              # 🛠️ Utilitários e cálculos
```

## 🚀 Como Usar

### 1. Desenvolvimento Local

```bash
npm install
npm run dev
# Acesse: http://localhost:3000
```

### 2. Fluxo Completo do Sistema

**📋 Área Administrativa** (`/admin`)
1. **Cadastrar Cliente**: `/admin/novo-cliente` → Salva no Supabase automaticamente
2. **Ver Todos Orçamentos**: `/admin/orcamentos` → Lista de todas as propostas do sistema
3. **Fazer Upload de Orçamentos**: `/admin/orcamentos/[cliente]/upload`
4. **IA Extrai Dados**: Reconhece módulos, inversores, preços automaticamente
5. **Revisar/Ajustar**: `/admin/orcamentos/[cliente]/manual`
6. **Configurar Sistema**: `/admin/configuracoes` (markup, tarifas, HSP)

**💡 Geração de Proposta**
- Gerador Rápido: `/gerador-rapido` → Gera e salva no Supabase
- Proposta automática: `/proposta/[cliente]` → Busca do Supabase primeiro
- Análise financeira completa (TIR, Payback, VPL)
- Templates personalizáveis
- IDs do banco visíveis em `/admin/orcamentos`

### 3. 🤖 Sistema de Extração Inteligente

**Distribuidores Suportados:**
- ✅ **BelEnergy/PIENG**: Cotações WEB com códigos
- ✅ **SOOLLAR**: Módulos N-Plus, inversores SAJ
- ✅ **Canadian Solar**: HiKu6, inversores Growatt  
- ✅ **WEG**: Equipamentos WEG completos
- ✅ **Qualquer Distribuidor**: Padrões genéricos

**Dados Extraídos:**
```javascript
// Exemplo de extração automática
{
  fornecedor: "SOOLLAR Distribuidora",
  valorTotal: 8619.84,
  modulos: {
    marca: "N-Plus",
    potencia: 580, // W
    quantidade: 12
  },
  inversores: {
    marca: "SAJ", 
    potencia: 6, // kW
    quantidade: 1
  }
}
```

### 4. Deploy Automático

```bash
# Deploy Vercel
vercel --prod

# URLs geradas automaticamente:
# - https://pieng-propostas.vercel.app/admin
# - https://pieng-propostas.vercel.app/proposta/[cliente]
```

## 📊 Vantagens da Nova Arquitetura

| Aspecto | Antes | Depois |
|---------|-------|--------|
| **Entrada de Dados** | Manual (texto) | 🤖 IA extrai automaticamente |
| **Gestão Clientes** | Arquivos locais | 🏢 CRUD web completo |
| **Orçamentos** | Um por cliente | 📋 Até 5 orçamentos + comparação |
| **Performance** | HTML estático | ⚡ SSG otimizado + CDN |
| **URLs** | Arquivos locais | 🌐 URLs profissionais |
| **Configuração** | Hardcoded | ⚙️ Interface web configurável |
| **Mobile** | Não responsivo | 📱 Mobile-first |
| **Análise Financeira** | Básica | 💰 TIR, VPL, Payback completo |

## 🔧 Scripts Disponíveis

- `npm run dev` - Desenvolvimento local
- `npm run build` - Build de produção  
- `npm run start` - Servidor de produção
- `npm run lint` - Verificação de código

## 📱 URLs do Sistema

**🏠 Públicas:**
- Homepage: `/`
- Proposta: `/proposta/arisio-anapolis-2024-09-05`
- Teste Logos: `/test-logos`

**🏢 Administrativas:**
- Dashboard: `/admin`
- Novo Cliente: `/admin/novo-cliente` → Salva no Supabase
- Todos Orçamentos: `/admin/orcamentos` → Lista de todas as propostas
- Configurações: `/admin/configuracoes`
- Orçamentos Cliente: `/admin/orcamentos/[cliente]`
- Upload IA: `/admin/orcamentos/[cliente]/upload`
- Entrada Manual: `/admin/orcamentos/[cliente]/manual`
- Editar Cliente: `/admin/clientes/[cliente]/editar`

**🔧 APIs:**
- Clientes: `/api/admin/clientes` → Supabase + filesystem fallback
- Criar Cliente: `/api/admin/criar-cliente` → Salva no Supabase
- Todos Orçamentos: `/api/admin/orcamentos-todos` → Lista do Supabase
- Orçamentos Cliente: `/api/admin/orcamentos/[cliente]` → CRUD completo (Supabase-first)
- Orçamento Individual: `/api/admin/orcamentos/[cliente]/[orcamentoId]` → GET/PUT/DELETE
- Extração IA: `/api/admin/extract-data`
- Configurações: `/api/admin/config`
- Test Supabase: `/api/test-supabase` → Testa conexão
- Test Proposta: `/api/test-proposta-slug?slug=xxx` → Diagnóstico

## 🎨 Personalização

### Cores (Tailwind)
```css
pieng-primary: #3366CC
pieng-secondary: #FF6B35
pieng-success: #2ecc71
```

### Componentes
Todos os componentes são modulares e reutilizáveis, permitindo fácil customização por cliente.

## 🛡️ Segurança

- ✅ Dados sigilosos nunca expostos no frontend
- ✅ URLs com slug único por proposta  
- ✅ Headers de segurança configurados
- ✅ Cache otimizado
- ✅ Upload seguro com validação de tipos
- ✅ Sanitização de dados de entrada
- ✅ APIs protegidas contra injection
- ✅ Supabase Row Level Security (RLS) configurado

## 💾 Persistência de Dados

**Em Produção (Vercel):**
- ✅ **Supabase** é o banco primário
- ✅ Todas as propostas são salvas na tabela `propostas`
- ✅ Todos os clientes são salvos na tabela `clientes`
- ✅ Dados persistem entre deploys

**Em Desenvolvimento:**
- ✅ Filesystem local como fallback
- ✅ Supabase pode ser usado para testes
- ✅ Dados sincronizados entre ambientes

**Configuração:**
- Variáveis de ambiente: `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Configure no Vercel: Settings → Environment Variables
- Teste conexão: `/api/test-supabase`

## 🤖 Detalhes da Extração por IA

**Padrões Reconhecidos:**

```regex
// Módulos Solares
/MÓDULO\s+(?:BIFACIAL\s+)?(?:\d+\s+CEL\.?\s+)?(?:N\s+TYPE\s+)?(\d+)W\s+(.+)/i
/(\d+)×?\s*MÓDULO\s+(.+?)(\d+)W/i

// Inversores  
/INVERSOR\s+(?:DE\s+CORRENTE\s+)?(?:MONOFÁSICO\s+)?(?:\d+MPPT\s+)?(\d+)KW\s+(.+)/i

// Valores
/(?:VALOR\s+)?TOTAL\s*:?\s*R?\$?\s*([\d.,]+)/i
/SUBTOTAL\s*:?\s*R?\$?\s*([\d.,]+)/i

// Componentes
/CABO\s+SOLAR\s+(\d+)MM\s+(.+?)(?:\((\d+)\s*M\))?/gi
/DPS\s+(.+?)(?:\((\d+)\s*PC\))?/gi
```

**Distribuidores com Padrões Específicos:**
- **BelEnergy**: Códigos WEB-XXXXXXX, estrutura fibrocimento
- **SOOLLAR**: Códigos numéricos, previsão entrega
- **Canadian**: Módulos HiKu6, inversores trifásicos
- **WEG**: Equipamentos próprios, trilhos alumínio

## 📞 Suporte

**PIENG Soluções Energéticas**  
📞 (62) 99167-0536  
✉️ contato@piengsolucoes.com.br  
🌐 www.piengsolucoes.com.br

---

## 🚀 Próximas Atualizações

- [ ] **Integração Real Docling**: Substituir simulação por API real
- [ ] **OCR Avançado**: Processar imagens escaneadas  
- [ ] **Banco de Dados**: Migrar para PostgreSQL/MongoDB
- [ ] **Multi-usuário**: Sistema de autenticação completo
- [ ] **Dashboard Analytics**: Métricas de conversão e performance
- [ ] **API Externa**: Integração com CRMs e ERPs
- [ ] **Whatsapp Integration**: Envio automático de propostas

**📊 Estatísticas do Sistema:**
- ✅ **4 Distribuidores** reconhecidos automaticamente
- ✅ **20+ Padrões** de extração inteligente  
- ✅ **100% Responsivo** em todos os dispositivos
- ✅ **5 Orçamentos** por cliente suportados
- ✅ **CRUD Completo** para gestão de dados
- ✅ **Supabase Integrado** para persistência confiável
- ✅ **Admin Orçamentos** lista todas as propostas do sistema

**🔄 Última Atualização: 18/11/2025**
- ✅ Orçamentos integrados com Supabase (tabela `orcamentos`)
- ✅ CRUD completo de orçamentos funcionando em produção
- ✅ Resolução automática de cliente por múltiplos identificadores
- ✅ ESLint configurado e funcionando
- ✅ Versão exibida no admin atualizada (v2.2.5)

*Sistema desenvolvido com IA para maximizar eficiência e aproveitar todo o potencial do Vercel Edge Network + Supabase* 🚀⚡🤖💾