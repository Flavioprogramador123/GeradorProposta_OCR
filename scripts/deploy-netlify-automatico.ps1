# 🚀 PIENG - DEPLOY AUTOMÁTICO NETLIFY
# Script para automatizar o deploy das propostas no Netlify

param(
    [string]$ClienteNome = "",
    [string]$EmailCliente = "",
    [switch]$ApenasGerar = $false
)

Write-Host ""
Write-Host "🚀 DEPLOY AUTOMÁTICO NETLIFY - PIENG SOLUÇÕES" -ForegroundColor Blue
Write-Host "=============================================" -ForegroundColor Blue
Write-Host ""

# Configurações
$NETLIFY_URL = "https://pieng-propostas-solares.netlify.app"
$PROPOSTAS_DIR = "pastanetilify\orçamento\clientes"
$SCRIPT_DIR = "scripts"

# 1. GERAR INDEX.HTML AUTOMATICAMENTE
Write-Host "📝 Gerando index.html automaticamente..." -ForegroundColor Yellow
Set-Location $SCRIPT_DIR
node generate-netlify-index.js
Set-Location ..

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erro ao gerar index.html" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Index.html gerado com sucesso!" -ForegroundColor Green

# 2. VERIFICAR ARQUIVOS
Write-Host "🔍 Verificando arquivos..." -ForegroundColor Yellow
if (-not (Test-Path "pastanetilify\index.html")) {
    Write-Host "❌ Arquivo index.html não encontrado" -ForegroundColor Red
    exit 1
}

$propostasCount = (Get-ChildItem "pastanetilify\orçamento\clientes\*.html").Count
Write-Host "📊 Total de propostas encontradas: $propostasCount" -ForegroundColor Cyan

# 3. FAZER COMMIT E PUSH (se não for apenas gerar)
if (-not $ApenasGerar) {
    Write-Host "📤 Fazendo commit e push para GitHub..." -ForegroundColor Yellow
    
    # Verificar se é um repositório Git
    if (Test-Path ".git") {
        git add .
        git commit -m "🤖 Deploy automático: Atualização de propostas - $(Get-Date -Format 'dd/MM/yyyy HH:mm')"
        git push origin main
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Push realizado com sucesso!" -ForegroundColor Green
            Write-Host "🌐 Netlify irá fazer deploy automaticamente em alguns minutos" -ForegroundColor Cyan
        } else {
            Write-Host "❌ Erro no push para GitHub" -ForegroundColor Red
        }
    } else {
        Write-Host "⚠️  Não é um repositório Git. Execute manualmente:" -ForegroundColor Yellow
        Write-Host "   git add ." -ForegroundColor Gray
        Write-Host "   git commit -m 'Deploy automático'" -ForegroundColor Gray
        Write-Host "   git push origin main" -ForegroundColor Gray
    }
}

# 4. ENVIAR LINK PARA CLIENTE (se especificado)
if ($ClienteNome -and $EmailCliente) {
    Write-Host "📧 Preparando envio de email para cliente..." -ForegroundColor Yellow
    
    $propostaUrl = "$NETLIFY_URL/orçamento/clientes/proposta_$($ClienteNome.ToLower())-$(Get-Date -Format 'dd-MM-yyyy').html"
    
    $emailBody = @"
Olá $ClienteNome,

Sua proposta solar personalizada está pronta! 🌞

🔗 Link da proposta: $propostaUrl

A proposta contém:
✅ Análise completa do seu consumo energético
✅ Sistemas solares personalizados
✅ Cálculo de economia e payback
✅ Especificações técnicas detalhadas

Qualquer dúvida, estou à disposição!

Atenciosamente,
Equipe PIENG Soluções Energéticas
📞 (62) 99167-0536
📧 contato@piengsolucoes.com.br
"@

    Write-Host "📋 Email preparado para: $EmailCliente" -ForegroundColor Cyan
    Write-Host "🔗 Link da proposta: $propostaUrl" -ForegroundColor Cyan
    
    # Salvar email em arquivo para envio manual
    $emailFile = "email-$($ClienteNome.ToLower())-$(Get-Date -Format 'yyyyMMdd-HHmm').txt"
    $emailBody | Out-File -FilePath $emailFile -Encoding UTF8
    Write-Host "💾 Email salvo em: $emailFile" -ForegroundColor Green
}

# 5. RESUMO FINAL
Write-Host ""
Write-Host "🎉 PROCESSO CONCLUÍDO!" -ForegroundColor Green
Write-Host "=====================" -ForegroundColor Green
Write-Host "📊 Propostas processadas: $propostasCount" -ForegroundColor White
Write-Host "🌐 URL do site: $NETLIFY_URL" -ForegroundColor White
Write-Host "📁 Pasta local: pastanetilify\" -ForegroundColor White

if ($ClienteNome) {
    Write-Host "👤 Cliente: $ClienteNome" -ForegroundColor White
    Write-Host "📧 Email: $EmailCliente" -ForegroundColor White
}

Write-Host ""
Write-Host "💡 PRÓXIMOS PASSOS:" -ForegroundColor Yellow
Write-Host "1. Aguarde alguns minutos para o Netlify fazer o deploy" -ForegroundColor Gray
Write-Host "2. Acesse $NETLIFY_URL para verificar" -ForegroundColor Gray
Write-Host "3. Envie o link para o cliente" -ForegroundColor Gray
Write-Host ""

# 6. ABRIR SITE NO NAVEGADOR
if (-not $ApenasGerar) {
    Write-Host "🌐 Abrindo site no navegador..." -ForegroundColor Cyan
    Start-Process $NETLIFY_URL
}
