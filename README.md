# 🌞 PIENG - Sistema de Propostas Solares Modernos

Sistema escalável e moderno para geração de propostas solares personalizadas, otimizado para deploy no Vercel.

## ✨ Principais Funcionalidades

- 🎯 **Propostas Personalizadas**: URLs únicas para cada cliente
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
│   ├── index.tsx       # Página inicial
│   └── proposta/[slug].tsx
├── styles/             # Estilos globais
├── lib/               # Utilitários e tipos
└── data/clientes/     # Dados dos clientes
```

## 🚀 Como Usar

### 1. Desenvolvimento Local

```bash
npm install
npm run dev
```

### 2. Criar Nova Proposta

1. Adicione os dados do cliente em `src/data/clientes/[nome]/`
2. Configure as variáveis no sistema
3. A proposta estará disponível em `/proposta/[slug]`

### 3. Deploy Automático

- Push para main → Deploy automático no Vercel
- URLs geradas: `https://pieng-propostas.vercel.app/proposta/[cliente]`

## 📊 Vantagens da Nova Arquitetura

| Aspecto | Antes | Depois |
|---------|-------|--------|
| **Performance** | HTML estático | SSG otimizado + CDN |
| **URLs** | Arquivos locais | URLs profissionais |
| **Manutenção** | CSS embutido | Sistema modular |
| **Escalabilidade** | Manual | Automatizada |
| **Mobile** | Não responsivo | Mobile-first |

## 🔧 Scripts Disponíveis

- `npm run dev` - Desenvolvimento local
- `npm run build` - Build de produção  
- `npm run start` - Servidor de produção
- `npm run lint` - Verificação de código

## 📱 URLs de Exemplo

- Homepage: `/`
- Proposta: `/proposta/arisio-anapolis-2024-09-05`
- Admin: `/admin` (em desenvolvimento)

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

- ✅ Dados sigilosos nunca expostos
- ✅ URLs com slug único por proposta
- ✅ Headers de segurança configurados
- ✅ Cache otimizado

## 📞 Suporte

**PIENG Soluções Energéticas**  
📞 (62) 99167-0536  
✉️ contato@piengsolucoes.com.br  
🌐 www.piengsolucoes.com.br

---

*Sistema desenvolvido para maximizar conversões e aproveitar todo o potencial do Vercel Edge Network* 🚀