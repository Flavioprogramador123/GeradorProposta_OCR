# 🏢 INSTRUÇÕES PARA INTEGRAÇÃO PIENG_ENTERPRISE ECOSYSTEM

## 📋 **Para o Chat/IA de Administração do Ecossistema:**

### **🎯 OBJETIVO:**
Incluir o sistema **GoTeste** (Sistema de Monitoramento e Otimização de Performance) no projeto `pieng-enterprise` com todas as permissões necessárias.

---

## 🔐 **1. CONFIGURAÇÃO DE PERMISSÕES IAM**

### **Adicionar usuário ao projeto:**
```bash
# Adicionar flavioprogramador123@gmail.com ao projeto pieng-enterprise
gcloud projects add-iam-policy-binding pieng-enterprise \
    --member="user:flavioprogramador123@gmail.com" \
    --role="roles/owner"

# OU se preferir permissões específicas:
gcloud projects add-iam-policy-binding pieng-enterprise \
    --member="user:flavioprogramador123@gmail.com" \
    --role="roles/run.admin"

gcloud projects add-iam-policy-binding pieng-enterprise \
    --member="user:flavioprogramador123@gmail.com" \
    --role="roles/cloudbuild.builds.editor"

gcloud projects add-iam-policy-binding pieng-enterprise \
    --member="user:flavioprogramador123@gmail.com" \
    --role="roles/secretmanager.admin"
```

---

## ⚙️ **2. ATIVAÇÃO DE APIs NECESSÁRIAS**

### **APIs obrigatórias para o GoTeste:**
```bash
gcloud services enable cloudbuild.googleapis.com \
    run.googleapis.com \
    containerregistry.googleapis.com \
    secretmanager.googleapis.com \
    generativelanguage.googleapis.com \
    iamcredentials.googleapis.com \
    logging.googleapis.com \
    monitoring.googleapis.com \
    --project=pieng-enterprise
```

---

## 🤖 **3. CONFIGURAÇÃO DA SERVICE ACCOUNT**

### **Verificar se a Service Account existe:**
```bash
gcloud iam service-accounts describe goteste@pieng-enterprise.iam.gserviceaccount.com \
    --project=pieng-enterprise
```

### **Se não existir, criar:**
```bash
gcloud iam service-accounts create goteste \
    --display-name="GoTeste System Monitor" \
    --description="Service Account para sistema de monitoramento GoTeste" \
    --project=pieng-enterprise
```

### **Conceder permissões necessárias:**
```bash
# Permissões para Cloud Run
gcloud projects add-iam-policy-binding pieng-enterprise \
    --member="serviceAccount:goteste@pieng-enterprise.iam.gserviceaccount.com" \
    --role="roles/run.invoker"

# Permissões para Secret Manager
gcloud projects add-iam-policy-binding pieng-enterprise \
    --member="serviceAccount:goteste@pieng-enterprise.iam.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"

# Permissões para Logging
gcloud projects add-iam-policy-binding pieng-enterprise \
    --member="serviceAccount:goteste@pieng-enterprise.iam.gserviceaccount.com" \
    --role="roles/logging.logWriter"
```

---

## 🔑 **4. CONFIGURAÇÃO DE SECRETS**

### **Criar secrets no Secret Manager:**
```bash
# Gemini API Key (já fornecida)
echo "YOUR_GEMINI_API_KEY" | \
gcloud secrets create GEMINI_API_KEY \
    --data-file=- \
    --project=pieng-enterprise

# OpenAI API Key (se houver)
echo "YOUR_OPENAI_KEY_HERE" | \
gcloud secrets create OPENAI_API_KEY \
    --data-file=- \
    --project=pieng-enterprise

# Dar acesso à service account
gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
    --member="serviceAccount:goteste@pieng-enterprise.iam.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor" \
    --project=pieng-enterprise

gcloud secrets add-iam-policy-binding OPENAI_API_KEY \
    --member="serviceAccount:goteste@pieng-enterprise.iam.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor" \
    --project=pieng-enterprise
```

---

## 🌐 **5. CONFIGURAÇÃO DE REDE E DOMÍNIO**

### **Configurar domínio personalizado (opcional):**
```bash
# Se houver domínio do ecossistema PIENG
# Exemplo: goteste.pieng-enterprise.com

gcloud run domain-mappings create \
    --service=goteste \
    --domain=goteste.pieng-enterprise.com \
    --region=us-central1 \
    --project=pieng-enterprise
```

---

## 📊 **6. INTEGRAÇÃO COM MONITORAMENTO**

### **Configurar alertas e dashboards:**
```bash
# Criar política de alerta para o GoTeste
gcloud alpha monitoring policies create \
    --policy-from-file=goteste-alert-policy.yaml \
    --project=pieng-enterprise
```

---

## 🚀 **7. DEPLOY AUTOMATIZADO**

### **Configurar trigger no Cloud Build:**
```bash
gcloud builds triggers create github \
    --repo-name=goteste \
    --repo-owner=Flavioprogramador123 \
    --branch-pattern="^main$" \
    --build-config=cloudbuild.yaml \
    --project=pieng-enterprise
```

---

## 📋 **8. VALIDAÇÃO DA CONFIGURAÇÃO**

### **Verificar se tudo está configurado:**
```bash
# 1. Verificar projeto
gcloud config set project pieng-enterprise

# 2. Verificar APIs
gcloud services list --enabled | grep -E "(run|build|secret)"

# 3. Verificar Service Account
gcloud iam service-accounts list --filter="email:goteste@*"

# 4. Verificar Secrets
gcloud secrets list

# 5. Testar deploy
gcloud builds submit --config cloudbuild.yaml .
```

---

## 🎯 **RESUMO PARA EXECUÇÃO:**

Execute estes comandos na ordem para integrar o GoTeste ao ecossistema:

```bash
# 1. Adicionar usuário
gcloud projects add-iam-policy-binding pieng-enterprise --member="user:flavioprogramador123@gmail.com" --role="roles/owner"

# 2. Ativar APIs
gcloud services enable cloudbuild.googleapis.com run.googleapis.com containerregistry.googleapis.com secretmanager.googleapis.com generativelanguage.googleapis.com --project=pieng-enterprise

# 3. Criar secrets
echo "YOUR_GEMINI_API_KEY" | gcloud secrets create GEMINI_API_KEY --data-file=- --project=pieng-enterprise

# 4. Configurar permissões da service account
gcloud secrets add-iam-policy-binding GEMINI_API_KEY --member="serviceAccount:goteste@pieng-enterprise.iam.gserviceaccount.com" --role="roles/secretmanager.secretAccessor" --project=pieng-enterprise
```

---

## 📈 **BENEFÍCIOS DA INTEGRAÇÃO:**

✅ **Monitoramento unificado** do ecossistema PIENG  
✅ **Análise de performance** com IA integrada  
✅ **Alertas automáticos** de problemas no sistema  
✅ **Dashboard centralizado** para toda a infraestrutura  
✅ **Otimização automática** de recursos computacionais  

---

**Após executar essas configurações, o GoTeste estará totalmente integrado ao ecossistema PIENG_ENTERPRISE! 🎉**