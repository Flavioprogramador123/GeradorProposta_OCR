# Script PowerShell para monitorar busca do Supabase
# Execute: .\test-supabase-monitor.ps1

Write-Host "🧪 TESTE DE BUSCA DO SUPABASE" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Verificar se o servidor está rodando
Write-Host "🔍 Verificando se o servidor está rodando..." -ForegroundColor Yellow
$serverRunning = $false

try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/admin/orcamentos-todos" -Method GET -TimeoutSec 2 -ErrorAction SilentlyContinue
    if ($response.StatusCode -eq 200) {
        $serverRunning = $true
        Write-Host "✅ Servidor está rodando!" -ForegroundColor Green
    }
} catch {
    Write-Host "⚠️ Servidor não está rodando ou não respondeu" -ForegroundColor Yellow
    Write-Host "💡 Inicie o servidor com: npm run dev" -ForegroundColor Yellow
    Write-Host ""
    $startServer = Read-Host "Deseja iniciar o servidor agora? (S/N)"
    if ($startServer -eq "S" -or $startServer -eq "s") {
        Write-Host "🚀 Iniciando servidor..." -ForegroundColor Green
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; npm run dev"
        Write-Host "⏳ Aguardando servidor inicializar (10 segundos)..." -ForegroundColor Yellow
        Start-Sleep -Seconds 10
        $serverRunning = $true
    }
}

if (-not $serverRunning) {
    Write-Host "❌ Não é possível testar sem o servidor rodando" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "📡 Testando API: /api/admin/orcamentos-todos" -ForegroundColor Cyan
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/admin/orcamentos-todos" -Method GET
    
    Write-Host "✅ Resposta recebida!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📊 DADOS DA RESPOSTA:" -ForegroundColor Cyan
    Write-Host "   Source: $($response.source)" -ForegroundColor $(if ($response.source -eq 'supabase') { 'Green' } else { 'Yellow' })
    Write-Host "   Total de orçamentos: $($response.stats.total)" -ForegroundColor White
    Write-Host "   Pendentes: $($response.stats.pendentes)" -ForegroundColor Yellow
    Write-Host "   Aprovados: $($response.stats.aprovados)" -ForegroundColor Green
    Write-Host "   Rejeitados: $($response.stats.rejeitados)" -ForegroundColor Red
    Write-Host ""
    
    if ($response.source -eq 'supabase') {
        Write-Host "✅ CONFIRMADO: Dados estão vindo do Supabase!" -ForegroundColor Green
    } elseif ($response.source -eq 'supabase-empty') {
        Write-Host "⚠️ Supabase configurado mas sem dados" -ForegroundColor Yellow
    } elseif ($response.source -eq 'filesystem') {
        Write-Host "⚠️ ATENÇÃO: Dados estão vindo do filesystem (não do Supabase)" -ForegroundColor Yellow
        Write-Host "   Verifique as variáveis de ambiente NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY" -ForegroundColor Yellow
    } else {
        Write-Host "⚠️ Source desconhecido: $($response.source)" -ForegroundColor Yellow
    }
    
    if ($response.orcamentos -and $response.orcamentos.Count -gt 0) {
        Write-Host ""
        Write-Host "📋 PRIMEIRO ORÇAMENTO:" -ForegroundColor Cyan
        $primeiro = $response.orcamentos[0]
        Write-Host "   Cliente: $($primeiro.cliente)" -ForegroundColor White
        Write-Host "   Slug: $($primeiro.clientePasta)" -ForegroundColor White
        Write-Host "   Sistemas: $($primeiro.totalSistemas)" -ForegroundColor White
        Write-Host "   Status: $($primeiro.status)" -ForegroundColor White
        
        if ($primeiro.sistemas -and $primeiro.sistemas.Count -gt 0) {
            Write-Host ""
            Write-Host "💰 VALORES DOS SISTEMAS:" -ForegroundColor Cyan
            for ($i = 0; $i -lt $primeiro.sistemas.Count; $i++) {
                $sistema = $primeiro.sistemas[$i]
                $valor = if ($sistema.valorTotal) { 
                    "{0:N2}" -f $sistema.valorTotal 
                } else { 
                    "0,00" 
                }
                Write-Host "   Sistema $($i + 1):" -ForegroundColor White
                Write-Host "     - Título: $($sistema.titulo)" -ForegroundColor Gray
                Write-Host "     - Valor: R$ $valor" -ForegroundColor $(if ($sistema.valorTotal -gt 0) { 'Green' } else { 'Red' })
                Write-Host "     - Potência: $($sistema.potencia) kWp" -ForegroundColor Gray
            }
        }
    } else {
        Write-Host ""
        Write-Host "⚠️ Nenhum orçamento encontrado" -ForegroundColor Yellow
    }
    
    Write-Host ""
    Write-Host "🔍 VERIFICAÇÃO DE LOGS:" -ForegroundColor Cyan
    Write-Host "   Verifique o console do servidor Next.js para ver os logs detalhados:" -ForegroundColor White
    Write-Host "   - 🔍 Buscando propostas no Supabase..." -ForegroundColor Gray
    Write-Host "   - 📋 Processando proposta..." -ForegroundColor Gray
    Write-Host "   - ✅ Valor encontrado para sistema..." -ForegroundColor Gray
    Write-Host "   - ⚠️ Sistema sem valor encontrado..." -ForegroundColor Gray
    
} catch {
    Write-Host "❌ Erro ao testar API:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 Verifique:" -ForegroundColor Yellow
    Write-Host "   1. Servidor está rodando (npm run dev)" -ForegroundColor White
    Write-Host "   2. Variáveis de ambiente configuradas (.env.local)" -ForegroundColor White
    Write-Host "   3. Supabase está acessível" -ForegroundColor White
}

Write-Host ""
Write-Host "📝 PRÓXIMOS PASSOS:" -ForegroundColor Cyan
Write-Host "   1. Abra http://localhost:3000/admin/orcamentos no navegador" -ForegroundColor White
Write-Host "   2. Abra o DevTools (F12) e vá na aba Console" -ForegroundColor White
Write-Host "   3. Observe os logs do frontend" -ForegroundColor White
Write-Host "   4. Observe os logs do servidor no terminal onde rodou 'npm run dev'" -ForegroundColor White
Write-Host ""

