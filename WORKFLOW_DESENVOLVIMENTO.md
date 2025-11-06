# 🔒 Workflow de Desenvolvimento Seguro - PIENG Propostas

**Objetivo:** Proteger o ambiente de produção e os links de propostas enviados aos clientes

---

## 🌳 Estrutura de Branches

```
main (DEPRECATED - não usar)
  ↓
clean-main (PRODUÇÃO - PROTEGIDO)
  ↓
desenvolvimento (DESENVOLVIMENTO - trabalhe aqui)
  ↓
feature/* (FEATURES - branches temporários)
```

### 📋 Descrição dos Branches

| Branch | Ambiente | Auto-Deploy | Propósito |
|--------|----------|-------------|-----------|
| `clean-main` | **PRODUÇÃO** | ✅ Vercel | Links enviados aos clientes |
| `desenvolvimento` | **DEV** | ❌ Não | Desenvolvimento e testes |
| `feature/*` | **LOCAL** | ❌ Não | Features isoladas |

---

## 🚀 Fluxo de Trabalho Diário

### 1️⃣ Iniciar Nova Feature

```bash
# Atualizar branch desenvolvimento
git checkout desenvolvimento
git pull origin desenvolvimento

# Criar branch de feature (opcional para features grandes)
git checkout -b feature/nome-da-feature
```

### 2️⃣ Desenvolver e Testar Localmente

```bash
# Instalar dependências
npm install

# Rodar servidor local
npm run dev

# Testar em: http://localhost:3000
```

**✅ Checklist de Testes Locais:**
- [ ] `/admin` - Dashboard funciona
- [ ] `/gerador-rapido` - Gerar proposta de teste
- [ ] `/proposta/[slug]` - Visualizar proposta gerada
- [ ] Console sem erros críticos
- [ ] TypeScript compila: `npx tsc --noEmit`

### 3️⃣ Commit das Alterações

```bash
# Adicionar arquivos
git add .

# Commit com mensagem descritiva
git commit -m "✨ FEAT: Descrição da mudança

- Detalhe 1
- Detalhe 2

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"

# Push para branch de desenvolvimento
git push origin desenvolvimento
# OU (se em feature branch)
git push origin feature/nome-da-feature
```

### 4️⃣ Merge para Produção (CUIDADO!)

```bash
# ⚠️ ATENÇÃO: Só faça merge quando tiver CERTEZA que está tudo funcionando!

# 1. Atualizar desenvolvimento
git checkout desenvolvimento
git pull origin desenvolvimento

# 2. Atualizar clean-main
git checkout clean-main
git pull origin clean-main

# 3. Fazer merge (--no-ff para manter histórico)
git merge desenvolvimento --no-ff -m "🚀 DEPLOY: Descrição das mudanças"

# 4. Push (dispara deploy automático no Vercel)
git push origin clean-main

# 5. Voltar para desenvolvimento
git checkout desenvolvimento
```

**⚠️ REGRA DE OURO:** Nunca commite direto em `clean-main`!

---

## 🛡️ Proteções Implementadas

### 1. Proteção de Propostas no Supabase

**Como funciona:**
- Propostas em produção têm `status: 'ativa'`
- Links enviados aos clientes SEMPRE buscam do Supabase primeiro
- Filesystem é apenas fallback para desenvolvimento local

**Garantias:**
- ✅ Links enviados aos clientes NUNCA quebram
- ✅ Propostas persistem mesmo após redeploy
- ✅ Desenvolvimento local não afeta produção

### 2. Variáveis de Ambiente Separadas

```
Desenvolvimento (Local):
  - .env.local
  - Pode usar Supabase de teste
  - Pode gerar propostas de teste

Produção (Vercel):
  - Environment Variables no Dashboard
  - Supabase de PRODUÇÃO (dados reais)
  - Todas propostas são persistidas
```

### 3. Branches Protegidos

**Configurar no GitHub** (Recomendado):
1. Ir em: `Settings` → `Branches` → `Branch protection rules`
2. Proteger `clean-main`:
   - ✅ Require pull request reviews before merging
   - ✅ Require status checks to pass before merging
   - ✅ Include administrators (opcional)

---

## 📊 Monitoramento de Deploy

### Vercel Dashboard
- URL: https://vercel.com/dashboard
- Ver deploys: https://vercel.com/seu-usuario/pieng-propostas/deployments
- Logs em tempo real disponíveis

### Checklist Pós-Deploy

Após push para `clean-main`, verificar:

1. **Deploy Status** (Vercel Dashboard)
   - [ ] Build completed successfully
   - [ ] No errors in build logs

2. **Funcionalidades Críticas**
   - [ ] https://pieng-propostas.vercel.app/admin (Dashboard)
   - [ ] https://pieng-propostas.vercel.app/gerador-rapido (Gerador)
   - [ ] Propostas antigas ainda acessíveis (testar links enviados)

3. **APIs Críticas**
   - [ ] `/api/admin/orcamentos-todos` (retorna propostas)
   - [ ] `/api/propostas-publicas` (lista públicas)
   - [ ] `/api/test-supabase` (conexão OK)

---

## 🆘 Rollback de Emergência

### Se algo der errado em produção:

#### Opção 1: Rollback pelo Vercel (RÁPIDO - 1 minuto)
1. Acesse: https://vercel.com/seu-usuario/pieng-propostas/deployments
2. Encontre o deploy anterior que funcionava
3. Clique em "..." → "Promote to Production"
4. ✅ Sistema volta ao estado anterior imediatamente

#### Opção 2: Rollback pelo Git (5 minutos)
```bash
# Ver histórico de commits
git log --oneline -10

# Reverter para commit anterior
git checkout clean-main
git reset --hard COMMIT_HASH_BOM
git push origin clean-main --force

# ⚠️ CUIDADO: --force sobrescreve histórico!
```

#### Opção 3: Revert commit específico (SEGURO)
```bash
# Reverter commit problemático mantendo histórico
git checkout clean-main
git revert COMMIT_HASH_RUIM
git push origin clean-main
```

---

## 🧪 Testes Antes de Deploy

### Checklist Completo

#### Funcionalidades Core
- [ ] Criar novo cliente
- [ ] Gerar proposta (gerador-rápido)
- [ ] Ver proposta pública (`/proposta/[slug]`)
- [ ] Lista de orçamentos (`/admin/orcamentos`)
- [ ] Configurações do sistema

#### APIs Críticas
- [ ] `/api/admin/clientes` - Lista clientes
- [ ] `/api/gerar-proposta` - Gera proposta
- [ ] `/api/admin/orcamentos-todos` - Lista orçamentos

#### Integrações
- [ ] Supabase conectando (ver `/api/test-supabase`)
- [ ] AI extraction funcionando (testar upload PDF)
- [ ] Links de WhatsApp funcionando

#### Performance
- [ ] Build local sem erros: `npm run build`
- [ ] TypeScript sem erros: `npx tsc --noEmit`
- [ ] Páginas carregam < 3 segundos

---

## 📝 Convenções de Commit

Use emojis para identificar tipo de mudança:

```
✨ FEAT: Nova funcionalidade
🔧 FIX: Correção de bug
📝 DOCS: Documentação
🎨 STYLE: Formatação/estilo (não afeta código)
♻️ REFACTOR: Refatoração
⚡ PERF: Performance
✅ TEST: Testes
🗂️ CHORE: Manutenção/organização
🚀 DEPLOY: Deploy para produção
🔒 SECURITY: Segurança
```

Exemplo:
```
🔧 FIX: Corrigir fallback de especificações nas propostas

- Mudança de || para !== undefined
- Logs adicionados para debug
- Correção em 3 locais

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## 🎯 Boas Práticas

### ✅ FAZER
- Sempre trabalhar em `desenvolvimento` ou `feature/*`
- Testar localmente antes de merge
- Documentar mudanças importantes
- Fazer commits pequenos e frequentes
- Testar links de propostas após deploy

### ❌ NÃO FAZER
- Commitar direto em `clean-main`
- Fazer push sem testar localmente
- Commitar arquivos `.env` ou credenciais
- Deletar propostas do Supabase sem backup
- Force push em `clean-main` sem necessidade

---

## 📞 Contatos de Emergência

**Se algo crítico quebrar em produção:**

1. 🚨 **Rollback imediato** (Opção 1 do Vercel)
2. 📞 **Avisar equipe** (se houver)
3. 🔍 **Investigar logs** (Vercel Dashboard → Logs)
4. 🛠️ **Corrigir em desenvolvimento**
5. ✅ **Testar exaustivamente**
6. 🚀 **Deploy novamente**

---

**Última Atualização:** 06/11/2025
**Versão do Documento:** 1.0
**Status:** ✅ Ativo - Seguir rigorosamente
