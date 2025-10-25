# 🔐 Configurar Variáveis de Ambiente no Vercel

## 📍 Acesse o Dashboard

1. Vá para: https://vercel.com/flavioprogramador123s-projects/pieng-propostas-solares/settings/environment-variables

2. Adicione as seguintes variáveis (clique em "Add New"):

---

## ✅ Variáveis para Adicionar

### 1. NEXT_PUBLIC_SUPABASE_URL
```
Nome: NEXT_PUBLIC_SUPABASE_URL
Valor: https://ityeiqyjyhkmypjmnyhb.supabase.co
Ambientes: ✅ Production, ✅ Preview, ✅ Development
```

### 2. NEXT_PUBLIC_SUPABASE_ANON_KEY
```
Nome: NEXT_PUBLIC_SUPABASE_ANON_KEY
Valor: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0eWVpcXlqeWhrbXlwam1ueWhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3NzcwNDYsImV4cCI6MjA3NjM1MzA0Nn0.Qbyj0fmIuaf1X5Riyy35FLtDYqxT8DY8sB3rDOUKrL8
Ambientes: ✅ Production, ✅ Preview, ✅ Development
```

### 3. SUPABASE_SERVICE_ROLE_KEY (Opcional - para operações admin)
```
Nome: SUPABASE_SERVICE_ROLE_KEY
Valor: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0eWVpcXlqeWhrbXlwam1ueWhiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDc3NzA0NiwiZXhwIjoyMDc2MzUzMDQ2fQ.NjGu9mvWX7mwnXvHoJObDWxOplscR4e2UcR8mVu44io
Ambientes: ✅ Production apenas (⚠️ SEGREDO!)
```

---

## 💾 Salvar

Clique em **"Save"** em cada variável.

---

## ✅ Resultado Esperado

Após adicionar, você deve ver 3 variáveis:
- ✅ NEXT_PUBLIC_SUPABASE_URL
- ✅ NEXT_PUBLIC_SUPABASE_ANON_KEY
- ✅ SUPABASE_SERVICE_ROLE_KEY

---

## 🚀 Próximo Passo

Após salvar, faça um **redeploy** para aplicar as mudanças:
- Vá em: https://vercel.com/flavioprogramador123s-projects/pieng-propostas-solares
- Clique nos "..." do último deploy
- Clique em **"Redeploy"**

---

**⏱️ Tempo estimado**: 2 minutos
