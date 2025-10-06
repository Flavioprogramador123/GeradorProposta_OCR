# 🚀 Migração para Google Cloud - Guia Completo

## 🎯 **Objetivo**
Migrar seu sistema Pieng para Google Cloud mantendo todas as chaves de API seguras e trabalhando sempre com a versão mais atual do GitHub.

---

## 📋 **PASSO 1: Preparar o Repositório GitHub**

### 1.1 - Arquivo de Exemplo de Configuração
✅ **Criado:** `env.example` - Arquivo com todas as variáveis necessárias (sem chaves reais)

### 1.2 - Atualizar .gitignore
✅ **Já configurado:** O `.gitignore` já protege:
- `.env*` (arquivos de ambiente)
- `client_secret_*.json` (credenciais Google)
- `*_OAUTH_*.md` (documentação com chaves)

---

## 📋 **PASSO 2: Configurar Google Cloud**

### 2.1 - Criar Projeto no Google Cloud
```bash
# Via Console Web
1. Acesse: https://console.cloud.google.com/
2. "Select a project" → "New Project"
3. Nome: "PIENG Propostas Solares"
4. "Create"
```

### 2.2 - Habilitar APIs Necessárias
```bash
# APIs que você precisa habilitar:
- Google Drive API
- Google Maps API
- Secret Manager API
- Cloud Run API (para deploy)
```

### 2.3 - Configurar Secret Manager
```bash
# Armazenar suas chaves de API de forma segura
gcloud secrets create gemini-api-key --data-file=- <<< "sua_chave_gemini"
gcloud secrets create openai-api-key --data-file=- <<< "sua_chave_openai"
gcloud secrets create google-drive-client-id --data-file=- <<< "seu_client_id"
gcloud secrets create google-drive-client-secret --data-file=- <<< "seu_client_secret"
gcloud secrets create google-maps-api-key --data-file=- <<< "sua_chave_maps"
```

---

## 📋 **PASSO 3: Deploy no Google Cloud**

### 3.1 - Opção A: Google Cloud Run (Recomendado)
```bash
# 1. Build da aplicação
npm run build

# 2. Criar Dockerfile
cat > Dockerfile << 'EOF'
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
EOF

# 3. Deploy
gcloud run deploy pieng-propostas \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars="NODE_ENV=production"
```

### 3.2 - Opção B: App Engine
```bash
# 1. Criar app.yaml
cat > app.yaml << 'EOF'
runtime: nodejs18
env: standard
instance_class: F2
automatic_scaling:
  min_instances: 1
  max_instances: 10
env_variables:
  NODE_ENV: production
EOF

# 2. Deploy
gcloud app deploy
```

---

## 📋 **PASSO 4: Configurar Variáveis de Ambiente**

### 4.1 - No Google Cloud Run
```bash
# Definir variáveis usando Secret Manager
gcloud run services update pieng-propostas \
  --set-secrets="GEMINI_API_KEY=gemini-api-key:latest" \
  --set-secrets="OPENAI_API_KEY=openai-api-key:latest" \
  --set-secrets="GOOGLE_DRIVE_CLIENT_ID=google-drive-client-id:latest" \
  --set-secrets="GOOGLE_DRIVE_CLIENT_SECRET=google-drive-client-secret:latest" \
  --set-env-vars="NODE_ENV=production,AI_ENABLED=true"
```

### 4.2 - No App Engine
```bash
# Editar app.yaml para incluir secrets
runtime: nodejs18
env_variables:
  NODE_ENV: production
  AI_ENABLED: true
```

---

## 📋 **PASSO 5: Configurar Domínio Personalizado**

### 5.1 - Registrar Domínio
```bash
# Exemplo: pieng-propostas.com
# Registrar em qualquer provedor (GoDaddy, Namecheap, etc.)
```

### 5.2 - Configurar DNS
```bash
# Apontar para Google Cloud
# A record: @ → IP do Cloud Run
# CNAME: www → ghs.googlehosted.com
```

---

## 📋 **PASSO 6: Configurar CI/CD**

### 6.1 - GitHub Actions
```yaml
# .github/workflows/deploy.yml
name: Deploy to Google Cloud
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build
      - uses: google-github-actions/deploy-cloudrun@v0
        with:
          service: pieng-propostas
          region: us-central1
          credentials: ${{ secrets.GCP_SA_KEY }}
```

---

## 🔐 **SEGURANÇA - Melhores Práticas**

### ✅ **O que FAZER:**
1. **Nunca commitar** arquivos `.env` com chaves reais
2. **Usar Secret Manager** do Google Cloud
3. **Rotacionar chaves** periodicamente
4. **Monitorar uso** das APIs
5. **Usar HTTPS** sempre

### ❌ **O que NÃO FAZER:**
1. **Nunca** colocar chaves no código
2. **Nunca** commitar credenciais
3. **Nunca** usar chaves em logs
4. **Nunca** compartilhar chaves por email/chat

---

## 💰 **Custos Estimados**

### Google Cloud Run:
- **CPU**: $0.00002400/vCPU-segundo
- **Memória**: $0.00000250/GiB-segundo
- **Requests**: $0.40/milhão de requests
- **Estimativa**: ~$5-20/mês para uso moderado

### APIs:
- **Gemini**: Gratuito (1M tokens/dia)
- **Google Drive**: Gratuito
- **Google Maps**: $7/1000 requests
- **OpenAI**: $0.03/1K tokens

---

## 🚀 **Vantagens da Migração**

### ✅ **Benefícios:**
1. **Sempre atualizado**: Trabalha direto do GitHub
2. **Escalabilidade**: Google Cloud escala automaticamente
3. **Segurança**: Secret Manager protege suas chaves
4. **Backup**: GitHub mantém histórico completo
5. **Colaboração**: Múltiplos desenvolvedores podem trabalhar
6. **CI/CD**: Deploy automático a cada commit

### 🎯 **Fluxo de Trabalho:**
```
Desenvolvimento Local → Commit GitHub → Deploy Automático → Google Cloud
```

---

## 📞 **Próximos Passos**

1. **Testar localmente** com o arquivo `env.example`
2. **Configurar Google Cloud** seguindo os passos
3. **Fazer primeiro deploy** de teste
4. **Configurar domínio** personalizado
5. **Migrar dados** existentes
6. **Configurar CI/CD** para automação

---

## 🆘 **Suporte**

Se precisar de ajuda em qualquer passo:
1. **Documentação Google Cloud**: https://cloud.google.com/docs
2. **GitHub Actions**: https://docs.github.com/en/actions
3. **Next.js Deploy**: https://nextjs.org/docs/deployment

**Boa sorte com a migração! 🚀**
