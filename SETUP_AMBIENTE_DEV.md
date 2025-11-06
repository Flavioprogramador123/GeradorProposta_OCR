# 🔧 Setup de Ambiente de Desenvolvimento - PIENG Propostas

**Objetivo:** Configurar ambiente de desenvolvimento COMPLETAMENTE SEPARADO da produção para evitar danificar o sistema funcional.

---

## 🎯 Arquitetura de Ambientes

```
┌─────────────────────────────────────────────────────────────┐
│                    PRODUÇÃO (NÃO TOCAR!)                     │
├─────────────────────────────────────────────────────────────┤
│ Branch: clean-main                                           │
│ Vercel: pieng-propostas.vercel.app                          │
│ Supabase: asmvbrcxzvfvvolnalxw.supabase.co (PRODUÇÃO)      │
│ Dados: Propostas REAIS dos clientes                         │
│ Status: ✅ PROTEGIDO - Links dos clientes funcionando       │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│              DESENVOLVIMENTO (Trabalhe aqui)                 │
├─────────────────────────────────────────────────────────────┤
│ Branch: desenvolvimento                                      │
│ Vercel: pieng-propostas-dev.vercel.app (NOVO)              │
│ Supabase: [SEU-PROJETO-DEV].supabase.co (NOVO)             │
│ Dados: Propostas de TESTE                                   │
│ Status: 🔧 Desenvolvimento - Pode quebrar sem problema       │
└─────────────────────────────────────────────────────────────┘
```

---

## 📋 PASSO 1: Criar Projeto Supabase de Desenvolvimento

### 1.1. Criar Novo Projeto no Supabase

1. Acesse: https://supabase.com/dashboard
2. Clique em **"New Project"**
3. Preencha:
   - **Name:** `pieng-propostas-dev`
   - **Database Password:** *(anote em local seguro)*
   - **Region:** `South America (São Paulo)` (mais próximo)
   - **Pricing Plan:** `Free` (suficiente para dev)
4. Clique em **"Create new project"**
5. Aguarde ~2 minutos até o projeto estar pronto

### 1.2. Copiar Credenciais de DEV

1. No projeto DEV, vá em: **Settings** → **API**
2. Copie as credenciais:

```bash
# Credenciais de DESENVOLVIMENTO (anote separado!)
Project URL: https://[seu-projeto-dev].supabase.co
anon public: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (DIFERENTE da produção)
service_role: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (NUNCA exponha!)
```

### 1.3. Criar Tabelas no Supabase DEV

Execute no **SQL Editor** do Supabase DEV:

```sql
-- ============================================
-- TABELA: clientes
-- ============================================
CREATE TABLE IF NOT EXISTS clientes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  email TEXT,
  telefone TEXT,
  cidade TEXT,
  estado TEXT DEFAULT 'GO',
  tipo_imovel TEXT DEFAULT 'residencial',
  consumo_mensal DECIMAL(10,2),
  hsp_local DECIMAL(5,2) DEFAULT 5.21,
  pdespesa DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT DEFAULT 'ativo'
);

-- ============================================
-- TABELA: propostas
-- ============================================
CREATE TABLE IF NOT EXISTS propostas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE,
  slug TEXT UNIQUE NOT NULL,
  titulo TEXT,
  template_usado TEXT DEFAULT 'pieng_basic',
  sistema_kwp DECIMAL(10,2),
  geracao_mensal DECIMAL(10,2),
  geracao_anual DECIMAL(10,2),
  valor_total DECIMAL(10,2),
  valor_kwp DECIMAL(10,2),
  payback INTEGER,
  tir DECIMAL(5,2),
  dados_completos JSONB,
  html_gerado TEXT,
  status TEXT DEFAULT 'ativa',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TABELA: orcamentos
-- ============================================
CREATE TABLE IF NOT EXISTS orcamentos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE,
  proposta_id UUID REFERENCES propostas(id) ON DELETE CASCADE,
  fornecedor TEXT,
  potencia_kwp DECIMAL(10,2),
  preco_custo DECIMAL(10,2),
  preco_total DECIMAL(10,2),
  modulos_quantidade INTEGER,
  modulos_marca TEXT,
  modulos_potencia INTEGER,
  inversores_quantidade INTEGER,
  inversores_marca TEXT,
  inversores_potencia DECIMAL(10,2),
  dados_completos JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT DEFAULT 'pendente'
);

-- ============================================
-- TABELA: configuracoes
-- ============================================
CREATE TABLE IF NOT EXISTS configuracoes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  chave TEXT UNIQUE NOT NULL,
  valor JSONB NOT NULL,
  descricao TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- ÍNDICES (Performance)
-- ============================================
CREATE INDEX IF NOT EXISTS idx_propostas_slug ON propostas(slug);
CREATE INDEX IF NOT EXISTS idx_propostas_cliente_id ON propostas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_propostas_status ON propostas(status);
CREATE INDEX IF NOT EXISTS idx_orcamentos_cliente_id ON orcamentos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_clientes_status ON clientes(status);

-- ============================================
-- RLS (Row Level Security) - DESABILITAR PARA DEV
-- ============================================
ALTER TABLE clientes DISABLE ROW LEVEL SECURITY;
ALTER TABLE propostas DISABLE ROW LEVEL SECURITY;
ALTER TABLE orcamentos DISABLE ROW LEVEL SECURITY;
ALTER TABLE configuracoes DISABLE ROW LEVEL SECURITY;

-- ============================================
-- DADOS DE TESTE (Opcional)
-- ============================================
INSERT INTO clientes (nome, cidade, estado, consumo_mensal, tipo_imovel)
VALUES
  ('Cliente Teste 01', 'Anápolis', 'GO', 550, 'residencial'),
  ('Cliente Teste 02', 'Goiânia', 'GO', 800, 'comercial')
ON CONFLICT DO NOTHING;
```

---

## 📋 PASSO 2: Criar Projeto Vercel de Desenvolvimento

### 2.1. Importar Repositório no Vercel (Novamente)

1. Acesse: https://vercel.com/dashboard
2. Clique em **"Add New..."** → **"Project"**
3. Selecione o repositório: `GeradorProposta_OCR`
4. Configure:
   - **Project Name:** `pieng-propostas-dev`
   - **Framework Preset:** `Next.js`
   - **Root Directory:** `./` (padrão)
   - **Build Command:** `npm run build`
   - **Output Directory:** `.next`

### 2.2. Configurar Branch de Produção

1. Em **Git**, configure:
   - **Production Branch:** `desenvolvimento` (NÃO clean-main!)
   - **Deploy Hooks:** Desabilite (não precisa)

### 2.3. Configurar Environment Variables (DEV)

Em **Settings** → **Environment Variables**, adicione:

```bash
# ============================================
# 🗄️ SUPABASE DEV (OBRIGATÓRIO)
# ============================================
NEXT_PUBLIC_SUPABASE_URL=https://[seu-projeto-dev].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ... (do projeto DEV!)

# ============================================
# 🤖 AI PROVIDERS (Pode usar as mesmas chaves)
# ============================================
GEMINI_API_KEY=AIzaSy... (mesma da produção ou nova)
# OPENAI_API_KEY=sk-... (opcional)
# OPENROUTER_API_KEY=sk-or-... (opcional)

# ============================================
# 🔧 AMBIENTE
# ============================================
NODE_ENV=development
NEXTAUTH_URL=https://pieng-propostas-dev.vercel.app

# ============================================
# ☁️ GOOGLE DRIVE (Opcional - pode omitir)
# ============================================
# GOOGLE_DRIVE_CLIENT_ID=...
# GOOGLE_DRIVE_CLIENT_SECRET=...
# GOOGLE_DRIVE_REFRESH_TOKEN=...
```

**⚠️ IMPORTANTE:** Use as credenciais do **Supabase DEV**, NÃO da produção!

### 2.4. Deploy Inicial

1. Clique em **"Deploy"**
2. Aguarde o build (~2-3 minutos)
3. Após deploy, acesse: `https://pieng-propostas-dev.vercel.app`

---

## 📋 PASSO 3: Configurar .env Local

### 3.1. Criar arquivo .env.local (Desenvolvimento Local)

No diretório do projeto:

```bash
# Copiar exemplo
cp .env.example .env.local
```

### 3.2. Editar .env.local com credenciais DEV

```bash
# ============================================
# 🗄️ SUPABASE DEV (Local)
# ============================================
NEXT_PUBLIC_SUPABASE_URL=https://[seu-projeto-dev].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ... (do projeto DEV!)

# ============================================
# 🤖 AI PROVIDERS
# ============================================
GEMINI_API_KEY=AIzaSy...

# ============================================
# 🔧 AMBIENTE
# ============================================
NODE_ENV=development
NEXTAUTH_URL=http://localhost:3000
```

**⚠️ NUNCA commite o arquivo .env.local!** (Já está no .gitignore)

---

## 📋 PASSO 4: Testar Ambiente de Desenvolvimento

### 4.1. Testar Localmente

```bash
# Garantir que está no branch correto
git checkout desenvolvimento
git pull origin desenvolvimento

# Instalar dependências
npm install

# Rodar servidor local
npm run dev

# Abrir: http://localhost:3000
```

### 4.2. Checklist de Testes DEV

- [ ] **Dashboard** - `http://localhost:3000/admin`
- [ ] **Criar Cliente Teste** - `/admin/novo-cliente`
- [ ] **Gerar Proposta Teste** - `/gerador-rapido`
- [ ] **Ver Proposta** - `/proposta/[slug-teste]`
- [ ] **Propostas Públicas** - `/propostas-publicas`
- [ ] **Console sem erros críticos**
- [ ] **Supabase conectando** - `/api/test-supabase`

### 4.3. Verificar Isolamento

**CONFIRMAR QUE:**
- ✅ Dados NÃO aparecem na produção (`clean-main`)
- ✅ Propostas de teste estão APENAS no Supabase DEV
- ✅ URLs DEV: `pieng-propostas-dev.vercel.app`
- ✅ URLs PROD: `pieng-propostas.vercel.app` (intocadas)

---

## 🔄 Workflow Diário com 2 Ambientes

### Desenvolvimento e Testes

```bash
# 1. Trabalhe em desenvolvimento
git checkout desenvolvimento

# 2. Desenvolva features
# (suas mudanças vão para Supabase DEV)

# 3. Teste localmente
npm run dev

# 4. Push para Vercel DEV (auto-deploy)
git push origin desenvolvimento
# Deploy automático em: pieng-propostas-dev.vercel.app

# 5. Teste no Vercel DEV antes de promover
```

### Promover para Produção (Quando tudo OK)

```bash
# 1. Garantir que está tudo testado em DEV
# Testar: https://pieng-propostas-dev.vercel.app

# 2. Merge para produção
git checkout clean-main
git merge desenvolvimento --no-ff -m "🚀 DEPLOY: Descrição"
git push origin clean-main

# 3. Deploy automático em: pieng-propostas.vercel.app

# 4. Monitorar deploy no Vercel Dashboard

# 5. Testar funcionalidades críticas em PROD
```

---

## 🛡️ Proteções Implementadas

| Aspecto | Desenvolvimento | Produção |
|---------|----------------|----------|
| **Branch** | `desenvolvimento` | `clean-main` |
| **Vercel** | `pieng-propostas-dev` | `pieng-propostas` |
| **Supabase** | Projeto DEV (novo) | Projeto PROD (protegido) |
| **Dados** | Testes/Mockups | Clientes REAIS |
| **Links** | DEV URL | Links enviados aos clientes |
| **Deploy** | Automático (dev) | Automático (clean-main) |
| **Rollback** | Fácil, sem impacto | Crítico, afeta clientes |

---

## ⚠️ REGRAS DE OURO

### ✅ SEMPRE FAÇA:
1. Desenvolva em `desenvolvimento`
2. Use Supabase DEV para testes
3. Teste localmente antes de push
4. Verifique no Vercel DEV antes de promover
5. Faça backup antes de mudanças críticas

### ❌ NUNCA FAÇA:
1. Commitar direto em `clean-main`
2. Usar credenciais de PROD no .env.local
3. Testar features com dados de clientes reais
4. Push sem testar localmente
5. Deletar dados do Supabase PROD

---

## 🆘 Troubleshooting

### Problema: Dados de PROD aparecem no DEV

**Causa:** Usando credenciais erradas no .env.local

**Solução:**
```bash
# Verificar qual Supabase está conectado
curl http://localhost:3000/api/test-supabase

# Deve retornar URL do Supabase DEV, NÃO produção
# Se retornar produção, corrigir .env.local
```

### Problema: Deploy DEV não acontece automaticamente

**Causa:** Vercel pode estar configurado apenas para `clean-main`

**Solução:**
1. Vercel Dashboard → Seu Projeto DEV
2. Settings → Git
3. Garantir que **Production Branch = `desenvolvimento`**
4. Fazer novo push para testar

### Problema: Propostas de teste aparecem na produção

**Causa:** Merge acidental ou Supabase compartilhado

**Solução:**
```bash
# Verificar branch atual
git branch

# Se estiver em clean-main por engano:
git checkout desenvolvimento

# Limpar propostas de teste do Supabase PROD (com cuidado!)
# Via Supabase Dashboard → Table Editor → propostas
# Deletar apenas as com nome "teste"
```

---

## 📊 Checklist Final de Setup

### Supabase DEV
- [ ] Projeto criado: `pieng-propostas-dev`
- [ ] Tabelas criadas (SQL executado)
- [ ] Credenciais copiadas e salvas
- [ ] Dados de teste inseridos

### Vercel DEV
- [ ] Projeto criado: `pieng-propostas-dev`
- [ ] Production Branch = `desenvolvimento`
- [ ] Environment Variables configuradas (Supabase DEV)
- [ ] Deploy inicial feito e funcionando

### Ambiente Local
- [ ] `.env.local` criado com credenciais DEV
- [ ] `npm install` executado
- [ ] `npm run dev` funcionando
- [ ] Todos os testes passando

### Validação Final
- [ ] Links DEV não apontam para PROD
- [ ] Dados de teste APENAS no Supabase DEV
- [ ] Produção continua funcionando normalmente
- [ ] Workflow de deploy testado (dev → prod)

---

## 📞 Suporte

**Se algo der errado:**
1. 🔄 Rollback no Vercel (promote deploy anterior)
2. 📧 Verificar logs: Vercel Dashboard → Deployments → Logs
3. 🔍 Testar Supabase: `/api/test-supabase`
4. 📝 Consultar: `WORKFLOW_DESENVOLVIMENTO.md`

---

**✅ Com esse setup, você pode desenvolver com segurança sem nunca tocar na produção!**

**Última Atualização:** 06/11/2025
**Versão:** 1.0
**Status:** ✅ Pronto para uso
