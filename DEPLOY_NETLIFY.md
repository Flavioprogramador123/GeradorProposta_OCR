# 🚀 GUIA DE DEPLOY NO NETLIFY

## ✅ STATUS DO PROJETO

- ✅ Build de produção concluído com sucesso
- ✅ Git commit realizado (2 commits criados)
- ✅ Arquivo `netlify.toml` criado e configurado
- ✅ Sistema pronto para deploy

---

## 📋 PRÉ-REQUISITOS

1. Conta no Netlify (gratuita): https://www.netlify.com/
2. Repositório Git configurado (ou deploy manual)
3. Variáveis de ambiente configuradas (se necessário)

---

## 🎯 OPÇÃO 1: DEPLOY VIA NETLIFY CLI (RECOMENDADO)

### Passo 1: Instalar Netlify CLI

```bash
npm install -g netlify-cli
```

### Passo 2: Login no Netlify

```bash
netlify login
```

### Passo 3: Inicializar projeto

```bash
netlify init
```

Siga as instruções:
- **Create & configure a new site**: Sim
- **Team**: Selecione seu time
- **Site name**: `pieng-solar-propostas` (ou nome desejado)
- **Build command**: `npm run build`
- **Publish directory**: `.next`

### Passo 4: Deploy

```bash
netlify deploy --prod
```

---

## 🎯 OPÇÃO 2: DEPLOY MANUAL VIA INTERFACE WEB

### Passo 1: Acessar Netlify

1. Acesse https://app.netlify.com/
2. Faça login na sua conta

### Passo 2: Novo Site

1. Clique em **"Add new site"** → **"Deploy manually"**
2. Arraste a pasta **`.next`** para a área de upload

**OU**

1. Clique em **"Add new site"** → **"Import an existing project"**
2. Conecte seu repositório Git (GitHub, GitLab, Bitbucket)
3. Selecione o branch **`master`**
4. Configurações de build:
   - **Build command**: `npm run build`
   - **Publish directory**: `.next`
   - **Node version**: 18

### Passo 3: Configurar Variáveis de Ambiente (se necessário)

No painel do Netlify:
1. Vá em **Site settings** → **Environment variables**
2. Adicione as variáveis necessárias (ex: chaves de API)

### Passo 4: Deploy

Clique em **"Deploy site"**

---

## 🎯 OPÇÃO 3: DEPLOY VIA GIT (AUTOMÁTICO)

### Passo 1: Configurar Repositório Remoto

Se ainda não configurou:

```bash
# Criar repositório no GitHub primeiro
# Depois executar:
git remote set-url origin https://github.com/SEU_USUARIO/SEU_REPOSITORIO.git
git push -u origin master
```

### Passo 2: Conectar Netlify ao Git

1. Acesse https://app.netlify.com/
2. **Add new site** → **Import an existing project**
3. Escolha **GitHub** (ou GitLab/Bitbucket)
4. Selecione seu repositório
5. Configure:
   - **Branch**: `master`
   - **Build command**: `npm run build`
   - **Publish directory**: `.next`
6. Clique em **Deploy site**

### Passo 3: Deploy Automático

Agora, toda vez que você fizer `git push`, o Netlify fará deploy automaticamente! 🎉

---

## ⚙️ CONFIGURAÇÕES IMPORTANTES

### Build Settings (Já configurado no `netlify.toml`)

```toml
[build]
  command = "npm run build"
  publish = ".next"

[[plugins]]
  package = "@netlify/plugin-nextjs"

[build.environment]
  NODE_VERSION = "18"
  NPM_FLAGS = "--legacy-peer-deps"
```

### Variáveis de Ambiente

Se o projeto usa APIs externas ou chaves secretas, adicione no Netlify:

1. **Site settings** → **Environment variables**
2. Adicione variáveis como:
   - `NEXT_PUBLIC_API_URL`
   - `OPENAI_API_KEY`
   - `GOOGLE_API_KEY`
   - etc.

---

## 🔍 VERIFICAR DEPLOY

Após o deploy:

1. Acesse a URL fornecida pelo Netlify (ex: `https://pieng-solar-xxxxx.netlify.app`)
2. Teste as principais funcionalidades:
   - ✅ Página inicial (`/`)
   - ✅ Gerador Rápido (`/gerador-rapido`)
   - ✅ Admin (`/admin`)
   - ✅ Sistema do Consultor (`/admin/orcamentos/[clienteId]/consultor`)

---

## 🎨 CUSTOMIZAR DOMÍNIO (OPCIONAL)

### Domínio Netlify Gratuito

1. **Site settings** → **Domain management**
2. **Options** → **Edit site name**
3. Altere para: `pieng-solar-propostas.netlify.app`

### Domínio Personalizado

1. **Site settings** → **Domain management**
2. **Add custom domain**
3. Digite seu domínio (ex: `propostas.pieng.com.br`)
4. Siga as instruções para configurar DNS

---

## 📊 COMMITS CRIADOS

### Commit 1: Sistema Completo
```
feat: Sistema de Templates Variantes + Sistema do Consultor - FASES 1-6 COMPLETAS
```

**Arquivos alterados**: 142 arquivos
**Linhas adicionadas**: 28.940
**Linhas removidas**: 45.444

**Principais mudanças**:
- ✅ Sistema de variantes (7 templates)
- ✅ Sistema do consultor
- ✅ Template Selector
- ✅ APIs atualizadas
- ✅ Hooks e componentes novos

### Commit 2: Configuração Netlify
```
config: Add Netlify configuration for deployment
```

**Arquivo criado**: `netlify.toml`

---

## 🚨 TROUBLESHOOTING

### Erro: "Module not found"

Verifique se todas as dependências foram instaladas:
```bash
npm install --legacy-peer-deps
```

### Erro: "Build failed"

Verifique os logs no Netlify e veja qual módulo está faltando.

### Erro: "Function timeout"

Aumente o timeout nas configurações do Netlify:
- **Site settings** → **Functions** → **Function timeout**: 26 segundos

### Erro: API Routes não funcionam

Certifique-se de que o plugin Next.js está instalado:
```bash
npm install @netlify/plugin-nextjs
```

---

## 📞 SUPORTE

- **Netlify Docs**: https://docs.netlify.com/
- **Next.js on Netlify**: https://docs.netlify.com/integrations/frameworks/next-js/
- **Community Forum**: https://answers.netlify.com/

---

## ✅ CHECKLIST FINAL

- [ ] Build local funcionando (`npm run build`)
- [ ] Git commit realizado
- [ ] Conta Netlify criada
- [ ] Site deployado
- [ ] Variáveis de ambiente configuradas (se necessário)
- [ ] Funcionalidades testadas
- [ ] Domínio configurado (opcional)

---

## 🎉 PRONTO!

Seu sistema PIENG Solar está agora no ar! 🚀

**Próximos passos**:
1. Teste todas as funcionalidades
2. Configure domínio personalizado
3. Monitore logs e performance
4. Adicione analytics (opcional)

---

**Última atualização**: 03/10/2025
**Versão**: 2.0.0
**Status**: ✅ Pronto para produção

