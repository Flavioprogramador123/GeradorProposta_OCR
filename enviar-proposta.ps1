# PIENG - ENVIO DE PROPOSTA PARA CLIENTE
# Script simplificado para envio de propostas

param(
    [Parameter(Mandatory=$true)]
    [string]$ClienteNome,
    
    [Parameter(Mandatory=$true)]
    [string]$ClienteEmail,
    
    [Parameter(Mandatory=$true)]
    [string]$PropostaSlug
)

Write-Host ""
Write-Host "ENVIO AUTOMATICO DE PROPOSTA" -ForegroundColor Blue
Write-Host "=============================" -ForegroundColor Blue
Write-Host ""

# Configuracoes
$API_URL = "https://pieng-propostas-solares.netlify.app/.netlify/functions/send-proposal-email"
$PROPOSTA_URL = "https://pieng-propostas-solares.netlify.app/orçamento/clientes/proposta_$PropostaSlug.html"

# Dados para envio
$emailData = @{
    clienteNome = $ClienteNome
    clienteEmail = $ClienteEmail
    propostaUrl = $PROPOSTA_URL
} | ConvertTo-Json

Write-Host "Cliente: $ClienteNome" -ForegroundColor Cyan
Write-Host "Email: $ClienteEmail" -ForegroundColor Cyan
Write-Host "Proposta: $PROPOSTA_URL" -ForegroundColor Cyan
Write-Host ""

# Enviar email
Write-Host "Enviando email..." -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri $API_URL -Method POST -Body $emailData -ContentType "application/json"
    
    if ($response.success) {
        Write-Host "Email enviado com sucesso!" -ForegroundColor Green
        Write-Host "Link da proposta: $($response.propostaUrl)" -ForegroundColor Gray
        
        # Abrir proposta no navegador
        Start-Process $PROPOSTA_URL
        
    } else {
        Write-Host "Erro ao enviar email: $($response.error)" -ForegroundColor Red
    }
    
} catch {
    Write-Host "Erro na requisicao: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "PROCESSO CONCLUIDO!" -ForegroundColor Green
