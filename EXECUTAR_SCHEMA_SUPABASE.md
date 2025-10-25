# 🚀 COMO EXECUTAR O SCHEMA SQL NO SUPABASE

## ⚠️ IMPORTANTE: ESTE PASSO É OBRIGATÓRIO!

Sem executar este schema SQL, a API `/api/gerar-proposta-supabase` **NÃO VAI FUNCIONAR** e continuará retornando erro 500.

---

## 📋 PASSO A PASSO (5 MINUTOS):

### 1️⃣ Abrir o Arquivo do Schema

No seu computador, abra o arquivo:
```
supabase_schema.sql
```

Está na raiz do projeto: `C:\Users\flavi\Dropbox\PROPOSTAS\Prompt_ORC_pieng\supabase_schema.sql`

---

### 2️⃣ Copiar TODO o Conteúdo

1. Abra o arquivo `supabase_schema.sql` no VS Code ou Notepad
2. Pressione **Ctrl+A** (selecionar tudo)
3. Pressione **Ctrl+C** (copiar)

---

### 3️⃣ Acessar o Supabase Dashboard

Abra no navegador:
```
https://supabase.com/dashboard/project/ityeiqyjyhkmypjmnyhb
```

Se pedir login, use suas credenciais do Supabase.

---

### 4️⃣ Abrir o SQL Editor

1. No menu lateral **ESQUERDO**, procure o ícone **</>** (SQL Editor)
2. Clique em **SQL Editor**
3. Você verá uma tela com histórico de queries

---

### 5️⃣ Criar Nova Query

1. No canto **SUPERIOR DIREITO**, clique no botão **"+ New query"**
2. Uma nova aba em branco será aberta

---

### 6️⃣ Colar o Schema SQL

1. No editor em branco, pressione **Ctrl+V** para colar TODO o conteúdo do arquivo `supabase_schema.sql`
2. Você deve ver um SQL longo começando com:
   ```sql
   -- ============================================
   -- PIENG PROPOSTAS - Schema Supabase
   -- ============================================
   CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
   ...
   ```

---

### 7️⃣ Executar o SQL

1. Clique no botão **"RUN"** (canto inferior direito)
   - **OU** pressione **Ctrl+Enter**
2. **AGUARDE** a execução (5-10 segundos)
3. Você verá mensagens de sucesso tipo:
   ```
   Success. No rows returned
   ```

---

### 8️⃣ Verificar se Funcionou

Após executar, vá em **Table Editor** (menu lateral):

1. Clique em **Table Editor**
2. Você deve ver **4 tabelas**:
   - ✅ `clientes`
   - ✅ `propostas` ← **Esta é a mais importante!**
   - ✅ `orcamentos`
   - ✅ `configuracoes`

3. Clique na tabela **`propostas`**
4. Verifique se tem a coluna **`titulo`** (e todas as outras)

---

### 9️⃣ Testar se Está Funcionando

Abra no navegador:
```
https://pieng-propostas.vercel.app/api/test-propostas-table
```

**Resultado esperado:**
```json
{
  "success": true,
  "message": "✅ Tabela propostas funcionando!",
  "propostasCount": 0,
  "testInsert": "INSERT funcionou (registro deletado)"
}
```

❌ **Se ainda retornar erro** `column propostas.titulo does not exist`:
- O schema não foi executado corretamente
- Tente novamente do passo 1

---

### 🔟 Testar Geração de Proposta

Finalmente, teste a aplicação:

1. Acesse: https://pieng-propostas.vercel.app/gerador-rapido
2. Clique em **"Carregar Exemplo"** (Cliente Padrão)
3. Clique em **"Processar Orçamentos"**
4. Aguarde processar os 3 orçamentos
5. Clique em **"Gerar Proposta"**

**Resultado esperado:**
- ✅ Proposta gerada com sucesso
- ✅ Salva no Supabase
- ✅ Sem erro 500

---

## 🆘 PROBLEMAS COMUNS:

### Erro: "permission denied"

**Solução:** Execute este SQL adicional:
```sql
ALTER TABLE clientes DISABLE ROW LEVEL SECURITY;
ALTER TABLE propostas DISABLE ROW LEVEL SECURITY;
ALTER TABLE orcamentos DISABLE ROW LEVEL SECURITY;
ALTER TABLE configuracoes DISABLE ROW LEVEL SECURITY;
```

---

### Erro: "relation already exists"

Significa que você já executou parte do schema antes.

**Solução:** Apague as tabelas e execute novamente:
```sql
DROP TABLE IF EXISTS propostas CASCADE;
DROP TABLE IF EXISTS orcamentos CASCADE;
DROP TABLE IF EXISTS clientes CASCADE;
DROP TABLE IF EXISTS configuracoes CASCADE;

-- Depois execute TODO o supabase_schema.sql novamente
```

---

### Erro: "syntax error at or near..."

Você não copiou TODO o arquivo.

**Solução:**
1. Abra `supabase_schema.sql`
2. Pressione **Ctrl+A** (selecionar TUDO)
3. Copie e cole novamente

---

## ✅ CHECKLIST FINAL:

Após executar o schema, verifique:

- [ ] Tabela `clientes` existe no Table Editor
- [ ] Tabela `propostas` existe **com coluna `titulo`**
- [ ] Tabela `orcamentos` existe
- [ ] Tabela `configuracoes` existe
- [ ] API de teste retorna sucesso: `/api/test-propostas-table`
- [ ] Geração de proposta funciona sem erro 500

---

## 📞 SE TUDO DER CERTO:

Você verá no Supabase Table Editor → `propostas`:

- Uma nova linha com os dados da proposta gerada
- Campos preenchidos: `slug`, `titulo`, `html_gerado`, `dados_completos`
- Timestamp de criação

E poderá acessar a proposta em:
```
https://pieng-propostas.vercel.app/proposta-supabase/[slug]
```

---

**Data:** 25/10/2025 - 18:00
**Status:** ⏳ Aguardando execução do schema SQL
**Tempo estimado:** 5 minutos
**Dificuldade:** Fácil (copiar e colar)

---

## 🎯 RESUMO:

1. Copiar `supabase_schema.sql` (Ctrl+A, Ctrl+C)
2. Abrir Supabase SQL Editor
3. Criar "New query"
4. Colar SQL (Ctrl+V)
5. Clicar em "RUN" (Ctrl+Enter)
6. Aguardar execução
7. Verificar tabelas no Table Editor
8. Testar `/api/test-propostas-table`
9. Testar geração de proposta

**Isso é tudo! Execute estes passos e o erro 500 será resolvido.** 🚀
