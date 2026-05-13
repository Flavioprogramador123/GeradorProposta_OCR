# 🔍 INFORMAÇÕES DO SUPABASE

## Projeto Ativo

**URL do Projeto:** `https://ityeiqyjyhkmypjmnyhb.supabase.co`

**Dashboard:** https://supabase.com/dashboard/project/ityeiqyjyhkmypjmnyhb

**Ref ID:** `ityeiqyjyhkmypjmnyhb`

---

## ✅ Como Verificar se é o Projeto Correto

1. Acesse: https://supabase.com/dashboard/project/ityeiqyjyhkmypjmnyhb
2. Vá em **SQL Editor**
3. Execute este comando para ver se a tabela `configuracoes` existe:

```sql
SELECT COUNT(*) as total
FROM public.configuracoes;
```

**Resultado esperado:** `total: 23` (se os SQLs foram executados corretamente)

---

## 🔧 Se a Tabela NÃO Existe Neste Projeto

Execute os arquivos SQL nesta ordem:

1. `1_criar_tabela_configuracoes.sql`
2. `2_inserir_configuracoes_padrao.sql`
3. `3_testar_configuracoes.sql` (verificar)

---

## 🚨 Se Você Tem OUTRO Projeto Supabase

Se você executou os SQLs em outro projeto Supabase, você precisa:

**Opção 1: Migrar para o projeto correto** (ityeiqyjyhkmypjmnyhb)
- Executar os 3 arquivos SQL neste projeto

**Opção 2: Atualizar as variáveis de ambiente**
- Editar arquivo `.env`
- Atualizar `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Reiniciar servidor: `npm run dev`

---

## 📋 Tabelas Necessárias no Supabase

Este sistema precisa das seguintes tabelas:

- ✅ `clientes` - Cadastro de clientes
- ✅ `propostas` - Propostas geradas
- ✅ `orcamentos` - Orçamentos individuais
- ⚠️ `configuracoes` - **PRECISA SER CRIADA** (use os arquivos SQL)

---

## 🔄 Após Executar os SQLs

1. Aguarde 1-2 minutos para o cache do Supabase atualizar
2. **OU** Reinicie o banco:
   - Settings > Database > Connection Pooling > Restart
3. Recarregue a página: https://pieng-propostas.vercel.app/admin/configuracoes
4. O erro "table does not exist" deve desaparecer

---

**Última atualização:** 2025-12-01
