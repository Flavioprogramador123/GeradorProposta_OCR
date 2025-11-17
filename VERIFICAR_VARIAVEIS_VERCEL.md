# 🔍 Como Verificar e Configurar Variáveis Supabase no Vercel

## ⚠️ Problema Atual

O erro `SUPABASE_NOT_CONFIGURED` indica que as variáveis de ambiente do Supabase não estão sendo detectadas no Vercel.

## 📋 Passos para Verificar e Configurar

### 1. Acessar Configurações do Projeto no Vercel

1. Acesse: https://vercel.com/dashboard
2. Selecione o projeto: `pieng-propostas` (ou nome do seu projeto)
3. Vá em **Settings** → **Environment Variables**

### 2. Verificar Variáveis Existentes

Procure por estas variáveis:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 3. Adicionar/Atualizar Variáveis

Se não existirem ou estiverem incorretas:

1. Clique em **Add New**
2. Adicione cada variável:

**Variável 1:**
- **Name:** `NEXT_PUBLIC_SUPABASE_URL`
- **Value:** `https://asmvbrcxzvfvvolnalxw.supabase.co`
- **Environment:** Selecione todas (Production, Preview, Development)

**Variável 2:**
- **Name:** `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Value:** (Cole a chave anon do Supabase)
- **Environment:** Selecione todas (Production, Preview, Development)

### 4. Obter a Chave Anon do Supabase

1. Acesse: https://supabase.com/dashboard/project/asmvbrcxzvfvvolnalxw
2. Vá em **Settings** → **API**
3. Copie a **anon/public** key
4. Cole no Vercel

### 5. Fazer Redeploy

⚠️ **IMPORTANTE:** Após adicionar/atualizar variáveis, você DEVE fazer um redeploy:

1. No Vercel, vá em **Deployments**
2. Clique nos **3 pontos** do último deployment
3. Selecione **Redeploy**
4. Ou faça um novo commit/push para GitHub

## 🔍 Verificar se Está Funcionando

Após o redeploy, os logs de debug mostrarão:

```
🔍 Verificando variáveis Supabase:
  - NEXT_PUBLIC_SUPABASE_URL: ✅ Configurada
  - NEXT_PUBLIC_SUPABASE_ANON_KEY: ✅ Configurada
  - VERCEL: ✅ Sim
```

## 🐛 Debug no Vercel

Se ainda não funcionar, verifique os logs do deployment:

1. Vercel Dashboard → **Deployments**
2. Clique no deployment mais recente
3. Vá em **Functions** → Selecione a função `/api/admin/criar-cliente`
4. Veja os logs de erro

O código agora retorna informações de debug:
```json
{
  "error": "SUPABASE_NOT_CONFIGURED",
  "debug": {
    "hasUrl": false,
    "hasKey": false,
    "envKeys": ["..."]
  }
}
```

## ✅ Checklist

- [ ] Variáveis configuradas no Vercel
- [ ] Variáveis aplicadas a todos os ambientes (Production, Preview, Development)
- [ ] Redeploy feito após configurar variáveis
- [ ] Logs mostram variáveis configuradas
- [ ] Teste criar cliente funciona

## 📝 Notas Importantes

1. **Variáveis `NEXT_PUBLIC_*` são expostas ao cliente** - Isso é necessário para o Supabase funcionar no browser
2. **Redeploy é obrigatório** - Variáveis não são aplicadas a deployments existentes
3. **Verificar ambiente correto** - Certifique-se de que as variáveis estão no ambiente correto (Production)

---

**Última atualização:** 17/11/2025

