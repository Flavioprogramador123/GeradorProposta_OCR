@echo off
echo ========================================
echo    SISTEMA DE ORÇAMENTOS - DEPLOY
echo ========================================
echo.

echo [1/3] Atualizando lista de orçamentos...
node orçamento\gerenciador-orçamentos.js

echo.
echo [2/3] Verificando estrutura...
dir orçamento\clientes

echo.
echo [3/3] Pronto para deploy no Netlify!
echo.
echo Para fazer o deploy:
echo 1. Acesse https://app.netlify.com
echo 2. Arraste a pasta 'novo-projeto' para a área de deploy
echo 3. Ou conecte com Git para deploy automático
echo.
pause

