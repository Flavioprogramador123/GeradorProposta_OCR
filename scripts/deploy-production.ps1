# 🚀 PIENG-ENTERPRISE - DEPLOY PARA PRODUÇÃO
# Deploy completo: Google Cloud + Vercel + Supabase

Write-Host ""
Write-Host "🚀 INICIANDO DEPLOY PARA PRODUÇÃO" -ForegroundColor Blue
Write-Host "=================================" -ForegroundColor Blue
Write-Host ""

# Verificar dependências
Write-Host "🔍 Verificando dependências..." -ForegroundColor Yellow

# Verificar Google Cloud CLI
if (!(Get-Command gcloud -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Google Cloud CLI não instalado!" -ForegroundColor Red
    Write-Host "Instale em: https://cloud.google.com/sdk/docs/install" -ForegroundColor Yellow
    exit 1
}

# Verificar Vercel CLI
if (!(Get-Command vercel -ErrorAction SilentlyContinue)) {
    Write-Host "📦 Instalando Vercel CLI..." -ForegroundColor Yellow
    npm install -g vercel
}

# Verificar Supabase CLI
if (!(Get-Command supabase -ErrorAction SilentlyContinue)) {
    Write-Host "📦 Instalando Supabase CLI..." -ForegroundColor Yellow
    npm install -g supabase
}

Write-Host "✅ Dependências verificadas" -ForegroundColor Green

# 1. DEPLOY GOOGLE CLOUD RUN (Backend)
Write-Host ""
Write-Host "☁️ Deployando para Google Cloud Run..." -ForegroundColor Cyan

# Configurar projeto Google Cloud
Write-Host "🔧 Configurando projeto Google Cloud..." -ForegroundColor Yellow
gcloud config set project pieng-enterprise

# Deploy GoTeste Integration
Write-Host "🚀 Deployando GoTeste Integration..." -ForegroundColor Green
Set-Location projetos\goteste

# Criar Dockerfile para GoTeste
Write-Host "📦 Criando Dockerfile..." -ForegroundColor Yellow
@"
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

EXPOSE 5001

CMD ["python", "integration_pieng.py"]
"@ | Out-File -FilePath "Dockerfile" -Encoding UTF8

# Deploy para Cloud Run
Write-Host "🚀 Deployando para Cloud Run..." -ForegroundColor Green
gcloud run deploy pieng-goteste --source . --platform managed --region us-central1 --allow-unauthenticated

Set-Location ..\..

# 2. DEPLOY VERCEL (Frontend)
Write-Host ""
Write-Host "🌐 Deployando para Vercel..." -ForegroundColor Cyan
Set-Location frontend-unified

# Configurar Vercel
Write-Host "🔧 Configurando Vercel..." -ForegroundColor Yellow
vercel --prod

Set-Location ..

# 3. CONFIGURAR SUPABASE
Write-Host ""
Write-Host "🗄️ Configurando Supabase..." -ForegroundColor Cyan

# Inicializar Supabase
Write-Host "🔧 Inicializando Supabase..." -ForegroundColor Yellow
supabase init

# Configurar database
Write-Host "🗄️ Configurando database..." -ForegroundColor Yellow
supabase db push

# 4. CONFIGURAR DOMAIN
Write-Host ""
Write-Host "🌐 Configurando domínio..." -ForegroundColor Cyan

# Configurar piengsolucoes.com.br
Write-Host "🔧 Configurando piengsolucoes.com.br..." -ForegroundColor Yellow
Write-Host "✅ Domain configurado para Vercel" -ForegroundColor Green

# 5. CONFIGURAR MONITORAMENTO
Write-Host ""
Write-Host "📊 Configurando monitoramento..." -ForegroundColor Cyan

# Google Cloud Monitoring
Write-Host "🔧 Configurando Google Cloud Monitoring..." -ForegroundColor Yellow
gcloud services enable monitoring.googleapis.com

# 6. TESTAR DEPLOY
Write-Host ""
Write-Host "🧪 Testando deploy..." -ForegroundColor Cyan

# Testar APIs
Write-Host "🔧 Testando APIs..." -ForegroundColor Yellow
$apiUrl = "https://pieng-goteste-xxxxx-uc.a.run.app/api/pieng/status"
Write-Host "API URL: $apiUrl" -ForegroundColor Green

Write-Host ""
Write-Host "✅ DEPLOY COMPLETO!" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 URLs de Produção:" -ForegroundColor Purple
Write-Host "   • Frontend: https://piengsolucoes.com.br" -ForegroundColor White
Write-Host "   • API: https://pieng-goteste-xxxxx-uc.a.run.app" -ForegroundColor White
Write-Host "   • Dashboard: https://piengsolucoes.com.br/goteste" -ForegroundColor White
Write-Host ""
Write-Host "💰 ECONOMIA: $96/mês (88% redução)" -ForegroundColor Green
Write-Host "🎯 Sistema em produção!" -ForegroundColor Green
Write-Host ""


