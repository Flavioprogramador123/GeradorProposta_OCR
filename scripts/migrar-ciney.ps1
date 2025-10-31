# Script PowerShell para migrar proposta ciney-30-10-2025 para Supabase
# Execute: .\scripts\migrar-ciney.ps1

$body = @{
    slug = "ciney-30-10-2025"
} | ConvertTo-Json

Write-Host "🔄 Migrando proposta ciney-30-10-2025 para Supabase..." -ForegroundColor Cyan

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/migrar-proposta-local" -Method POST -Body $body -ContentType "application/json"
    
    Write-Host "✅ Proposta migrada com sucesso!" -ForegroundColor Green
    Write-Host "📋 ID: $($response.proposta.id)" -ForegroundColor Yellow
    Write-Host "🔗 URL: https://pieng-propostas.vercel.app$($response.url)" -ForegroundColor Yellow
    
} catch {
    Write-Host "❌ Erro ao migrar:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host "`n💡 Certifique-se de que:" -ForegroundColor Yellow
    Write-Host "   1. O servidor Next.js está rodando (npm run dev)" -ForegroundColor Yellow
    Write-Host "   2. As variáveis Supabase estão configuradas no .env.local" -ForegroundColor Yellow
}

