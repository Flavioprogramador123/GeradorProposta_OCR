@echo off
title PIENG Propostas - Servidor Local
color 0A

echo.
echo ========================================================
echo    PIENG PROPOSTAS - SERVIDOR LOCAL v1.0.0
echo    Gerador de Propostas Solares
echo ========================================================
echo.

REM Verificar se Node.js esta instalado
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERRO] Node.js nao encontrado!
    echo.
    echo Por favor, instale Node.js: https://nodejs.org
    echo.
    pause
    exit /b 1
)

REM Ir para o diretorio do script
cd /d "%~dp0"

REM Verificar se node_modules existe
if not exist "node_modules" (
    echo [INFO] Instalando dependencias pela primeira vez...
    echo.
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo.
        echo [ERRO] Falha ao instalar dependencias!
        pause
        exit /b 1
    )
)

REM Verificar se .next existe (build)
if not exist ".next" (
    echo [INFO] Compilando aplicacao pela primeira vez...
    echo.
    call npm run build
    if %ERRORLEVEL% NEQ 0 (
        echo.
        echo [ERRO] Falha ao compilar aplicacao!
        pause
        exit /b 1
    )
)

echo.
echo [OK] Iniciando servidor...
echo.
echo ========================================================
echo    SERVIDOR RODANDO:
echo    http://localhost:3000
echo.
echo    Acesse: http://localhost:3000/gerador-rapido
echo.
echo    Pressione Ctrl+C para encerrar
echo ========================================================
echo.

REM Abrir navegador automaticamente
timeout /t 3 >nul
start http://localhost:3000/gerador-rapido

REM Iniciar servidor
call npm start

pause
