# ☁️ PIENG-ENTERPRISE - CONFIGURAÇÃO GOOGLE CLOUD
# Configuração completa do Google Cloud Platform

Write-Host ""
Write-Host "☁️ CONFIGURANDO GOOGLE CLOUD PLATFORM" -ForegroundColor Blue
Write-Host "=====================================" -ForegroundColor Blue
Write-Host ""

# 1. CONFIGURAR PROJETO
Write-Host "🔧 Configurando projeto..." -ForegroundColor Yellow
gcloud config set project pieng-enterprise
gcloud config set compute/region us-central1
gcloud config set compute/zone us-central1-a

# 2. HABILITAR APIs
Write-Host "🔧 Habilitando APIs necessárias..." -ForegroundColor Yellow
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable secretmanager.googleapis.com
gcloud services enable storage.googleapis.com
gcloud services enable monitoring.googleapis.com
gcloud services enable logging.googleapis.com

# 3. CONFIGURAR SECRET MANAGER
Write-Host "🔐 Configurando Secret Manager..." -ForegroundColor Yellow

# Criar secrets para APIs
$secrets = @(
    "GEMINI_API_KEY",
    "OPENAI_API_KEY", 
    "OPENROUTER_API_KEY",
    "GOOGLE_DRIVE_CLIENT_ID",
    "GOOGLE_DRIVE_CLIENT_SECRET",
    "GOOGLE_MAPS_API_KEY",
    "SUPABASE_URL",
    "SUPABASE_KEY"
)

foreach ($secret in $secrets) {
    Write-Host "🔐 Criando secret: $secret" -ForegroundColor Cyan
    gcloud secrets create $secret --data-file=- <<< "your_$secret`_here"
}

# 4. CONFIGURAR CLOUD STORAGE
Write-Host "📦 Configurando Cloud Storage..." -ForegroundColor Yellow

# Criar bucket para assets
gsutil mb gs://pieng-enterprise-assets
gsutil mb gs://pieng-enterprise-backups

# Configurar permissões
gsutil iam ch allUsers:objectViewer gs://pieng-enterprise-assets

# 5. CONFIGURAR CLOUD RUN
Write-Host "🚀 Configurando Cloud Run..." -ForegroundColor Yellow

# Criar service account
gcloud iam service-accounts create pieng-run-sa --display-name="PIENG Cloud Run Service Account"

# Configurar permissões
gcloud projects add-iam-policy-binding pieng-enterprise --member="serviceAccount:pieng-run-sa@pieng-enterprise.iam.gserviceaccount.com" --role="roles/secretmanager.secretAccessor"
gcloud projects add-iam-policy-binding pieng-enterprise --member="serviceAccount:pieng-run-sa@pieng-enterprise.iam.gserviceaccount.com" --role="roles/storage.objectViewer"

# 6. CONFIGURAR MONITORAMENTO
Write-Host "📊 Configurando monitoramento..." -ForegroundColor Yellow

# Criar alertas
gcloud alpha monitoring policies create --policy-from-file=monitoring-policy.yaml

# 7. CONFIGURAR CI/CD
Write-Host "🔄 Configurando CI/CD..." -ForegroundColor Yellow

# Criar trigger para Cloud Build
gcloud builds triggers create github --repo-name=pieng-ecosystem --repo-owner=flavi --branch-pattern="^main$" --build-config=cloudbuild.yaml

Write-Host ""
Write-Host "✅ GOOGLE CLOUD CONFIGURADO!" -ForegroundColor Green
Write-Host ""
Write-Host "🔧 Próximos passos:" -ForegroundColor Purple
Write-Host "   1. Configurar secrets com valores reais" -ForegroundColor White
Write-Host "   2. Deploy do backend para Cloud Run" -ForegroundColor White
Write-Host "   3. Configurar domínio personalizado" -ForegroundColor White
Write-Host "   4. Testar APIs em produção" -ForegroundColor White
Write-Host ""


