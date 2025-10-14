# 🔐 Configurar Secrets do GitHub para Deploy Automático

Para que o deploy automático funcione, você precisa adicionar os seguintes **Secrets** no GitHub:

## 📋 Como Adicionar Secrets no GitHub

1. Vá para seu repositório no GitHub
2. Clique em **Settings** (Configurações)
3. No menu lateral, clique em **Secrets and variables** > **Actions**
4. Clique em **New repository secret**
5. Adicione cada secret abaixo

---

## 🔑 Secrets Necessários

### 1. **VERCEL_TOKEN**
**O que é:** Token de autenticação do Vercel

**Como obter:**
```bash
# No terminal, execute:
npx vercel login
npx vercel whoami
```

Depois, vá para: https://vercel.com/account/tokens
- Clique em **Create Token**
- Nome: `GitHub Actions - PIENG`
- Copie o token gerado

**Valor:** `yyS5oRio8a7vfiMnu3uzeBPy` (já está no .env)

---

### 2. **VERCEL_ORG_ID**
**O que é:** ID da sua organização/conta no Vercel

**Como obter:**
```bash
# No terminal, execute:
cat .vercel/project.json
```

Copie o valor de `"orgId"`

**Valor provável:** `team_KDl4jKQK6VuFv9eGRTeHsPjV`

---

### 3. **VERCEL_PROJECT_ID**
**O que é:** ID do projeto no Vercel

**Como obter:**
```bash
# No terminal, execute:
cat .vercel/project.json
```

Copie o valor de `"projectId"`

**Valor provável:** `prj_DW2ZGnSzAOA4aA8r9BIAYpOK14Md`

---

## ✅ Checklist de Configuração

- [ ] Adicionar **VERCEL_TOKEN** no GitHub Secrets
- [ ] Adicionar **VERCEL_ORG_ID** no GitHub Secrets
- [ ] Adicionar **VERCEL_PROJECT_ID** no GitHub Secrets
- [ ] Fazer commit das mudanças no `vercel.json` e `.github/workflows/`
- [ ] Fazer push para GitHub
- [ ] Verificar se o deploy automático foi acionado

---

## 🚀 Como Testar

### Teste 1: Deploy Automático no Push
```bash
git add .
git commit -m "Teste de deploy automático"
git push
```

Depois vá para: https://github.com/SEU-USUARIO/SEU-REPO/actions
- Veja se o workflow **Deploy to Vercel** foi acionado
- Acompanhe o progresso

### Teste 2: Atualização Manual de Dados
```bash
# No GitHub, vá para Actions
# Clique em "Update Clients Data"
# Clique em "Run workflow"
```

### Teste 3: Deploy Preview em PR
```bash
git checkout -b feature/teste-pr
# Faça alguma mudança
git add .
git commit -m "Teste PR"
git push -u origin feature/teste-pr

# No GitHub, crie um Pull Request
# O workflow criará um preview automaticamente
```

---

## 📊 O que o Sistema Faz Automaticamente

### Quando você faz `git push`:
1. ✅ GitHub Actions é acionado
2. ✅ Gera `clientes-data.json` atualizado
3. ✅ Faz build do Next.js
4. ✅ Faz deploy para Vercel Production
5. ✅ Atualiza URLs automaticamente

### A cada 6 horas:
1. ✅ Verifica mudanças em `src/data/clientes/`
2. ✅ Regenera `clientes-data.json`
3. ✅ Commita automaticamente se houver mudanças
4. ✅ Aciona deploy automático

### Em Pull Requests:
1. ✅ Cria deploy preview no Vercel
2. ✅ Comenta no PR com URL do preview
3. ✅ Permite testar antes de fazer merge

---

## 🛠️ Comandos Úteis

### Ver status dos workflows:
```bash
gh workflow list
gh workflow view deploy.yml
```

### Executar workflow manualmente:
```bash
gh workflow run deploy.yml
gh workflow run update-data.yml
```

### Ver logs de um run:
```bash
gh run list
gh run view <run-id> --log
```

---

## 🔧 Troubleshooting

### Erro: "VERCEL_TOKEN not found"
→ Verifique se adicionou o secret no GitHub

### Erro: "Invalid credentials"
→ Gere um novo token no Vercel e atualize

### Deploy não está acontecendo
→ Verifique se o branch está correto (main ou clean-main)

### Workflow não aparece
→ Faça commit do `.github/workflows/` e push

---

## 📝 Notas Importantes

- **Nunca commite** tokens ou secrets no código
- Os secrets ficam **seguros** no GitHub (criptografados)
- Você pode **regenerar** tokens a qualquer momento
- O `.vercel/` já está no `.gitignore`

---

## 🎉 Pronto!

Depois de configurar os secrets, o sistema estará **100% automático**:
- Push → Deploy imediato
- Dados atualizados a cada 6h
- Preview em PRs

**Tempo de deploy:** ~2-3 minutos 🚀
