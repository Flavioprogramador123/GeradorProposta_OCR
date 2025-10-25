# 🧪 Teste de Debug do Supabase

## 🔍 Diagnóstico do Erro 500

Criamos um endpoint de teste para identificar o problema na integração com Supabase.

---

## 📋 Passo a Passo para Teste

### 1️⃣ Aguardar Deploy Finalizar

Aguarde o build do Vercel completar (status: ● Ready)

```bash
npx vercel ls | head -5
```

Quando aparecer **● Ready** no primeiro deployment, prossiga.

---

### 2️⃣ Testar Endpoint de Diagnóstico

Acesse no navegador:

```
https://pieng-propostas.vercel.app/api/test-supabase
```

**O que esperar:**

✅ **Sucesso** - Se retornar JSON assim:
```json
{
  "success": true,
  "message": "✅ Conexão com Supabase funcionando!",
  "clientesCount": 0,
  "clientes": [],
  "env": {
    "SUPABASE_URL": "Configurada",
    "SUPABASE_KEY": "Configurada"
  }
}
```

❌ **Erro** - Se retornar erro, veja a seção de correção abaixo.

---

### 3️⃣ Possíveis Erros e Correções

#### Erro: "Variáveis de ambiente não configuradas"

**Causa:** Variáveis NEXT_PUBLIC_SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_ANON_KEY não estão no Vercel

**Solução:**
```bash
# Verificar se existem
npx vercel env ls production

# Se não existirem, adicionar:
npx vercel env add NEXT_PUBLIC_SUPABASE_URL production
# Cole: https://ityeiqyjyhkmypjmnyhb.supabase.co

npx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
# Cole: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0eWVpcXlqeWhrbXlwam1ueWhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3NzcwNDYsImV4cCI6MjA3NjM1MzA0Nn0.Qbyj0fmIuaf1X5Riyy35FLtDYqxT8DY8sB3rDOUKrL8

# Redeploy
git commit --allow-empty -m "🔄 Trigger redeploy"
git push origin clean-main
```

---

#### Erro: "Erro ao consultar Supabase" com código 42P01

**Causa:** Tabela `clientes` não existe no banco Supabase

**Solução:**
1. Acesse: https://supabase.com/dashboard/project/ityeiqyjyhkmypjmnyhb/editor
2. Clique em **SQL Editor** (no menu lateral)
3. Clique em **New Query**
4. Cole todo o conteúdo do arquivo `supabase_schema.sql`
5. Clique em **Run** (ou pressione Ctrl+Enter)

Após executar, teste novamente o endpoint.

---

#### Erro: "permission denied" ou "RLS policy"

**Causa:** Row Level Security (RLS) está bloqueando acesso

**Solução:**
Execute este SQL no Supabase SQL Editor:

```sql
-- Desabilitar RLS temporariamente para teste
ALTER TABLE clientes DISABLE ROW LEVEL SECURITY;
ALTER TABLE propostas DISABLE ROW LEVEL SECURITY;
ALTER TABLE orcamentos DISABLE ROW LEVEL SECURITY;
ALTER TABLE configuracoes DISABLE ROW LEVEL SECURITY;

-- OU criar policy permissiva
CREATE POLICY "Permitir tudo temporario" ON clientes FOR ALL USING (true);
CREATE POLICY "Permitir tudo temporario" ON propostas FOR ALL USING (true);
```

---

### 4️⃣ Testar Geração de Proposta

Após o endpoint de teste funcionar, teste a geração:

1. Acesse: https://pieng-propostas.vercel.app/gerador-rapido
2. Carregue o exemplo "Cliente Padrão"
3. Processe os orçamentos
4. Clique em "Gerar Proposta"
5. Verifique se aparece sucesso sem erro 500

---

## 📊 Logs do Vercel

Para ver logs detalhados:

```bash
# Ver logs build
npx vercel inspect --logs pieng-propostas-eo9m1lvxc-solarsysclear.vercel.app

# Ver logs runtime (aguardar requisições)
npx vercel logs pieng-propostas-eo9m1lvxc-solarsysclear.vercel.app
```

---

## 🔗 Links Úteis

- **Supabase Dashboard:** https://supabase.com/dashboard/project/ityeiqyjyhkmypjmnyhb
- **SQL Editor:** https://supabase.com/dashboard/project/ityeiqyjyhkmypjmnyhb/editor
- **Table Editor:** https://supabase.com/dashboard/project/ityeiqyjyhkmypjmnyhb/editor
- **Vercel Dashboard:** https://vercel.com/solarsysclear/pieng-propostas

---

**Última atualização:** 25/10/2025 - 17:32
**Status:** Aguardando build do Vercel completar
