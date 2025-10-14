# 🏗️ ARQUITETURA DO SISTEMA DE PROPOSTAS

## 📊 **2 SISTEMAS SEPARADOS**

### **1. Vercel (Next.js) - ADMIN E SISTEMA INTERNO**
**URL Base:** https://pieng-propostas.vercel.app

**Função:** Sistema administrativo interno

**Páginas:**
- `/admin` → Dashboard administrativo
- `/admin/orcamentos` → Gerenciar orçamentos
- `/gerador-rapido` → Criar propostas
- `/proposta/[slug]` → ⚠️ **PREVIEW (dados fake se não encontrar)**

**Características:**
- ✅ APIs dinâmicas
- ✅ Autenticação
- ✅ Gerenciamento de clientes
- ⚠️ NÃO tem acesso aos arquivos após build
- ⚠️ Páginas de proposta usam fallback para dados exemplo

**Quando usar:**
- Administração do sistema
- Criar/editar clientes
- Visualizar orçamentos
- Configurações

---

### **2. Netlify (HTML Estático) - PROPOSTAS PÚBLICAS**
**URL Base:** https://pieng-propostas-solares.netlify.app

**Função:** Servir propostas reais para clientes

**Arquivos:**
- `/index.html` → Lista de todas propostas
- `/propostas-publicas.html` → Página dedicada de propostas
- `/orçamento/clientes/proposta_[cliente].html` → **PROPOSTAS REAIS** ⭐
- `/orçamento/clientes/proposta_resultados_[cliente].html` → Resultados detalhados

**Características:**
- ✅ HTML estático (super rápido)
- ✅ Dados reais dos clientes
- ✅ Propostas completas com todos sistemas
- ✅ CDN global (Netlify)
- ✅ Acessível publicamente

**Quando usar:**
- Enviar propostas para clientes
- Links no WhatsApp
- Apresentações comerciais
- Compartilhamento público

---

## 🔄 **FLUXO DE DADOS**

### **Origem dos Dados:**
```
src/data/clientes/
├── marcelo-14-10-2025/
│   ├── proposta.json           # Dados estruturados
│   ├── proposta_marcelo.html   # HTML gerado
│   └── proposta_resultados.html # Resultados
└── ...
```

### **Build/Deploy:**

#### **Passo 1: Gerar Propostas (Local)**
```bash
# Você executa o gerador
node scripts/gerar-proposta.js

# Cria arquivos em src/data/clientes/[cliente]/
```

#### **Passo 2: Copiar para Netlify**
```bash
# Manual ou via script
cp src/data/clientes/*/proposta*.html pastanetilify/orçamento/clientes/
```

#### **Passo 3: Commit e Push**
```bash
git add .
git commit -m "Adiciona proposta Marcelo"
git push

# GitHub Actions:
# ✅ Deploy automático Vercel (admin)
# ✅ Deploy automático Netlify (propostas)
```

---

## 🔗 **URLs CORRETAS**

### **❌ ERRADO (Dados Fake):**
```
https://pieng-propostas.vercel.app/proposta/marcelo-14-10-2025
```
**Por quê?** Esta é a página Next.js que tenta carregar de `src/data/clientes/` mas após o build esses arquivos não existem no Vercel. Usa fallback com dados exemplo.

### **✅ CORRETO (Dados Reais):**
```
https://pieng-propostas-solares.netlify.app/orçamento/clientes/proposta_marcelo-14-10-2025.html
```
**Por quê?** HTML estático gerado localmente com todos os dados reais do cliente. Copiado para `pastanetilify/` e deployado no Netlify.

---

## 🎯 **QUANDO USAR CADA UM**

### **Use Vercel (pieng-propostas.vercel.app):**
- ✅ Trabalho interno da equipe
- ✅ Criar novos clientes
- ✅ Gerenciar orçamentos
- ✅ Configurações do sistema
- ✅ Dashboard administrativo

### **Use Netlify (pieng-propostas-solares.netlify.app):**
- ✅ Enviar propostas para clientes
- ✅ Links no WhatsApp
- ✅ Apresentações comerciais
- ✅ Compartilhamento público
- ✅ **SEMPRE para propostas reais**

---

## 🔧 **BOTÕES NO ADMIN**

### **Botão "📋 Orçamentos"**
→ Abre `/admin/orcamentos/[cliente]` (Vercel)
→ Sistema interno

### **Botão "👁️ Ver Real"** ⭐
→ Abre `https://pieng-propostas-solares.netlify.app/orçamento/clientes/proposta_[cliente].html`
→ **Proposta real do Netlify**

### **Botão "💬 WhatsApp"** ⭐
→ Abre WhatsApp com mensagem pré-formatada
→ Inclui link do **Netlify** (proposta real)

### **Botão "🔗 Copiar"** ⭐
→ Copia link do **Netlify** para área de transferência
→ Proposta real

---

## 📝 **RESUMO VISUAL**

```
┌─────────────────────────────────────────────────────┐
│               SISTEMA PIENG                         │
├─────────────────────────────────────────────────────┤
│                                                     │
│  🖥️  VERCEL (Interno)                               │
│  ├── Admin Dashboard                               │
│  ├── Orçamentos                                    │
│  ├── Configurações                                 │
│  └── Gerador de Propostas                         │
│                                                     │
│  🌐  NETLIFY (Público)                              │
│  ├── Propostas Reais (HTML)                       │
│  ├── Lista de Propostas                           │
│  └── Links para Clientes                          │
│                                                     │
└─────────────────────────────────────────────────────┘

       │                          │
       │                          │
       ▼                          ▼

  EQUIPE INTERNA           CLIENTES EXTERNOS

```

---

## ⚠️ **IMPORTANTE**

### **Nunca envie links do Vercel para clientes!**
❌ `pieng-propostas.vercel.app/proposta/...` → Dados fake
✅ `pieng-propostas-solares.netlify.app/orçamento/clientes/proposta_...` → Dados reais

### **Propostas reais estão no Netlify**
Todos os botões WhatsApp e Copiar Link agora apontam corretamente para o Netlify.

### **Admin é privado, Netlify é público**
- Vercel = Sistema interno (senha/auth futura)
- Netlify = Propostas públicas (acessível a todos)

---

## 🚀 **PRÓXIMOS PASSOS**

1. **Automatizar cópia** de `src/data/clientes/` para `pastanetilify/`
2. **Remover página fake** `/proposta/[slug]` do Vercel
3. **Adicionar autenticação** no admin do Vercel
4. **Sincronizar** com Google Drive

---

**Documentação atualizada em:** $(date)
**Versão:** 2.0
