# 🚀 PIENG Propostas - Setup Supabase

## ✅ Passo 1: Criar Projeto no Supabase

1. Acesse: https://supabase.com/dashboard
2. Clique em **"New Project"**
3. Preencha:
   - **Name**: `pieng-propostas`
   - **Database Password**: (gere uma senha forte e SALVE)
   - **Region**: `South America (São Paulo)`
4. Clique em **"Create new project"**
5. **Aguarde 2-3 minutos** para o projeto ser criado

---

## ✅ Passo 2: Configurar Banco de Dados

1. No dashboard do projeto, vá em **"SQL Editor"** (menu lateral)
2. Clique em **"New query"**
3. **Abra o arquivo** `supabase_schema.sql` (na raiz do projeto)
4. **Copie TODO o conteúdo** do arquivo
5. **Cole** no SQL Editor do Supabase
6. Clique em **"Run"** (ou pressione Ctrl+Enter)
7. ✅ Aguarde concluir (deve aparecer "Success" em verde)

---

## ✅ Passo 3: Obter Credenciais

1. No dashboard, vá em **"Project Settings"** (ícone de engrenagem no menu lateral)
2. Clique em **"API"**
3. **Copie** as seguintes informações:

```
Project URL: https://[PROJECT_ID].supabase.co
anon/public key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## ✅ Passo 4: Configurar Variáveis de Ambiente no Vercel

1. Acesse: https://vercel.com/dashboard
2. Selecione o projeto **"pieng-propostas"**
3. Vá em **"Settings"** → **"Environment Variables"**
4. Adicione as seguintes variáveis:

| Nome | Valor |
|------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | https://[PROJECT_ID].supabase.co |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | eyJhbGciOiJIUzI1... (sua chave anon) |

5. Clique em **"Save"**

---

## ✅ Passo 5: Deploy e Teste

1. Faça commit e push das mudanças:
```bash
git add .
git commit -m "🚀 FEAT: Migração completa para Supabase"
git push origin clean-main
```

2. Aguarde o deploy automático do Vercel (2-3 min)

3. Teste a aplicação:
   - Acesse: https://pieng-propostas.vercel.app/gerador-rapido
   - Carregue o exemplo YAML
   - Gere uma proposta
   - ✅ Deve funcionar sem erro 404!

---

## 📊 Verificar Dados no Supabase

Após gerar uma proposta, verifique no Supabase:

1. Vá em **"Table Editor"** (menu lateral)
2. Selecione a tabela **"propostas"**
3. ✅ Deve aparecer a proposta recém-criada

---

## 🎯 Resultado Esperado

✅ Propostas salvas no banco Supabase
✅ Sem erros 404
✅ Dados persistentes mesmo após redeploy
✅ Sistema funcionando 100% em produção

---

## 💰 Custos

- **Supabase Free Tier**: $0/mês
  - 500 MB database
  - 1 GB file storage
  - 50 MB file uploads
  - 2 GB bandwidth

- **Se precisar de mais**: Supabase Pro = $25/mês
  - 8 GB database
  - 100 GB file storage
  - 5 GB file uploads
  - 250 GB bandwidth

---

## 🆘 Problemas?

Se algo der errado:

1. **Erro de conexão**: Verifique se as variáveis de ambiente estão corretas
2. **Erro 404 ainda**: Aguarde 5 min e limpe cache do navegador (Ctrl+Shift+R)
3. **Erro no SQL**: Execute o schema novamente
4. **Dados não aparecem**: Verifique RLS policies no Supabase

---

**Última atualização**: 25/10/2025
**Versão**: 2.2.0 - Migração Supabase
