# 🔐 Configurar Supabase no Vercel - GUIA RÁPIDO

## 📍 Credenciais do Seu Projeto Supabase

Com base na chave fornecida, seu projeto é:

**Project ID:** `asmvbrcxzvfvvolnalxw`  
**URL Base:** `https://asmvbrcxzvfvvolnalxw.supabase.co`

---

## ✅ PASSO 1: Acessar Configurações do Vercel

1. Acesse: https://vercel.com/dashboard
2. Selecione o projeto: **pieng-propostas** (ou o nome do seu projeto)
3. Vá em: **Settings** → **Environment Variables**

---

## ✅ PASSO 2: Adicionar Variáveis de Ambiente

Adicione as seguintes variáveis:

### Variável 1: NEXT_PUBLIC_SUPABASE_URL

```
Nome: NEXT_PUBLIC_SUPABASE_URL
Valor: https://asmvbrcxzvfvvolnalxw.supabase.co
Ambientes: ✅ Production, ✅ Preview, ✅ Development
```

### Variável 2: NEXT_PUBLIC_SUPABASE_ANON_KEY

```
Nome: NEXT_PUBLIC_SUPABASE_ANON_KEY
Valor: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzbXZicmN4enZmdnZvbG5hbHh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE4NjY4NjMsImV4cCI6MjA3NzQ0Mjg2M30.P9d6oRpr5JWlGD3mYCxPc4JRAnB6aP7jchmOdak7NiQ
Ambientes: ✅ Production, ✅ Preview, ✅ Development
```

---

## ✅ PASSO 3: Salvar e Fazer Redeploy

1. Clique em **"Save"** em cada variável
2. Vá para a aba **"Deployments"**
3. Clique nos **"..."** do último deployment
4. Clique em **"Redeploy"**
5. Aguarde 2-3 minutos

---

## ✅ PASSO 4: Verificar Configuração

Após o redeploy, teste se as variáveis estão configuradas:

1. Acesse: `https://pieng-propostas.vercel.app/api/test-supabase`
2. Deve retornar JSON com `"success": true`

---

## 🔍 Verificar no Dashboard do Supabase

Acesse: https://supabase.com/dashboard/project/asmvbrcxzvfvvolnalxw/settings/api-keys

Você deve ver:
- ✅ **Project URL:** `https://asmvbrcxzvfvvolnalxw.supabase.co`
- ✅ **anon public:** (sua chave - deve começar com `eyJhbGci...`)

---

## ⚠️ Importante

- As variáveis **NEXT_PUBLIC_*** são expostas no cliente (browser), mas é seguro para a chave `anon`
- A chave `anon` só permite leitura/escrita dentro das políticas RLS (Row Level Security)
- Nunca exponha a chave `service_role` no frontend

---

## ✅ Checklist

- [ ] Variável `NEXT_PUBLIC_SUPABASE_URL` adicionada no Vercel
- [ ] Variável `NEXT_PUBLIC_SUPABASE_ANON_KEY` adicionada no Vercel
- [ ] Variáveis marcadas para Production, Preview e Development
- [ ] Redeploy feito no Vercel
- [ ] Teste em `/api/test-supabase` retornou sucesso

---

**🚀 Pronto!** Agora suas propostas serão salvas no Supabase e acessíveis via `/proposta/[slug]`

