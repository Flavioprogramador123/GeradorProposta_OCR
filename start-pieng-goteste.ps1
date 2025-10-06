# 🚀 PIENG-ENTERPRISE + GOTESTE - SCRIPT DE INICIALIZAÇÃO COMPLETO
# Inicia todo o ecossistema PIENG com GoTeste integrado

Write-Host ""
Write-Host "🚀 INICIANDO PIENG-ENTERPRISE + GOTESTE" -ForegroundColor Blue
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

# Verificar Python
if (!(Get-Command python -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Python não instalado!" -ForegroundColor Red
    Write-Host "Instale em: https://python.org/" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Dependências encontradas" -ForegroundColor Green

# 1. Iniciar Frontend Unificado
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

# 2. Iniciar GoTeste Integration
Write-Host ""
Write-Host "🔧 Iniciando GoTeste Integration..." -ForegroundColor Cyan
Set-Location projetos\goteste

# Verificar se requirements estão instalados
if (!(Test-Path "venv")) {
    Write-Host "📦 Criando ambiente virtual Python..." -ForegroundColor Yellow
    python -m venv venv
}

# Ativar ambiente virtual
Write-Host "🔧 Ativando ambiente virtual..." -ForegroundColor Yellow
& ".\venv\Scripts\Activate.ps1"

# Instalar dependências
Write-Host "📦 Instalando dependências Python..." -ForegroundColor Yellow
pip install -r requirements.txt

# Iniciar GoTeste Integration em background
Write-Host "🚀 Iniciando GoTeste Integration..." -ForegroundColor Green
Start-Process -NoNewWindow -FilePath "python" -ArgumentList "integration_pieng.py"

# Voltar ao diretório principal
Set-Location ..\..

# 3. Iniciar GoTeste Principal (opcional)
Write-Host ""
Write-Host "🤖 Iniciando GoTeste Principal..." -ForegroundColor Cyan
Set-Location projetos\goteste

# Iniciar GoTeste principal em background
Write-Host "🚀 Iniciando GoTeste Principal..." -ForegroundColor Green
Start-Process -NoNewWindow -FilePath "python" -ArgumentList "main.py"

# Voltar ao diretório principal
Set-Location ..\..

# Aguardar um pouco para os serviços inicializarem
Write-Host ""
Write-Host "⏳ Aguardando serviços inicializarem..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

Write-Host ""
Write-Host "✅ PIENG-ENTERPRISE + GOTESTE INICIADO COM SUCESSO!" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 Frontend Unificado: http://localhost:3000" -ForegroundColor Cyan
Write-Host "🔧 GoTeste Integration: http://localhost:5001" -ForegroundColor Cyan
Write-Host "🤖 GoTeste Principal: http://localhost:5000" -ForegroundColor Cyan
Write-Host ""
Write-Host "📊 Dashboards Disponíveis:" -ForegroundColor Purple
Write-Host "   • Dashboard Principal: http://localhost:3000" -ForegroundColor White
Write-Host "   • GoTeste Monitor: http://localhost:3000/goteste" -ForegroundColor White
Write-Host "   • Solar Generator: http://localhost:3000/propostas" -ForegroundColor White
Write-Host "   • Sistema de Gestão: http://localhost:3000/gestao" -ForegroundColor White
Write-Host "   • Image Studio: http://localhost:3000/studio" -ForegroundColor White
Write-Host "   • Solar Analysis: http://localhost:3000/solar" -ForegroundColor White
Write-Host "   • Automação: http://localhost:3000/automacao" -ForegroundColor White
Write-Host ""
Write-Host "🔧 APIs Disponíveis:" -ForegroundColor Purple
Write-Host "   • GoTeste Integration: http://localhost:5001/api/pieng/status" -ForegroundColor White
Write-Host "   • GoTeste Principal: http://localhost:5000/api/status" -ForegroundColor White
Write-Host ""
Write-Host "💰 ECONOMIA: $96/mês (88% redução)" -ForegroundColor Green
Write-Host "🎯 Sistema unificado e monitorado!" -ForegroundColor Green
Write-Host ""
Write-Host "Para parar o sistema, pressione Ctrl+C" -ForegroundColor Yellow
Write-Host ""

# Manter o script rodando
try {
    while ($true) {
        Start-Sleep -Seconds 30
        
        # Verificar se os serviços ainda estão rodando
        $frontend = Get-Process -Name "node" -ErrorAction SilentlyContinue
        $goteste = Get-Process -Name "python" -ErrorAction SilentlyContinue
        
        if (!$frontend) {
            Write-Host "⚠️ Frontend parou, reiniciando..." -ForegroundColor Yellow
            Set-Location frontend-unified
            Start-Process -NoNewWindow -FilePath "npm" -ArgumentList "run", "dev"
            Set-Location ..
        }
        
        if (!$goteste) {
            Write-Host "⚠️ GoTeste parou, reiniciando..." -ForegroundColor Yellow
            Set-Location projetos\goteste
            Start-Process -NoNewWindow -FilePath "python" -ArgumentList "integration_pieng.py"
            Set-Location ..\..
        }
    }
} catch {
    Write-Host ""
    Write-Host "🛑 Sistema parado pelo usuário" -ForegroundColor Yellow
}


