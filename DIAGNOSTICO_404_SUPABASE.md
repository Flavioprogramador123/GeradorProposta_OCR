# 🔍 DIAGNÓSTICO: Erro 404 em Propostas Supabase

## ❌ Problema Identificado

URL retornando 404:
```
https://pieng-propostas-5exn1foih-solarsysclear.vercel.app/proposta/cliente-padrao-0006-31-10-2025
```

## 🎯 Causa Provável

A proposta **NÃO ESTÁ SENDO SALVA** no Supabase ou as **variáveis de ambiente** não estão configuradas no Vercel.

---

## 🔧 SOLUÇÃO PASSO A PASSO

### 1️⃣ **Verificar se Supabase está Configurado**

Acesse esta URL para testar a conexão:
```
https://pieng-propostas-5exn1foih-solarsysclear.vercel.app/api/test-supabase
```

**Resultado Esperado:**
```json
{
  "success": true,
  "message": "Supabase configurado corretamente"
}
```

**Se retornar erro** → Variáveis não configuradas! Vá para o **Passo 2**.

---

### 2️⃣ **Configurar Variáveis de Ambiente no Vercel**

#### A. Acessar Vercel Dashboard

1. Acesse: https://vercel.com/dashboard
2. Selecione o projeto: **pieng-propostas**
3. Vá em: **Settings** → **Environment Variables**

#### B. Obter Chaves do Supabase

1. Acesse: https://supabase.com/dashboard/project/asmvbrcxzvfvvolnalxw
2. Vá em: **Settings** → **API**
3. Copie:
   - **Project URL**: `https://asmvbrcxzvfvvolnalxw.supabase.co`
   - **anon public** key (chave longa que começa com `eyJ...`)

#### C. Adicionar no Vercel

Adicione 2 variáveis:

**Variável 1:**
```
Nome: NEXT_PUBLIC_SUPABASE_URL
Valor: [Cole a Project URL do Supabase]
Ambientes: ✅ Production ✅ Preview ✅ Development
```

**Variável 2:**
```
Nome: NEXT_PUBLIC_SUPABASE_ANON_KEY
Valor: [Cole a chave anon do Supabase]
Ambientes: ✅ Production ✅ Preview ✅ Development
```

#### D. Fazer Redeploy

1. Vá em: **Deployments**
2. Clique nos **"..."** do último deployment
3. Clique em **"Redeploy"**
4. Aguarde 2-3 minutos

---

### 3️⃣ **Testar se a Proposta Existe no Supabase**

Após configurar as variáveis e fazer o redeploy, teste se a proposta específica existe:

```
https://pieng-propostas-5exn1foih-solarsysclear.vercel.app/api/test-proposta-slug?slug=cliente-padrao-0006-31-10-2025
```

**Resultado Esperado:**

```json
{
  "success": true,
  "teste1_helper": {
    "encontrado": true,
    "dados": {
      "id": "uuid-xxx",
      "slug": "cliente-padrao-0006-31-10-2025",
      "temHtml": true,
      "temDadosCompletos": true
    }
  },
  "diagnostico": {
    "propostaExiste": true,
    "possivelCausa": "Proposta encontrada e completa ✅"
  }
}
```

---

### 4️⃣ **Se Proposta NÃO Existe no Banco**

Se o teste acima retornar `"encontrado": false`, significa que a proposta não foi salva. Você precisa:

#### A. Gerar a Proposta Novamente

1. Acesse: https://pieng-propostas-5exn1foih-solarsysclear.vercel.app/gerador-rapido
2. Carregue o exemplo "Cliente Padrão"
3. Processe orçamentos
4. Clique em **"Gerar Proposta"**

#### B. Verificar se Salvou no Supabase

No console do navegador (F12), você deve ver:

```
✅ Proposta salva no Supabase com sucesso! ID: xxx-xxx-xxx Slug: cliente-padrao-0006-31-10-2025
```

Se aparecer **erro ao salvar**, as variáveis de ambiente não estão configuradas.

---

### 5️⃣ **Verificar Schema do Supabase**

Se as variáveis estão OK mas a proposta não salva, pode ser problema no schema.

#### A. Acessar Supabase SQL Editor

1. Acesse: https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em: **SQL Editor**

#### B. Executar Query de Teste

```sql
-- Ver todas as propostas
SELECT slug, titulo, status, created_at 
FROM propostas 
ORDER BY created_at DESC 
LIMIT 10;
```

#### C. Se Tabela Não Existe

Execute o schema completo do arquivo `supabase_schema.sql` no SQL Editor.

---

## 📊 Diagnóstico Completo

### ✅ Checklist de Verificação

- [ ] **Passo 1:** Supabase configurado? (teste `/api/test-supabase`)
- [ ] **Passo 2:** Variáveis de ambiente configuradas no Vercel?
- [ ] **Passo 3:** Proposta existe no banco? (teste `/api/test-proposta-slug`)
- [ ] **Passo 4:** Proposta foi gerada novamente após configurar variáveis?
- [ ] **Passo 5:** Schema do Supabase está correto?

### 🔍 Possíveis Causas do 404

| Causa | Sintoma | Solução |
|-------|---------|---------|
| **Variáveis não configuradas** | `/api/test-supabase` retorna erro | Configurar variáveis no Vercel |
| **Proposta não foi salva** | `/api/test-proposta-slug` não encontra | Gerar proposta novamente |
| **Schema incompleto** | Erro ao salvar no Supabase | Executar `supabase_schema.sql` |
| **Slug incorreto** | URL com slug errado | Verificar slug correto na lista |
| **RLS habilitado** | Proposta existe mas não é acessível | Desabilitar RLS na tabela |

---

## 🚀 Fluxo Correto (Como Deveria Funcionar)

```
1. Usuário acessa /gerador-rapido
   ↓
2. Gera proposta → POST /api/gerar-proposta
   ↓
3. API salva no Supabase:
   - Cria/busca cliente
   - Salva proposta com slug
   - Armazena HTML e dados_completos
   ↓
4. Retorna slug: "cliente-padrao-0006-31-10-2025"
   ↓
5. Usuário acessa /proposta/cliente-padrao-0006-31-10-2025
   ↓
6. Next.js executa getServerSideProps:
   - Busca no Supabase com getPropostaBySlug()
   - Encontra proposta
   - Renderiza página
   ↓
7. ✅ Página exibida com sucesso
```

---

## 🛠️ APIs de Teste Criadas

| API | Uso | URL |
|-----|-----|-----|
| `/api/test-supabase` | Testar conexão | `?` (sem parâmetros) |
| `/api/test-proposta-slug` | Testar proposta específica | `?slug=cliente-padrao-0006-31-10-2025` |
| `/api/test-propostas-table` | Testar tabela propostas | `?` (sem parâmetros) |

---

## 📝 Próximos Passos

1. **Execute os testes acima na ordem**
2. **Identifique qual passo está falhando**
3. **Aplique a solução correspondente**
4. **Teste novamente até funcionar**

---

## 💡 Dica Rápida

Se quiser ver a proposta gerada diretamente do HTML (sem Supabase):

```
https://pieng-propostas.vercel.app/propostas/orçamento/clientes/proposta_cliente-padrao-0006-31-10-2025.html
```

⚠️ **IMPORTANTE:** Isso só funciona se o HTML foi commitado no repositório. Em produção no Vercel, arquivos novos não persistem sem banco de dados.

---

**Data:** 31/10/2025  
**Status:** 🔍 Aguardando diagnóstico  
**Ação Necessária:** Executar testes acima e reportar resultados

