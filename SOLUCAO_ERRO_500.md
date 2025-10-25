# 🎯 SOLUÇÃO DO ERRO 500 - SUPABASE

## ❌ Problema Identificado:

**Erro:** `column propostas.titulo does not exist`
**Código PostgreSQL:** `42703`
**Causa:** A tabela `propostas` NÃO FOI CRIADA ou foi criada SEM as colunas necessárias no Supabase.

---

## ✅ SOLUÇÃO (PASSO A PASSO):

### 1️⃣ Acessar Supabase SQL Editor

1. Acesse: https://supabase.com/dashboard/project/ityeiqyjyhkmypjmnyhb
2. No menu lateral esquerdo, clique em **SQL Editor** (ícone de </> código)
3. Clique no botão **+ New query** (canto superior direito)

---

### 2️⃣ Executar o Schema Completo

1. Abra o arquivo `supabase_schema.sql` deste projeto
2. **Copie TODO o conteúdo** do arquivo (Ctrl+A, Ctrl+C)
3. **Cole** no SQL Editor do Supabase
4. Clique em **RUN** (ou pressione Ctrl+Enter)

**Aguarde a execução completar** (pode levar 5-10 segundos)

---

### 3️⃣ Verificar se a Tabela Foi Criada

Após executar o SQL, verifique se deu certo:

1. No Supabase, vá em **Table Editor** (menu lateral)
2. Procure a tabela **`propostas`**
3. Clique nela e verifique se tem as colunas:
   - `id`
   - `cliente_id`
   - `slug`
   - **`titulo`** ← Esta coluna está faltando!
   - `template_usado`
   - `sistema_kwp`
   - `geracao_mensal`
   - `geracao_anual`
   - `valor_total`
   - `valor_kwp`
   - `payback`
   - `tir`
   - `dados_completos`
   - `html_gerado`
   - `pdf_url`
   - `status`
   - `created_at`
   - `updated_at`

---

### 4️⃣ Testar Novamente

Após executar o schema, teste se funcionou:

1. Acesse: https://pieng-propostas.vercel.app/api/test-propostas-table
2. Deve retornar JSON com:
   ```json
   {
     "success": true,
     "message": "✅ Tabela propostas funcionando!",
     "propostasCount": 0,
     "testInsert": "INSERT funcionou (registro deletado)"
   }
   ```

---

### 5️⃣ Testar Geração de Proposta

Finalmente, teste a geração real:

1. Acesse: https://pieng-propostas.vercel.app/gerador-rapido
2. Carregue exemplo "Cliente Padrão"
3. Processe orçamentos
4. Clique em **"Gerar Proposta"**
5. **NÃO DEVE** aparecer erro 500
6. Deve salvar no Supabase com sucesso

---

## 🔍 Diagnóstico Realizado

### Testes Executados:

1. ✅ **Conexão Supabase** → Funcionando
2. ✅ **Tabela `clientes`** → Existe e funciona (5 registros)
3. ❌ **Tabela `propostas`** → NÃO EXISTE ou INCOMPLETA

### Erros Encontrados:

```
PostgreSQL Error 42703: column propostas.titulo does not exist
```

Isso prova que:
- A conexão com Supabase está OK
- As variáveis de ambiente estão OK
- O código da API está OK
- **O problema é que o schema SQL NÃO FOI EXECUTADO**

---

## 📋 Checklist de Verificação

Após executar o schema, verifique:

- [ ] Tabela `clientes` existe
- [ ] Tabela `propostas` existe **com coluna `titulo`**
- [ ] Tabela `orcamentos` existe
- [ ] Tabela `configuracoes` existe
- [ ] Índices foram criados (idx_propostas_slug, etc)
- [ ] Triggers foram criados (updated_at)
- [ ] Views foram criadas (propostas_completas)

---

## 🚨 Se o Erro Persistir

### Opção 1: Recriar a Tabela

Se a tabela `propostas` existe mas está incompleta:

```sql
-- CUIDADO: Isso apaga todos os dados da tabela!
DROP TABLE IF EXISTS propostas CASCADE;

-- Depois execute novamente o schema completo
```

### Opção 2: Adicionar Coluna Faltando

Se a tabela existe mas só falta a coluna `titulo`:

```sql
ALTER TABLE propostas ADD COLUMN IF NOT EXISTS titulo TEXT NOT NULL DEFAULT 'Proposta Solar';
```

---

## 📞 Próximos Passos

Após corrigir:

1. Testar API de teste: `/api/test-propostas-table`
2. Testar geração de proposta no `/gerador-rapido`
3. Verificar se proposta foi salva no Supabase (Table Editor)
4. Verificar se a página `/proposta-supabase/[slug]` funciona

---

**Data:** 25/10/2025 - 17:50
**Status:** 🎯 Problema identificado - Aguardando execução do schema SQL
**Causa Raiz:** Schema SQL não foi executado no Supabase
**Solução:** Executar `supabase_schema.sql` no SQL Editor do Supabase
