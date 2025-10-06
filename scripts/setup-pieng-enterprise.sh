#!/bin/bash

# 🏢 PIENG_ENTERPRISE - Setup Script
# Configuração completa do hub central no Google Cloud

set -e

echo "🚀 Iniciando configuração do PIENG_ENTERPRISE..."

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para log
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
}

# Verificar se gcloud está instalado
if ! command -v gcloud &> /dev/null; then
    error "Google Cloud CLI não está instalado!"
    echo "Instale em: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Verificar se está logado
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    error "Você não está logado no Google Cloud!"
    echo "Execute: gcloud auth login"
    exit 1
fi

# Configurações
PROJECT_ID="pieng-enterprise"
REGION="us-central1"

log "Configurando projeto: $PROJECT_ID"

# 1. Criar/Configurar projeto
log "Criando projeto no Google Cloud..."
if gcloud projects describe $PROJECT_ID &> /dev/null; then
    success "Projeto $PROJECT_ID já existe"
else
    gcloud projects create $PROJECT_ID --name="PIENG Enterprise Hub"
    success "Projeto $PROJECT_ID criado"
fi

# Definir projeto ativo
gcloud config set project $PROJECT_ID
success "Projeto $PROJECT_ID definido como ativo"

# 2. Habilitar APIs necessárias
log "Habilitando APIs necessárias..."

APIS=(
    "secretmanager.googleapis.com"
    "run.googleapis.com"
    "cloudbuild.googleapis.com"
    "maps.googleapis.com"
    "solar.googleapis.com"
    "drive.googleapis.com"
    "oauth2.googleapis.com"
)

for api in "${APIS[@]}"; do
    log "Habilitando $api..."
    gcloud services enable $api
    success "$api habilitada"
done

# 3. Configurar Secret Manager
log "Configurando Secret Manager..."

# Função para criar secret
create_secret() {
    local secret_name=$1
    local secret_value=$2
    
    if gcloud secrets describe $secret_name &> /dev/null; then
        warning "Secret $secret_name já existe"
    else
        echo "$secret_value" | gcloud secrets create $secret_name --data-file=-
        success "Secret $secret_name criado"
    fi
}

# Solicitar chaves do usuário
echo ""
echo "🔐 CONFIGURAÇÃO DE CHAVES DE API"
echo "================================="
echo ""

# Gemini API Key
read -p "Digite sua GEMINI_API_KEY: " GEMINI_KEY
if [ ! -z "$GEMINI_KEY" ]; then
    create_secret "pieng-gemini-api-key" "$GEMINI_KEY"
fi

# OpenAI API Key
read -p "Digite sua OPENAI_API_KEY: " OPENAI_KEY
if [ ! -z "$OPENAI_KEY" ]; then
    create_secret "pieng-openai-api-key" "$OPENAI_KEY"
fi

# OpenRouter API Key
read -p "Digite sua OPENROUTER_API_KEY (opcional): " OPENROUTER_KEY
if [ ! -z "$OPENROUTER_KEY" ]; then
    create_secret "pieng-openrouter-api-key" "$OPENROUTER_KEY"
fi

# Google Maps API Key
read -p "Digite sua GOOGLE_MAPS_API_KEY: " MAPS_KEY
if [ ! -z "$MAPS_KEY" ]; then
    create_secret "pieng-google-maps-api-key" "$MAPS_KEY"
fi

# Google Drive OAuth (já conhecido)
create_secret "pieng-google-drive-client-id" "YOUR_GOOGLE_DRIVE_CLIENT_ID.apps.googleusercontent.com"
create_secret "pieng-google-drive-client-secret" "GOCSPX-YOUR_GOOGLE_DRIVE_CLIENT_SECRET"

# 4. Configurar Service Account
log "Configurando Service Account..."

SA_NAME="pieng-enterprise-sa"
SA_EMAIL="$SA_NAME@$PROJECT_ID.iam.gserviceaccount.com"

if gcloud iam service-accounts describe $SA_EMAIL &> /dev/null; then
    success "Service Account $SA_NAME já existe"
else
    gcloud iam service-accounts create $SA_NAME \
        --display-name="PIENG Enterprise Service Account" \
        --description="Service Account para todos os projetos Pieng"
    success "Service Account $SA_NAME criado"
fi

# Permissões necessárias
PERMISSIONS=(
    "roles/secretmanager.secretAccessor"
    "roles/run.admin"
    "roles/storage.admin"
    "roles/cloudbuild.builds.builder"
)

for permission in "${PERMISSIONS[@]}"; do
    gcloud projects add-iam-policy-binding $PROJECT_ID \
        --member="serviceAccount:$SA_EMAIL" \
        --role="$permission" &> /dev/null
done

success "Permissões configuradas para Service Account"

# 5. Criar chave do Service Account
log "Criando chave do Service Account..."
KEY_FILE="pieng-enterprise-sa-key.json"

if [ ! -f "$KEY_FILE" ]; then
    gcloud iam service-accounts keys create $KEY_FILE \
        --iam-account=$SA_EMAIL
    success "Chave do Service Account criada: $KEY_FILE"
else
    warning "Chave do Service Account já existe: $KEY_FILE"
fi

# 6. Configurar Artifact Registry
log "Configurando Artifact Registry..."
REPOSITORY="pieng-repos"

if gcloud artifacts repositories describe $REPOSITORY --location=$REGION &> /dev/null; then
    success "Repositório $REPOSITORY já existe"
else
    gcloud artifacts repositories create $REPOSITORY \
        --repository-format=docker \
        --location=$REGION \
        --description="Repositório Docker para projetos Pieng"
    success "Repositório $REPOSITORY criado"
fi

# 7. Criar arquivo de configuração
log "Criando arquivo de configuração..."

cat > pieng-enterprise-config.json << EOF
{
  "project": {
    "id": "$PROJECT_ID",
    "region": "$REGION",
    "serviceAccount": "$SA_EMAIL"
  },
  "secrets": {
    "gemini": "pieng-gemini-api-key",
    "openai": "pieng-openai-api-key",
    "openrouter": "pieng-openrouter-api-key",
    "maps": "pieng-google-maps-api-key",
    "driveClientId": "pieng-google-drive-client-id",
    "driveClientSecret": "pieng-google-drive-client-secret"
  },
  "apis": {
    "enabled": [
      "secretmanager.googleapis.com",
      "run.googleapis.com",
      "cloudbuild.googleapis.com",
      "maps.googleapis.com",
      "solar.googleapis.com",
      "drive.googleapis.com",
      "oauth2.googleapis.com"
    ]
  },
  "repository": {
    "name": "$REPOSITORY",
    "location": "$REGION"
  }
}
EOF

success "Arquivo de configuração criado: pieng-enterprise-config.json"

# 8. Criar Dockerfile para projetos
log "Criando Dockerfile padrão..."

cat > Dockerfile.enterprise << EOF
# PIENG Enterprise - Dockerfile Padrão
FROM node:18-alpine

WORKDIR /app

# Instalar dependências
COPY package*.json ./
RUN npm ci --only=production

# Copiar código
COPY . .

# Build da aplicação
RUN npm run build

# Expor porta
EXPOSE 3000

# Comando de inicialização
CMD ["npm", "start"]
EOF

success "Dockerfile padrão criado"

# 9. Criar script de deploy
log "Criando script de deploy..."

cat > deploy-enterprise.sh << 'EOF'
#!/bin/bash

# Script de deploy para projetos Pieng Enterprise

PROJECT_NAME=${1:-"pieng-propostas-solares"}
SERVICE_NAME=${2:-$PROJECT_NAME}
REGION="us-central1"

echo "🚀 Deploying $PROJECT_NAME to Google Cloud Run..."

# Build e push da imagem
gcloud builds submit --tag gcr.io/pieng-enterprise/$SERVICE_NAME

# Deploy no Cloud Run
gcloud run deploy $SERVICE_NAME \
  --image gcr.io/pieng-enterprise/$SERVICE_NAME \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --set-secrets="GEMINI_API_KEY=pieng-gemini-api-key:latest" \
  --set-secrets="OPENAI_API_KEY=pieng-openai-api-key:latest" \
  --set-secrets="OPENROUTER_API_KEY=pieng-openrouter-api-key:latest" \
  --set-secrets="GOOGLE_MAPS_API_KEY=pieng-google-maps-api-key:latest" \
  --set-secrets="GOOGLE_DRIVE_CLIENT_ID=pieng-google-drive-client-id:latest" \
  --set-secrets="GOOGLE_DRIVE_CLIENT_SECRET=pieng-google-drive-client-secret:latest" \
  --set-env-vars="NODE_ENV=production,PROJECT_NAME=$PROJECT_NAME"

echo "✅ Deploy concluído!"
EOF

chmod +x deploy-enterprise.sh
success "Script de deploy criado"

# 10. Resumo final
echo ""
echo "🎉 CONFIGURAÇÃO CONCLUÍDA!"
echo "=========================="
echo ""
echo "📋 RESUMO:"
echo "• Projeto: $PROJECT_ID"
echo "• Região: $REGION"
echo "• Service Account: $SA_EMAIL"
echo "• Chave SA: $KEY_FILE"
echo "• Configuração: pieng-enterprise-config.json"
echo "• Script Deploy: deploy-enterprise.sh"
echo ""
echo "🔐 SECRETS CRIADOS:"
gcloud secrets list --format="table(name)" | grep pieng-
echo ""
echo "🚀 PRÓXIMOS PASSOS:"
echo "1. Configure as variáveis de ambiente nos seus projetos"
echo "2. Use o script deploy-enterprise.sh para fazer deploy"
echo "3. Configure CI/CD com GitHub Actions"
echo ""
echo "📚 DOCUMENTAÇÃO:"
echo "• Arquitetura: PIENG_ENTERPRISE_ARCHITECTURE.md"
echo "• Migração: MIGRACAO_GOOGLE_CLOUD.md"
echo ""
success "PIENG_ENTERPRISE configurado com sucesso! 🚀"
