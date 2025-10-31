# 🔐 Como Configurar Variáveis de Ambiente no Vercel

## ⚠️ IMPORTANTE: NUNCA exponha suas chaves de API em arquivos públicos!

---

## 📋 Passo a Passo

### 1. Acessar o Vercel Dashboard

1. Acesse: https://vercel.com/dashboard
2. Selecione seu projeto: **pieng-propostas**
3. Vá em: **Settings** → **Environment Variables**

### 2. Adicionar Variáveis (uma por vez)

Clique em **"Add New"** para cada variável:

#### Variável 1: NEXT_PUBLIC_SUPABASE_URL

```
Nome: NEXT_PUBLIC_SUPABASE_URL
Valor: [Cole aqui a URL do seu projeto Supabase]
Ambientes: ✅ Production, ✅ Preview, ✅ Development
```

**Onde encontrar:**
- Acesse: https://supabase.com/dashboard
- Selecione seu projeto
- Vá em: **Settings** → **API**
- Copie a **Project URL**

#### Variável 2: NEXT_PUBLIC_SUPABASE_ANON_KEY

```
Nome: NEXT_PUBLIC_SUPABASE_ANON_KEY
Valor: [Cole aqui a chave anon do Supabase]
Ambientes: ✅ Production, ✅ Preview, ✅ Development
```

**Onde encontrar:**
- No mesmo lugar (Settings → API)
- Copie a chave **anon public**

### 3. Salvar e Fazer Redeploy

1. Clique em **Save** em cada variável
2. Vá para a aba **Deployments**
3. Clique nos **"..."** do último deployment
4. Clique em **"Redeploy"**
5. Aguarde 2-3 minutos

---

## ✅ Verificar se Funcionou

Após o redeploy, teste:

```
https://pieng-propostas.vercel.app/api/test-supabase
```

Deve retornar:
```json
{
  "success": true,
  "message": "Supabase configurado corretamente"
}
```

---

## 📝 Variáveis Opcionais (adicionar depois, se necessário)

Se precisar de funcionalidades adicionais:

- `GEMINI_API_KEY` - Para integração com IA
- `OPENAI_API_KEY` - Para integração com OpenAI
- `GOOGLE_MAPS_API_KEY` - Para geolocalização
- `GOOGLE_DRIVE_CLIENT_ID` - Para Google Drive

---

## ⚠️ Segurança

- ✅ As variáveis `NEXT_PUBLIC_*` são expostas no frontend, mas a chave `anon` do Supabase é segura
- ✅ A chave `anon` só permite operações dentro das políticas RLS (Row Level Security)
- ❌ **NUNCA** exponha a chave `service_role` no frontend
- ❌ **NUNCA** commite arquivos `.env` com chaves reais no Git

---

## ✅ Checklist

- [ ] Acessei o Dashboard do Supabase
- [ ] Copiei a Project URL
- [ ] Copiei a chave anon public
- [ ] Adicionei `NEXT_PUBLIC_SUPABASE_URL` no Vercel
- [ ] Adicionei `NEXT_PUBLIC_SUPABASE_ANON_KEY` no Vercel
- [ ] Marquei todos os ambientes (Production, Preview, Development)
- [ ] Fiz o Redeploy
- [ ] Testei em `/api/test-supabase` e funcionou

---

**🔒 Segurança em primeiro lugar!**
