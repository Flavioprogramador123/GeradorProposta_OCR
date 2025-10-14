# 🌐 CONFIGURAÇÃO AUTOMÁTICA NETLIFY
# Script para configurar deploy automático no Netlify

Write-Host ""
Write-Host "🌐 CONFIGURANDO DEPLOY AUTOMÁTICO NETLIFY" -ForegroundColor Blue
Write-Host "=========================================" -ForegroundColor Blue
Write-Host ""

# 1. INSTALAR NETLIFY CLI
Write-Host "📦 Instalando Netlify CLI..." -ForegroundColor Yellow
npm install -g netlify-cli

# 2. CRIAR NETLIFY.TOML PARA PASTA PASTANETILIFY
Write-Host "📝 Criando netlify.toml para pastanetilify..." -ForegroundColor Yellow

$netlifyConfig = @"
[build]
  publish = "pastanetilify"
  command = "node scripts/generate-netlify-index.js"

[build.environment]
  NODE_VERSION = "18"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[[headers]]
  for = "/*.html"
  [headers.values]
    Cache-Control = "public, max-age=3600"

[[headers]]
  for = "/assets/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000"
"@

$netlifyConfig | Out-File -FilePath "netlify.toml" -Encoding UTF8

# 3. CRIAR SCRIPT DE BUILD
Write-Host "🔧 Criando script de build..." -ForegroundColor Yellow

$buildScript = @"
#!/bin/bash
# Script de build para Netlify

echo "🚀 Iniciando build automático..."

# Copiar script para pasta correta
cp scripts/generate-netlify-index.js .

# Executar geração do index
node generate-netlify-index.js

echo "✅ Build concluído!"
"@

$buildScript | Out-File -FilePath "build.sh" -Encoding UTF8

# 4. CRIAR PACKAGE.JSON PARA PASTANETILIFY
Write-Host "📦 Criando package.json..." -ForegroundColor Yellow

$packageJson = @"
{
  "name": "pieng-propostas-netlify",
  "version": "1.0.0",
  "description": "Sistema de propostas solares PIENG",
  "scripts": {
    "build": "node scripts/generate-netlify-index.js",
    "deploy": "netlify deploy --prod",
    "dev": "netlify dev"
  },
  "dependencies": {
    "netlify-cli": "^15.0.0"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
"@

$packageJson | Out-File -FilePath "package.json" -Encoding UTF8

# 5. INSTRUÇÕES DE CONFIGURAÇÃO
Write-Host ""
Write-Host "✅ CONFIGURAÇÃO CONCLUÍDA!" -ForegroundColor Green
Write-Host "=========================" -ForegroundColor Green
Write-Host ""
Write-Host "📋 PRÓXIMOS PASSOS:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. 🌐 CONECTAR AO NETLIFY:" -ForegroundColor Cyan
Write-Host "   - Acesse: https://app.netlify.com" -ForegroundColor Gray
Write-Host "   - Clique em 'New site from Git'" -ForegroundColor Gray
Write-Host "   - Conecte seu repositório GitHub" -ForegroundColor Gray
Write-Host ""
Write-Host "2. ⚙️ CONFIGURAR BUILD:" -ForegroundColor Cyan
Write-Host "   - Build command: node scripts/generate-netlify-index.js" -ForegroundColor Gray
Write-Host "   - Publish directory: pastanetilify" -ForegroundColor Gray
Write-Host "   - Node version: 18" -ForegroundColor Gray
Write-Host ""
Write-Host "3. 🔗 CONFIGURAR DOMÍNIO:" -ForegroundColor Cyan
Write-Host "   - Site name: pieng-propostas-solares" -ForegroundColor Gray
Write-Host "   - URL: https://pieng-propostas-solares.netlify.app" -ForegroundColor Gray
Write-Host ""
Write-Host "4. 🚀 TESTAR DEPLOY:" -ForegroundColor Cyan
Write-Host "   - Execute: .\scripts\deploy-netlify-automatico.ps1" -ForegroundColor Gray
Write-Host "   - Aguarde alguns minutos" -ForegroundColor Gray
Write-Host "   - Acesse: https://pieng-propostas-solares.netlify.app" -ForegroundColor Gray
Write-Host ""

# 6. CRIAR ARQUIVO DE CONFIGURAÇÃO GITHUB ACTIONS (OPCIONAL)
Write-Host "🔧 Criando GitHub Actions para deploy automático..." -ForegroundColor Yellow

$githubWorkflow = @"
name: Deploy to Netlify

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        
    - name: Generate index.html
      run: node scripts/generate-netlify-index.js
      
    - name: Deploy to Netlify
      uses: nwtgck/actions-netlify@v2.0
      with:
        publish-dir: './pastanetilify'
        production-branch: main
        github-token: \${{ secrets.GITHUB_TOKEN }}
        deploy-message: "Deploy automático: \${{ github.event.head_commit.message }}"
      env:
        NETLIFY_AUTH_TOKEN: \${{ secrets.NETLIFY_AUTH_TOKEN }}
        NETLIFY_SITE_ID: \${{ secrets.NETLIFY_SITE_ID }}
"@

$workflowDir = ".github\workflows"
if (-not (Test-Path $workflowDir)) {
    New-Item -ItemType Directory -Path $workflowDir -Force
}

$githubWorkflow | Out-File -FilePath "$workflowDir\deploy-netlify.yml" -Encoding UTF8

Write-Host "✅ GitHub Actions configurado!" -ForegroundColor Green
Write-Host ""
Write-Host "🎯 CONFIGURAÇÃO COMPLETA!" -ForegroundColor Green
Write-Host "Agora você pode fazer deploy automático das propostas!" -ForegroundColor White
