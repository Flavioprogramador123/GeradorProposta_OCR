# 📧 ENVIO AUTOMÁTICO DE PROPOSTAS PARA CLIENTES
# Script para enviar propostas via email usando a API do Netlify

param(
    [Parameter(Mandatory=$true)]
    [string]$ClienteNome,
    
    [Parameter(Mandatory=$true)]
    [string]$ClienteEmail,
    
    [Parameter(Mandatory=$true)]
    [string]$PropostaSlug,
    
    [string]$ClienteTelefone = "",
    [string]$Cidade = "Anápolis/GO",
    [int]$ConsumoMensal = 2500,
    [string]$TipoInstalacao = "Telhado Fibrocimento"
)

Write-Host ""
Write-Host "📧 ENVIO AUTOMÁTICO DE PROPOSTA" -ForegroundColor Blue
Write-Host "===============================" -ForegroundColor Blue
Write-Host ""

# Configurações
$API_URL = "https://pieng-propostas-solares.netlify.app/.netlify/functions/send-proposal-email"
$PROPOSTA_URL = "https://pieng-propostas-solares.netlify.app/proposta/$PropostaSlug"

# Dados para envio
$emailData = @{
    clienteNome = $ClienteNome
    clienteEmail = $ClienteEmail
    clienteTelefone = $ClienteTelefone
    cidade = $Cidade
    consumoMensal = $ConsumoMensal
    tipoInstalacao = $TipoInstalacao
    propostaUrl = $PROPOSTA_URL
} | ConvertTo-Json

Write-Host "👤 Cliente: $ClienteNome" -ForegroundColor Cyan
Write-Host "📧 Email: $ClienteEmail" -ForegroundColor Cyan
Write-Host "🔗 Proposta: $PROPOSTA_URL" -ForegroundColor Cyan
Write-Host ""

# Enviar email
Write-Host "📤 Enviando email..." -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri $API_URL -Method POST -Body $emailData -ContentType "application/json"
    
    if ($response.success) {
        Write-Host "✅ Email enviado com sucesso!" -ForegroundColor Green
        Write-Host "📧 Message ID: $($response.messageId)" -ForegroundColor Gray
        Write-Host "🔗 Link da proposta: $($response.propostaUrl)" -ForegroundColor Gray
        
        # Salvar log do envio
        $logEntry = @{
            timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
            cliente = $ClienteNome
            email = $ClienteEmail
            proposta = $PropostaSlug
            url = $PROPOSTA_URL
            messageId = $response.messageId
        } | ConvertTo-Json
        
        $logFile = "logs\envios-propostas.json"
        if (-not (Test-Path "logs")) {
            New-Item -ItemType Directory -Path "logs" -Force
        }
        
        if (Test-Path $logFile) {
            $existingLogs = Get-Content $logFile | ConvertFrom-Json
            $existingLogs += $logEntry
            $existingLogs | ConvertTo-Json -Depth 3 | Out-File -FilePath $logFile -Encoding UTF8
        } else {
            @($logEntry) | ConvertTo-Json -Depth 3 | Out-File -FilePath $logFile -Encoding UTF8
        }
        
        Write-Host "📝 Log salvo em: $logFile" -ForegroundColor Gray
        
    } else {
        Write-Host "❌ Erro ao enviar email: $($response.error)" -ForegroundColor Red
        exit 1
    }
    
} catch {
    Write-Host "❌ Erro na requisição: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🎉 PROCESSO CONCLUÍDO!" -ForegroundColor Green
Write-Host "=====================" -ForegroundColor Green
Write-Host "📧 Email enviado para: $ClienteEmail" -ForegroundColor White
Write-Host "🔗 Proposta disponível em: $PROPOSTA_URL" -ForegroundColor White
Write-Host ""

# Abrir proposta no navegador
Write-Host "🌐 Abrindo proposta no navegador..." -ForegroundColor Cyan
Start-Process $PROPOSTA_URL

Write-Host ""
Write-Host "💡 PRÓXIMOS PASSOS:" -ForegroundColor Yellow
Write-Host "1. Aguarde o cliente acessar o link" -ForegroundColor Gray
Write-Host "2. Monitore o acesso através do Netlify Analytics" -ForegroundColor Gray
Write-Host "3. Entre em contato para esclarecer dúvidas" -ForegroundColor Gray
Write-Host ""
