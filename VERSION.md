# 📌 PIENG PROPOSTAS - CONTROLE DE VERSÃO

## 🎯 **VERSÃO ATUAL: v2.4.0** (02/12/2025)

---

## 📋 **HISTÓRICO DE VERSÕES**

### **v2.4.0** - 02/12/2025 ✅ **ATUAL**
**Status**: 🟢 Em Produção (Vercel)

**🎨 Sistema de CSS por Template:**
- ✅ **CSS Específicos por Subtipo Comercial**: Cada ramo (Panificadora, Açougue, Restaurante, Mercado) tem seu próprio CSS
- ✅ **Sistema Híbrido de Carregamento**: CSS carregado de arquivos locais com fallback para Supabase Storage
- ✅ **4 Novos Arquivos CSS**: `comercial-panificadora.css`, `comercial-acougue.css`, `comercial-restaurante.css`, `comercial-mercado.css`
- ✅ **Helper cssLoader.ts**: Função para carregar CSS de múltiplas fontes
- ✅ **Template Engine Atualizado**: Suporta CSS específicos automaticamente baseado no template selecionado

**📊 Sistema de Analytics:**
- ✅ **Tabela proposta_analytics**: Rastreamento completo de visualizações de propostas
- ✅ **Tracking Automático**: Tempo na página, scroll, cliques, IP, user agent
- ✅ **Detecção de Compartilhamento**: Identifica quando link foi compartilhado (múltiplos IPs)
- ✅ **Sistema de Alertas**: Alertas automáticos para follow-up com clientes
- ✅ **Dashboard de Analytics**: Visualização de estatísticas em `/admin/orcamentos/[clienteId]`

**🎨 Melhorias UI/UX:**
- ✅ **Padrão de Navegação**: Headers padronizados com botões à direita (Admin, Voltar)
- ✅ **Botão Voltar**: Implementado em todas as páginas (gerador-rapido, consultor, orcamentos)
- ✅ **Removido Card Consultor**: Substituído por botão "Voltar" no gerador-rapido
- ✅ **Configurações no Header**: Ícone de engrenagem (⚙️) no header do admin ao invés de card

**🔧 Correções:**
- ✅ **Cobertura como Inteiro**: Exibição de cobertura sempre como número inteiro (107% ao invés de 107.22536000000001%)
- ✅ **Step de pdespesa**: Ajustado de 0.01/0.1 para 1.0 para ajuste mais rápido
- ✅ **Salvar e Salvar Como**: Implementado sistema de versionamento de propostas
- ✅ **Carregamento de Config**: Prioriza config da proposta > cliente > sistema > default

**📦 Arquivos Criados:**
- `src/lib/cssLoader.ts` - Helper para carregar CSS
- `public/styles/comercial-panificadora.css` - CSS Panificadora
- `public/styles/comercial-acougue.css` - CSS Açougue
- `public/styles/comercial-restaurante.css` - CSS Restaurante
- `public/styles/comercial-mercado.css` - CSS Mercado
- `src/pages/api/propostas/[slug]/track.ts` - API de tracking
- `src/pages/api/admin/analytics/[slug].ts` - API de analytics
- `src/pages/api/admin/propostas-cliente/[clienteId].ts` - API de propostas com analytics
- `criar_tabela_proposta_analytics.sql` - Script SQL para tabela de analytics
- `SISTEMA_CSS_TEMPLATES.md` - Documentação do sistema de CSS

**📦 Arquivos Modificados:**
- `src/lib/variantConfig.ts` - CSS específicos por subtipo
- `src/lib/templateEngine.ts` - Suporte a CSS específicos
- `src/pages/gerador-rapido.tsx` - Botão voltar, step pdespesa, cobertura inteiro
- `src/pages/admin/orcamentos/[clienteId].tsx` - Analytics dashboard, header padronizado
- `src/pages/admin/orcamentos/[clienteId]/consultor.tsx` - Header padronizado
- `src/pages/admin/index.tsx` - Configurações no header
- `src/pages/proposta/[slug].tsx` - Tracking automático
- `src/components/SystemCard.tsx` - Cobertura como inteiro

**📦 Deploy:**
- Commits: (a definir após commit)
- Branch: `clean-main`
- URL: https://pieng-propostas.vercel.app

---

### **v2.3.3** - 01/12/2025
**Status**: 🟡 Substituído

**🔧 Correções Críticas:**
- ✅ **TypeError Fix**: Corrigido erro `Cannot read properties of undefined (reading 'toLocaleString')` em `/admin/orcamentos`
  - Adicionada verificação robusta de tipo antes de chamar `toLocaleString()`
  - Fallback seguro para valores undefined/null
  - Uso de nullish coalescing (`??`) para preservar valores `0`

**🎨 Melhorias UI/UX:**
- ✅ Removido card "Enviar Proposta" da tela principal do admin
- ✅ Integrado botão "Email" na linha de ações da lista de clientes
- ✅ Modal de envio de proposta pré-preenchido com dados do cliente

**📦 Arquivos Modificados:**
- `src/pages/admin/orcamentos/index.tsx` - Fix TypeError com verificação de tipo
- `src/pages/admin/index.tsx` - Removido card "Enviar Proposta", adicionado botão Email na lista

**📦 Deploy:**
- Commits: `25ee551`
- Branch: `clean-main`
- URL: https://pieng-propostas.vercel.app

---

### **v2.3.2** - 01/12/2025
**Status**: 🟡 Substituído

**🔧 Correções:**
- ✅ Removido card "Novo Cliente" do admin
- ✅ Melhorias no carregamento de propostas existentes

---

### **v2.3.1** - 01/12/2025
**Status**: 🟢 Em Produção (Vercel)

**🔧 Correções Críticas:**
- ✅ **Window Opening Fix**: Propostas abrem diretamente sem `about:blank`
  - Antes: `window.open('', '_blank')` + `document.write()` causava página em branco
  - Agora: `window.open(propostaUrl, '_blank')` abre diretamente
  - Removido alert bloqueante que travava a janela anterior

- ✅ **Favicons Corrigidos**: Logo PIENG aparecendo em todos os navegadores
  - Arquivos PNG corrompidos (70 bytes) substituídos por SVG (839KB)
  - Atualizados: `_document.tsx`, `manifest.json`
  - Deletados: `favicon.ico`, `favicon-16x16.svg` (corrompidos)

- ✅ **Configurações Dinâmicas**: Sistema usa Supabase para todas as configs
  - Criada tabela `configuracoes` com 20 configurações
  - API `/api/admin/config` refatorada (multi-config pattern)
  - `gerador-rapido.tsx` sincroniza HSP automaticamente
  - `gerar-proposta.ts` usa configs do Supabase em todos os fallbacks
  - **HSP 5.30** (ou qualquer valor) agora reflete em todo o app

**🎨 Melhorias UI/UX:**
- ✅ Removidos cards desnecessários do admin (Google Drive, Atualizar)
- ✅ Admin dashboard mais limpo e focado
- ✅ Sistema totalmente sem hardcode - 100% configurável

**🛠️ Ferramentas Criadas:**
- ✅ `convert-svg-to-png.html` - Conversor web SVG → PNG
- ✅ 4 scripts SQL para configurações (criar, inserir, testar, refresh)
- ✅ `test-supabase-config.js` - Teste direto da API Supabase

**📦 Arquivos Modificados:**
- `src/pages/gerador-rapido.tsx` - Window fix + config sync
- `src/pages/api/admin/config.ts` - Multi-config pattern
- `src/pages/api/gerar-proposta.ts` - HSP fallbacks (4 locais)
- `src/pages/admin/index.tsx` - Removido botão "Atualizar"
- `src/pages/_document.tsx` - Favicon links
- `public/manifest.json` - Icons SVG

**📦 Deploy:**
- Commits: `2c59087`, `430e9f4`, `ce0a7a3`
- Branch: `clean-main`
- URL: https://pieng-propostas.vercel.app

---

### **v2.2.5** - 18/11/2025
**Status**: 🟢 Em Produção (Vercel)

**🔧 Correções:**
- ✅ Corrigido erro 500 em `/api/admin/orcamentos/[cliente]` - integração completa com Supabase
- ✅ Orçamentos agora persistem no banco de dados (tabela `orcamentos`)
- ✅ GET/POST/PUT/DELETE de orçamentos funcionando com Supabase-first
- ✅ Configuração do ESLint (eslint@8.57.0 compatível com Next.js 13.5.6)

**✨ Melhorias:**
- ✅ Criado `src/utils/orcamentosSupabase.ts` para gerenciar orçamentos no Supabase
- ✅ Resolução automática de cliente por ID, slug, nome ou pasta
- ✅ Mapeamento robusto de dados do Supabase para formato da API
- ✅ Fallback seguro para filesystem em desenvolvimento
- ✅ Documentação atualizada com integração de orçamentos

**📦 Deploy:**
- Commits: `2b43b4d`
- Branch: `clean-main`
- URL: https://pieng-propostas.vercel.app

---

### **v2.2.4** - 18/11/2025
**Status**: 🟡 Substituído

**🔧 Correções:**
- ✅ `/api/admin/clientes` não quebra mais com dados incompletos do Supabase
- ✅ `/api/admin/clientes/[id]` busca/atualiza clientes direto no Supabase
- ✅ `/api/admin/config` persiste no banco com fallback seguro

**✨ Melhorias:**
- ✅ Rota de diagnóstico `/api/test-cliente-padrao` adicionada
- ✅ Badge e documentação atualizados para v2.2.4
- ✅ Logs informam fonte dos dados (Supabase x filesystem)

**📦 Deploy:**
- Commits: `0c9fe94`, `c562be1`
- Branch: `clean-main`
- URL: https://pieng-propostas.vercel.app

---

### **v2.2.3** - 17/11/2025
**Status**: 🟡 Substituído

**🔧 Correções:**
- ✅ Corrigido erro de build Vercel - Next.js 13.5.6 e SWC packages
- ✅ Corrigido erro ReferenceError propostasGeradas - inicialização de variáveis
- ✅ Corrigido link quebrado consultor-interface.html
- ✅ Supabase client null-safe - não quebra build sem variáveis
- ✅ Removida página obsoleta proposta-supabase/[slug]
- ✅ Melhorado tratamento de erros Supabase nas APIs
- ✅ Adicionado debug e fallback para variáveis Supabase no Vercel

**✨ Melhorias:**
- ✅ Logs de debug melhorados para diagnóstico de variáveis
- ✅ Mensagens de erro mais informativas
- ✅ Documentação atualizada (VERIFICAR_VARIAVEIS_VERCEL.md)

**📦 Deploy:**
- Commits: `1ebfa17`, `c356723`, `e4b0a08`, `a12f054`, `68d8118`, `53aad79`, `89aa467`
- Branch: `clean-main`
- URL: https://pieng-propostas.vercel.app

---

### **v2.2.2** - 06/11/2025
**Status**: 🟡 Substituído

**🔧 Correções:**
- ✅ Integração Supabase completa
- ✅ Persistência de dados em produção

---

### **v2.2.1** - 31/10/2025
**Status**: 🟡 Substituído

**🔧 Correções:**
- ✅ Melhorias no admin dashboard

---

### **v2.2.0** - 26/10/2025
**Status**: 🟡 Substituído

---

### **v2.1.0** - 25/10/2025
**Status**: 🟢 Em Produção (Vercel)

**🔧 Correções:**
- ✅ Correção erro 500 em `/api/admin/clientes`
- ✅ Validação segura de ordenação de datas
- ✅ Error handling melhorado com logs detalhados
- ✅ Previne crash quando data está em formato inválido

**✨ Melhorias:**
- ✅ Badge de versão minimalista no admin
- ✅ Sistema de controle de versão implementado
- ✅ Documentação atualizada (README + CLAUDE.md + VERSION.md)

**📦 Deploy:**
- Commit: `51b1d72` - API clientes fix
- Branch: `clean-main`
- URL: https://pieng-propostas.vercel.app

---

### **v2.0.1** - 24/10/2025
**Status**: 🟡 Substituído

**🔧 Correções:**
- ✅ CSS inline híbrido com fallback robusto
- ✅ Procura CSS em 3 locais diferentes
- ✅ Fallback para `<link>` se inline falhar

**📦 Deploy:**
- Commit: `e14f2f8`
- Funcionalidade: CSS inline + fallback

---

### **v2.0.0** - 24/10/2025
**Status**: 🟡 Substituído

**🔧 Correções:**
- ✅ Force redeploy para corrigir CSS 404
- ✅ CSS agora carrega corretamente (200 OK)

**📦 Deploy:**
- Commit: `0981ba2`
- Issue resolvido: CSS retornando 404

---

### **v1.9.0** - 22/10/2025
**Status**: 🔴 Substituído

**📝 Documentação:**
- ✅ Atualização do CLAUDE.md com correção erro 500
- ✅ Documentação do fix CSS para public/

**📦 Deploy:**
- Commit: `19f8fe4`

---

### **v1.8.0** - Outubro 2025
**Status**: 🔴 Substituído

**🚀 Features Anteriores:**
- ✅ Migração Netlify → Vercel completa
- ✅ Sistema de propostas públicas
- ✅ Admin dashboard funcional
- ✅ Gerador rápido
- ✅ Integração Google Drive

---

## 🎯 **ROADMAP FUTURO**

### **v2.2.0** - Próxima versão (Planejado)
- [ ] Implementar Supabase Storage para persistência
- [ ] Configurar backup automático
- [ ] Otimizar cache de propostas
- [ ] Adicionar monitoramento de erros

### **v2.3.0** - Médio prazo
- [ ] Migrar para React Components (template engine)
- [ ] Implementar CSS Modules
- [ ] Adicionar testes automatizados
- [ ] Sistema de notificações

### **v3.0.0** - Longo prazo (se necessário)
- [ ] Migração para Docker (se volume crescer)
- [ ] Banco de dados PostgreSQL
- [ ] Sistema de filas (Bull/Redis)
- [ ] WebSockets para atualizações em tempo real

---

## 📊 **COMPATIBILIDADE**

| Ambiente | Status | Versão Testada |
|----------|--------|----------------|
| Vercel Produção | ✅ Funcionando | v2.1.0 |
| Vercel Preview | ✅ Funcionando | v2.1.0 |
| Local (dev) | ✅ Funcionando | v2.1.0 |
| Netlify | ⚠️ Descontinuado | - |

---

## 🔧 **DEPENDÊNCIAS PRINCIPAIS**

```json
{
  "next": "13.5.11",
  "react": "18.2.0",
  "typescript": "5.x",
  "tailwindcss": "3.x"
}
```

---

## 📝 **COMO VERIFICAR VERSÃO**

### **Na produção:**
1. Acesse: https://pieng-propostas.vercel.app/admin
2. Badge de versão aparece no header: **v2.1.0**

### **No código:**
```bash
# Ver última versão deployada
git log --oneline -1

# Ver histórico de versões
cat VERSION.md
```

---

## 🎓 **CONVENÇÃO DE VERSIONAMENTO**

Seguimos **Semantic Versioning** (SemVer):

```
MAJOR.MINOR.PATCH

v2.1.0
│ │ │
│ │ └─ PATCH: Bug fixes, correções menores
│ └─── MINOR: Novas features, melhorias
└───── MAJOR: Mudanças breaking, refatorações grandes
```

**Exemplos:**
- `v2.0.0 → v2.0.1`: Correção de bug (patch)
- `v2.0.1 → v2.1.0`: Nova feature (minor)
- `v2.1.0 → v3.0.0`: Breaking change (major)

---

**Última atualização**: 17/11/2025 - 15:30
**Mantenedor**: Flavio + Claude Code
**Repositório**: https://github.com/Flavioprogramador123/PIENG-PROPOSTAS-SOLARES
