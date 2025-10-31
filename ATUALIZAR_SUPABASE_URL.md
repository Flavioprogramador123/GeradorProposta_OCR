# 🚨 AÇÃO URGENTE: Atualizar URL do Supabase

## ❌ Problema Identificado

Você está usando um projeto Supabase **DIFERENTE** do que está configurado no sistema:

**Projeto Atual (Correto):**
```
https://asmvbrcxzvfvvolnalxw.supabase.co
```

**Projeto Antigo (Errado - documentações antigas):**
```
https://ityeiqyjyhkmypjmnyhb.supabase.co
```

---

## ✅ SOLUÇÃO: Atualizar em 3 Lugares

### 1️⃣ Atualizar Variáveis no VERCEL

#### Passo a Passo:

1. Acesse: https://vercel.com/dashboard
2. Selecione o projeto: **pieng-propostas**
3. Vá em: **Settings** → **Environment Variables**

#### Atualizar/Adicionar as Variáveis:

**Variável 1: NEXT_PUBLIC_SUPABASE_URL**
```
Nome: NEXT_PUBLIC_SUPABASE_URL
Valor CORRETO: https://asmvbrcxzvfvvolnalxw.supabase.co
Ambientes: ✅ Production ✅ Preview ✅ Development
```

**Variável 2: NEXT_PUBLIC_SUPABASE_ANON_KEY**
```
Nome: NEXT_PUBLIC_SUPABASE_ANON_KEY
Valor: [OBTER DO SUPABASE - veja abaixo]
Ambientes: ✅ Production ✅ Preview ✅ Development
```

#### Como Obter a Chave ANON:

1. Acesse: https://supabase.com/dashboard/project/asmvbrcxzvfvvolnalxw
2. Vá em: **Settings** (ícone de engrenagem) → **API**
3. Na seção **Project API keys**, copie a chave **`anon public`**
   - Ela começa com: `eyJ...`
   - É uma string longa (várias linhas)

#### Após Salvar:

1. Clique em **Save** para cada variável
2. Vá em: **Deployments**
3. Clique nos **"..."** do último deployment
4. Clique em **"Redeploy"**
5. ✅ Aguarde 2-3 minutos

---

### 2️⃣ Atualizar .env LOCAL

Crie/edite o arquivo `.env` na raiz do projeto:

```bash
# 🗄️ SUPABASE (Banco de Dados)
NEXT_PUBLIC_SUPABASE_URL=https://asmvbrcxzvfvvolnalxw.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ... [Cole aqui a chave anon do Supabase]
```

⚠️ **IMPORTANTE:** Este arquivo `.env` NÃO deve ser commitado no Git (já está no .gitignore).

---

### 3️⃣ Verificar Schema do Supabase

Certifique-se de que as tabelas estão criadas no **projeto correto**:

#### Acessar SQL Editor:

1. Acesse: https://supabase.com/dashboard/project/asmvbrcxzvfvvolnalxw
2. Vá em: **SQL Editor** (menu lateral)
3. Clique em: **+ New query**

#### Verificar Tabelas Existentes:

```sql
-- Listar todas as tabelas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;
```

**Resultado Esperado:**
```
clientes
propostas
orcamentos
configuracoes
```

#### Se NÃO Existirem as Tabelas:

Execute o schema completo do arquivo `supabase_schema.sql`:

1. Abra o arquivo `supabase_schema.sql` no seu projeto
2. Copie TODO o conteúdo (Ctrl+A, Ctrl+C)
3. Cole no SQL Editor do Supabase
4. Clique em **Run** (ou Ctrl+Enter)
5. Aguarde execução (10-15 segundos)

---

## ✅ Verificar se Funcionou

### Teste 1: Conexão Supabase

Após atualizar e fazer redeploy:

```
https://pieng-propostas-5exn1foih-solarsysclear.vercel.app/api/test-supabase
```

**Deve retornar:**
```json
{
  "success": true,
  "message": "Supabase configurado corretamente",
  "url": "https://asmvbrcxzvfvvolnalxw.supabase.co"
}
```

### Teste 2: Gerar Nova Proposta

1. Acesse: https://pieng-propostas-5exn1foih-solarsysclear.vercel.app/gerador-rapido
2. Carregue exemplo "Cliente Padrão"
3. Processe orçamentos
4. Clique em **"Gerar Proposta"**
5. ✅ Deve aparecer: "✅ Proposta salva no Supabase com sucesso!"

### Teste 3: Acessar Proposta

A URL da proposta gerada deve funcionar:
```
https://pieng-propostas-5exn1foih-solarsysclear.vercel.app/proposta/[slug-gerado]
```

---

## 📊 Checklist de Atualização

- [ ] **1. Acessei o Supabase correto:** https://supabase.com/dashboard/project/asmvbrcxzvfvvolnalxw
- [ ] **2. Copiei a URL:** `https://asmvbrcxzvfvvolnalxw.supabase.co`
- [ ] **3. Copiei a chave anon:** `eyJ...` (da seção Settings → API)
- [ ] **4. Atualizei `NEXT_PUBLIC_SUPABASE_URL` no Vercel**
- [ ] **5. Atualizei `NEXT_PUBLIC_SUPABASE_ANON_KEY` no Vercel**
- [ ] **6. Marquei TODOS os ambientes** (Production, Preview, Development)
- [ ] **7. Fiz Redeploy no Vercel**
- [ ] **8. Aguardei 2-3 minutos**
- [ ] **9. Testei `/api/test-supabase`** → Retornou `success: true`
- [ ] **10. Verifiquei se tabelas existem no SQL Editor**
- [ ] **11. Se não existem, executei `supabase_schema.sql`**
- [ ] **12. Gerei nova proposta no `/gerador-rapido`**
- [ ] **13. Proposta funcionou sem 404** ✅

---

## 🔍 Verificar Projeto Correto no Supabase

Para ter certeza de que está no projeto correto:

1. Acesse: https://supabase.com/dashboard
2. Veja o nome do projeto (canto superior esquerdo)
3. A URL deve ser: `https://supabase.com/dashboard/project/asmvbrcxzvfvvolnalxw`
4. A Project URL deve ser: `https://asmvbrcxzvfvvolnalxw.supabase.co`

---

## ⚠️ IMPORTANTE

Todas as documentações antigas que mencionam `ityeiqyjyhkmypjmnyhb` estão **DESATUALIZADAS**. Use sempre:

✅ **CORRETO (seu projeto):**
```
https://asmvbrcxzvfvvolnalxw.supabase.co
```

❌ **ERRADO (projeto antigo nas docs):**
```
https://ityeiqyjyhkmypjmnyhb.supabase.co
```

---

## 📝 Após Atualizar

1. Teste a conexão: `/api/test-supabase`
2. Gere uma proposta de teste
3. Verifique se a proposta foi salva no Supabase (vá em **Table Editor** → **propostas**)
4. Acesse a URL da proposta gerada
5. ✅ Deve funcionar!

---

**Data:** 31/10/2025  
**Status:** 🔧 Ação necessária: Atualizar variáveis no Vercel  
**Prioridade:** 🚨 URGENTE  
**Tempo estimado:** 5-10 minutos

