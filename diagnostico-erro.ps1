# Script de diagnóstico completo para identificar erros
Write-Host "`n🔍 DIAGNÓSTICO COMPLETO DE ERROS`n" -ForegroundColor Cyan
Write-Host "================================`n" -ForegroundColor Cyan

# 1. Testar API
Write-Host "1️⃣ Testando API..." -ForegroundColor Yellow
try {
    $apiResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/admin/orcamentos-todos" -Method GET -ErrorAction Stop
    Write-Host "   ✅ API respondeu com sucesso" -ForegroundColor Green
    Write-Host "   Source: $($apiResponse.source)" -ForegroundColor $(if ($apiResponse.source -eq 'supabase') { 'Green' } else { 'Yellow' })
    Write-Host "   Total: $($apiResponse.stats.total) orçamentos" -ForegroundColor White
    
    # Verificar valores zerados
    $valoresZerados = 0
    $valoresComValor = 0
    if ($apiResponse.orcamentos) {
        foreach ($orc in $apiResponse.orcamentos) {
            if ($orc.sistemas) {
                foreach ($sis in $orc.sistemas) {
                    if ($sis.valorTotal -eq 0 -or -not $sis.valorTotal) {
                        $valoresZerados++
                    } else {
                        $valoresComValor++
                    }
                }
            }
        }
    }
    Write-Host "   Sistemas com valor > 0: $valoresComValor" -ForegroundColor Green
    Write-Host "   Sistemas com valor = 0: $valoresZerados" -ForegroundColor $(if ($valoresZerados -gt 0) { 'Red' } else { 'Green' })
    
} catch {
    Write-Host "   ❌ Erro na API: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""

# 2. Testar página frontend
Write-Host "2️⃣ Testando página frontend..." -ForegroundColor Yellow
try {
    $pageResponse = Invoke-WebRequest -Uri "http://localhost:3000/admin/orcamentos" -Method GET -ErrorAction Stop
    Write-Host "   ✅ Página carregou (Status: $($pageResponse.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Erro ao carregar página: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# 3. Verificar variáveis de ambiente
Write-Host "3️⃣ Verificando variáveis de ambiente..." -ForegroundColor Yellow
$envFile = ".env.local"
if (Test-Path $envFile) {
    Write-Host "   ✅ Arquivo .env.local encontrado" -ForegroundColor Green
    $envContent = Get-Content $envFile
    $hasSupabaseUrl = $envContent | Select-String "NEXT_PUBLIC_SUPABASE_URL"
    $hasSupabaseKey = $envContent | Select-String "NEXT_PUBLIC_SUPABASE_ANON_KEY"
    
    if ($hasSupabaseUrl) {
        Write-Host "   ✅ NEXT_PUBLIC_SUPABASE_URL configurada" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️ NEXT_PUBLIC_SUPABASE_URL NÃO encontrada" -ForegroundColor Yellow
    }
    
    if ($hasSupabaseKey) {
        Write-Host "   ✅ NEXT_PUBLIC_SUPABASE_ANON_KEY configurada" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️ NEXT_PUBLIC_SUPABASE_ANON_KEY NÃO encontrada" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ⚠️ Arquivo .env.local NÃO encontrado" -ForegroundColor Yellow
    Write-Host "   💡 Crie o arquivo .env.local com as variáveis do Supabase" -ForegroundColor Gray
}

Write-Host ""

# 4. Verificar processos Node
Write-Host "4️⃣ Verificando processos Node..." -ForegroundColor Yellow
$nodeProcesses = Get-Process -Name node -ErrorAction SilentlyContinue
if ($nodeProcesses) {
    Write-Host "   ✅ $($nodeProcesses.Count) processo(s) Node encontrado(s)" -ForegroundColor Green
} else {
    Write-Host "   ⚠️ Nenhum processo Node encontrado" -ForegroundColor Yellow
    Write-Host "   💡 Execute: npm run dev" -ForegroundColor Gray
}

Write-Host ""

# 5. Verificar porta 3000
Write-Host "5️⃣ Verificando porta 3000..." -ForegroundColor Yellow
$port3000 = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
if ($port3000) {
    Write-Host "   ✅ Porta 3000 está em uso (servidor provavelmente rodando)" -ForegroundColor Green
} else {
    Write-Host "   ⚠️ Porta 3000 não está em uso" -ForegroundColor Yellow
    Write-Host "   💡 Execute: npm run dev" -ForegroundColor Gray
}

Write-Host ""

# 6. Resumo e recomendações
Write-Host "📋 RESUMO E RECOMENDAÇÕES:`n" -ForegroundColor Cyan

if ($apiResponse.source -eq 'supabase' -and $valoresZerados -eq 0) {
    Write-Host "✅ TUDO FUNCIONANDO CORRETAMENTE!" -ForegroundColor Green
    Write-Host "   - API está buscando do Supabase" -ForegroundColor White
    Write-Host "   - Valores estão sendo encontrados" -ForegroundColor White
    Write-Host "   - Nenhum problema detectado`n" -ForegroundColor White
} elseif ($valoresZerados -gt 0) {
    Write-Host "⚠️ PROBLEMA DETECTADO: Alguns valores estão zerados" -ForegroundColor Yellow
    Write-Host "   - Verifique os logs do servidor para ver quais sistemas não têm valor" -ForegroundColor White
    Write-Host "   - Procure por: '⚠️ Sistema sem valor encontrado:' nos logs`n" -ForegroundColor White
} elseif ($apiResponse.source -ne 'supabase') {
    Write-Host "⚠️ PROBLEMA: Dados não estão vindo do Supabase" -ForegroundColor Yellow
    Write-Host "   - Source atual: $($apiResponse.source)" -ForegroundColor White
    Write-Host "   - Verifique variáveis de ambiente`n" -ForegroundColor White
}

Write-Host "💡 PRÓXIMOS PASSOS:" -ForegroundColor Cyan
Write-Host "   1. Abra: http://localhost:3000/admin/orcamentos" -ForegroundColor White
Write-Host "   2. Abra DevTools (F12) → Console" -ForegroundColor White
Write-Host "   3. Verifique se há erros no console" -ForegroundColor White
Write-Host "   4. Verifique os logs do servidor (terminal onde rodou npm run dev)`n" -ForegroundColor White

