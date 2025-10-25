# 🌞 PIENG - Sistema de Propostas Solares com IA

[![Versão](https://img.shields.io/badge/versão-v2.1.0-blue.svg)](VERSION.md)
[![Status](https://img.shields.io/badge/status-produção-success.svg)](https://pieng-propostas.vercel.app)
[![Deploy](https://img.shields.io/badge/deploy-vercel-black.svg)](https://vercel.com)

Sistema completo de geração de propostas solares com administração web, extração inteligente de dados e análise financeira automatizada.

**📌 Versão Atual**: `v2.1.0` (25/10/2025) | [Ver Histórico Completo](VERSION.md)

## ✨ Principais Funcionalidades

- 🤖 **Extração Inteligente**: IA reconhece dados de orçamentos PDF/imagem automaticamente
- 🏢 **Área Administrativa**: CRUD completo de clientes com dashboard profissional
- 🎯 **Propostas Personalizadas**: URLs únicas para cada cliente com análise financeira
- ⚡ **Performance Otimizada**: SSG com Next.js para carregamento instantâneo  
- 🎨 **Design Responsivo**: Visual moderno com Tailwind CSS
- 🔒 **Dados Protegidos**: Sistema seguro sem exposição de informações sigilosas
- 📱 **Mobile First**: Totalmente responsivo para todos os dispositivos
- 🌐 **CDN Global**: Deploy automático no Vercel Edge Network

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
1. **Cadastrar Cliente**: `/admin/novo-cliente`
2. **Fazer Upload de Orçamentos**: `/admin/orcamentos/[cliente]/upload`
3. **IA Extrai Dados**: Reconhece módulos, inversores, preços automaticamente
4. **Revisar/Ajustar**: `/admin/orcamentos/[cliente]/manual`
5. **Configurar Sistema**: `/admin/configuracoes` (markup, tarifas, HSP)

**💡 Geração de Proposta**
- Proposta automática: `/proposta/[cliente]`
- Análise financeira completa (TIR, Payback, VPL)
- Templates personalizáveis

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
- Novo Cliente: `/admin/novo-cliente`
- Configurações: `/admin/configuracoes`
- Orçamentos: `/admin/orcamentos/[cliente]`
- Upload IA: `/admin/orcamentos/[cliente]/upload`
- Entrada Manual: `/admin/orcamentos/[cliente]/manual`
- Editar Cliente: `/admin/clientes/[cliente]/editar`

**🔧 APIs:**
- Clientes: `/api/admin/clientes`
- Extração IA: `/api/admin/extract-data`
- Configurações: `/api/admin/config`
- Orçamentos: `/api/admin/orcamentos/[cliente]`

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

*Sistema desenvolvido com IA para maximizar eficiência e aproveitar todo o potencial do Vercel Edge Network* 🚀⚡🤖