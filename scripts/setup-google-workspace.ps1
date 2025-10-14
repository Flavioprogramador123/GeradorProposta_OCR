# GOOGLE WORKSPACE SETUP - PIENG SOLAR
# Script para configurar integração com Google Drive

Write-Host ""
Write-Host "GOOGLE WORKSPACE SETUP - PIENG SOLAR" -ForegroundColor Blue
Write-Host "=====================================" -ForegroundColor Blue
Write-Host ""

Write-Host "Este script irá configurar a integração com Google Drive para armazenar" -ForegroundColor Yellow
Write-Host "as propostas e dados dos clientes na nuvem." -ForegroundColor Yellow
Write-Host ""

# Verificar se as variáveis de ambiente já estão configuradas
$envFile = ".env.local"
$hasGoogleConfig = $false

if (Test-Path $envFile) {
    $envContent = Get-Content $envFile -Raw
    if ($envContent -match "GOOGLE_CLIENT_EMAIL" -and $envContent -match "GOOGLE_PRIVATE_KEY") {
        $hasGoogleConfig = $true
        Write-Host "✅ Configuração do Google já existe no arquivo .env.local" -ForegroundColor Green
    }
}

if (-not $hasGoogleConfig) {
    Write-Host "📋 CONFIGURAÇÃO NECESSÁRIA:" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "1. Acesse: https://console.cloud.google.com/" -ForegroundColor White
    Write-Host "2. Crie um novo projeto ou selecione um existente" -ForegroundColor White
    Write-Host "3. Ative a Google Drive API" -ForegroundColor White
    Write-Host "4. Crie credenciais de Service Account" -ForegroundColor White
    Write-Host "5. Baixe o arquivo JSON das credenciais" -ForegroundColor White
    Write-Host ""
    
    Write-Host "📝 INFORMAÇÕES NECESSÁRIAS:" -ForegroundColor Cyan
    Write-Host "- GOOGLE_CLIENT_EMAIL: Email da service account" -ForegroundColor White
    Write-Host "- GOOGLE_PRIVATE_KEY: Chave privada da service account" -ForegroundColor White
    Write-Host ""
    
    # Solicitar informações do usuário
    $clientEmail = Read-Host "Digite o GOOGLE_CLIENT_EMAIL"
    $privateKey = Read-Host "Digite o GOOGLE_PRIVATE_KEY (cole a chave completa)"
    
    if ($clientEmail -and $privateKey) {
        # Criar ou atualizar arquivo .env.local
        $envContent = @"
# Google Workspace Configuration
GOOGLE_CLIENT_EMAIL=$clientEmail
GOOGLE_PRIVATE_KEY=$privateKey

# Netlify Configuration
EMAIL_USER=seu-email@gmail.com
EMAIL_PASS=sua-senha-app
"@
        
        Set-Content -Path $envFile -Value $envContent -Encoding UTF8
        
        Write-Host "✅ Arquivo .env.local criado com sucesso!" -ForegroundColor Green
        Write-Host "📁 Localização: $(Get-Location)\$envFile" -ForegroundColor Gray
    } else {
        Write-Host "❌ Configuração cancelada" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "🔧 CONFIGURAÇÃO NO NETLIFY:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Acesse: https://app.netlify.com" -ForegroundColor White
Write-Host "2. Vá em Site Settings > Environment Variables" -ForegroundColor White
Write-Host "3. Adicione as seguintes variáveis:" -ForegroundColor White
Write-Host ""
Write-Host "   GOOGLE_CLIENT_EMAIL = $clientEmail" -ForegroundColor Yellow
Write-Host "   GOOGLE_PRIVATE_KEY = [cole a chave privada]" -ForegroundColor Yellow
Write-Host ""

Write-Host "📁 ESTRUTURA NO GOOGLE DRIVE:" -ForegroundColor Cyan
Write-Host ""
Write-Host "PIENG-Propostas/" -ForegroundColor White
Write-Host "├── Clientes/" -ForegroundColor White
Write-Host "│   ├── marcelo-14-10-2025/" -ForegroundColor White
Write-Host "│   │   ├── proposta.json" -ForegroundColor White
Write-Host "│   │   ├── proposta_marcelo-14-10-2025.html" -ForegroundColor White
Write-Host "│   │   └── proposta_resultados_marcelo-14-10-2025.html" -ForegroundColor White
Write-Host "│   └── [outros clientes...]" -ForegroundColor White
Write-Host "└── Configuracoes/" -ForegroundColor White
Write-Host ""

Write-Host "🚀 TESTANDO CONFIGURAÇÃO:" -ForegroundColor Cyan
Write-Host ""

# Testar se as variáveis estão configuradas
if (Test-Path $envFile) {
    Write-Host "✅ Arquivo .env.local encontrado" -ForegroundColor Green
    
    # Carregar variáveis de ambiente
    Get-Content $envFile | ForEach-Object {
        if ($_ -match "^([^=]+)=(.*)$") {
            [Environment]::SetEnvironmentVariable($matches[1], $matches[2], "Process")
        }
    }
    
    if ($env:GOOGLE_CLIENT_EMAIL -and $env:GOOGLE_PRIVATE_KEY) {
        Write-Host "✅ Variáveis de ambiente carregadas" -ForegroundColor Green
        Write-Host "📧 Client Email: $($env:GOOGLE_CLIENT_EMAIL)" -ForegroundColor Gray
        Write-Host "🔑 Private Key: [configurada]" -ForegroundColor Gray
    } else {
        Write-Host "❌ Variáveis de ambiente não encontradas" -ForegroundColor Red
    }
} else {
    Write-Host "❌ Arquivo .env.local não encontrado" -ForegroundColor Red
}

Write-Host ""
Write-Host "📋 PRÓXIMOS PASSOS:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Configure as variáveis no Netlify" -ForegroundColor White
Write-Host "2. Execute o deploy: .\deploy-rapido.ps1" -ForegroundColor White
Write-Host "3. Teste a sincronização no painel admin" -ForegroundColor White
Write-Host "4. Verifique os arquivos no Google Drive" -ForegroundColor White
Write-Host ""

Write-Host "💡 VANTAGENS DO GOOGLE WORKSPACE:" -ForegroundColor Cyan
Write-Host "✅ Armazenamento ilimitado na nuvem" -ForegroundColor Green
Write-Host "✅ Backup automático dos dados" -ForegroundColor Green
Write-Host "✅ Acesso de qualquer lugar" -ForegroundColor Green
Write-Host "✅ Versionamento de arquivos" -ForegroundColor Green
Write-Host "✅ Compartilhamento fácil com clientes" -ForegroundColor Green
Write-Host "✅ Integração com outros serviços Google" -ForegroundColor Green
Write-Host ""

Write-Host "🎉 CONFIGURAÇÃO CONCLUÍDA!" -ForegroundColor Green
Write-Host "========================" -ForegroundColor Green
