# 📌 PIENG PROPOSTAS - CONTROLE DE VERSÃO

## 🎯 **VERSÃO ATUAL: v2.3.3** (02/12/2025)

---

## 📋 **HISTÓRICO DE VERSÕES**

### **v2.3.3** - 02/12/2025 ✅ **ATUAL**
**Status**: 🟢 Em Produção (Vercel)

**🔧 Correções Críticas:**
- ✅ **Busca de Dados do Supabase**: Removido uso de valores hardcode ao carregar propostas existentes
  - Função `carregarPropostaExistente` agora busca dados atualizados do cliente do Supabase
  - API `/api/propostas/[slug]` busca dados atualizados do cliente usando `cliente_id`
  - Carrega configurações do sistema (`pdespesaFixo`, `pdespesaVariavel`) do Supabase
  - Prioridade: Supabase > Proposta > Config Sistema > Fallback mínimo

- ✅ **Correção de Sintaxe**: Corrigido erro de sintaxe em `gerador-rapido.tsx`
  - Removido `}` extra que causava erro de compilação
  - Ajustada indentação do bloco `if (pcusto <= 0)`

- ✅ **Valores de Orçamentos**: Melhorada extração de valores dos sistemas
  - Adicionado fallback usando `valor_total` da proposta quando sistemas não têm valor
  - Logs detalhados para debug quando valores não são encontrados
  - Suporte a múltiplos campos: `ppix`, `valorTotal`, `total_final`, `precoPixDecimal`, `pavista`

**🎨 Melhorias UI/UX:**
- ✅ Botões "Editar" unificados: `/admin` e `/admin/orcamentos` usam mesma função
  - Ambos buscam dados do Supabase através de `/api/propostas/[slug]`
  - Migrado de `window.location.search` para `useRouter` do Next.js
  - Logs melhorados para rastreamento

**🛠️ Ferramentas Criadas:**
- ✅ `test-supabase-monitor.ps1` - Script de teste automático para verificar busca do Supabase
- ✅ `GUIA_TESTE_SUPABASE.md` - Guia completo de testes e troubleshooting
- ✅ `diagnostico-erro.ps1` - Script de diagnóstico completo

**📦 Arquivos Modificados:**
- `src/pages/gerador-rapido.tsx` - Busca dados do Supabase, correção sintaxe, useRouter
- `src/pages/api/propostas/[slug].ts` - Busca dados atualizados do cliente do Supabase
- `src/pages/api/admin/orcamentos-todos.ts` - Melhorada extração de valores, logs detalhados
- `src/pages/admin/orcamentos/index.tsx` - Melhorada exibição de valores, interface atualizada
- `src/pages/admin/index.tsx` - Comentários adicionados nos botões
- `src/lib/supabase.ts` - `getPropostaBySlug` agora retorna `cliente_id`

**📦 Deploy:**
- Branch: `clean-main`
- URL: https://pieng-propostas.vercel.app

---

### **v2.3.2** - 01/12/2025
**Status**: 🟡 Substituído

**🔧 Correções:**
- ✅ Removido card "Novo Cliente" do admin
- ✅ Melhorias no carregamento de propostas existentes

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
