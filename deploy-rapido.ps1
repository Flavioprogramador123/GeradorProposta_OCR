# 🚀 PIENG - DEPLOY RÁPIDO NETLIFY
# Script simplificado para deploy diário

Write-Host ""
Write-Host "🚀 DEPLOY RÁPIDO NETLIFY" -ForegroundColor Blue
Write-Host "========================" -ForegroundColor Blue
Write-Host ""

# Gerar index.html automaticamente
Write-Host "📝 Gerando index.html..." -ForegroundColor Yellow
node scripts/generate-netlify-index.js

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Index.html gerado!" -ForegroundColor Green
    
    # Fazer commit e push
    Write-Host "📤 Fazendo commit..." -ForegroundColor Yellow
    git add .
    git commit -m "🤖 Deploy automático: $(Get-Date -Format 'dd/MM/yyyy HH:mm')"
    git push origin clean-main
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Deploy realizado!" -ForegroundColor Green
        Write-Host "🌐 Site: https://pieng-propostas-solares.netlify.app" -ForegroundColor Cyan
        Write-Host "⏱️  Aguarde alguns minutos para atualizar..." -ForegroundColor Yellow
        
        # Abrir site
        Start-Process "https://pieng-propostas-solares.netlify.app"
    } else {
        Write-Host "❌ Erro no push" -ForegroundColor Red
    }
} else {
    Write-Host "❌ Erro ao gerar index.html" -ForegroundColor Red
}