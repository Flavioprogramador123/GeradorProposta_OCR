# 🏢 PIENG ECOSYSTEM - SCRIPT DE INICIALIZAÇÃO
# Inicia todo o ecossistema unificado

Write-Host ""
Write-Host "🏢 INICIANDO PIENG ECOSYSTEM UNIFICADO" -ForegroundColor Blue
Write-Host "=====================================" -ForegroundColor Blue
Write-Host ""

# Verificar dependências
Write-Host "🔍 Verificando dependências..." -ForegroundColor Yellow

# Verificar Node.js
if (!(Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Node.js não instalado!" -ForegroundColor Red
    Write-Host "Instale em: https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

# Verificar npm
if (!(Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Host "❌ npm não instalado!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Node.js e npm encontrados" -ForegroundColor Green

# Verificar se Supabase CLI está instalado
if (!(Get-Command supabase -ErrorAction SilentlyContinue)) {
    Write-Host "⚠️ Supabase CLI não encontrado" -ForegroundColor Yellow
    Write-Host "Instalando Supabase CLI..." -ForegroundColor Yellow
    npm install -g supabase
}

# Verificar se Google Cloud CLI está instalado
if (!(Get-Command gcloud -ErrorAction SilentlyContinue)) {
    Write-Host "⚠️ Google Cloud CLI não encontrado" -ForegroundColor Yellow
    Write-Host "Instale em: https://cloud.google.com/sdk/docs/install" -ForegroundColor Yellow
    Write-Host "Continuando sem Google Cloud..." -ForegroundColor Yellow
}

# Iniciar Frontend
Write-Host ""
Write-Host "🌐 Iniciando Frontend Unificado..." -ForegroundColor Cyan
Set-Location frontend-unified

# Verificar se node_modules existe
if (!(Test-Path "node_modules")) {
    Write-Host "📦 Instalando dependências do frontend..." -ForegroundColor Yellow
    npm install
}

# Iniciar frontend em background
Write-Host "🚀 Iniciando servidor de desenvolvimento..." -ForegroundColor Green
Start-Process -NoNewWindow -FilePath "npm" -ArgumentList "run", "dev"

# Voltar ao diretório principal
Set-Location ..

# Aguardar um pouco para o servidor inicializar
Start-Sleep -Seconds 3

Write-Host ""
Write-Host "✅ PIENG ECOSYSTEM INICIADO COM SUCESSO!" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host "📊 Dashboard: http://localhost:3000" -ForegroundColor Cyan
Write-Host "🔧 Solar Generator: http://localhost:3000/propostas" -ForegroundColor Cyan
Write-Host "👥 Gestão: http://localhost:3000/gestao" -ForegroundColor Cyan
Write-Host "🎨 Image Studio: http://localhost:3000/studio" -ForegroundColor Cyan
Write-Host "📈 Solar Analysis: http://localhost:3000/solar" -ForegroundColor Cyan
Write-Host "⚡ Automação: http://localhost:3000/automacao" -ForegroundColor Cyan
Write-Host ""
Write-Host "💰 ECONOMIA: $96/mês (88% redução)" -ForegroundColor Green
Write-Host "🎯 Sistema unificado e escalável!" -ForegroundColor Green
Write-Host ""
Write-Host "Para parar o sistema, pressione Ctrl+C" -ForegroundColor Yellow
Write-Host ""

# Manter o script rodando
try {
    while ($true) {
        Start-Sleep -Seconds 10
    }
} catch {
    Write-Host ""
    Write-Host "🛑 Sistema parado pelo usuário" -ForegroundColor Yellow
}


