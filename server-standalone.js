#!/usr/bin/env node

/**
 * PIENG Propostas - Servidor Standalone
 * Executável independente que roda o servidor Next.js
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('╔═══════════════════════════════════════════════════════╗');
console.log('║   PIENG PROPOSTAS - SERVIDOR LOCAL v1.0.0            ║');
console.log('║   Gerador de Propostas Solares                        ║');
console.log('╚═══════════════════════════════════════════════════════╝\n');

// Verificar se .next existe (build foi feito)
const nextDir = path.join(__dirname, '.next');
if (!fs.existsSync(nextDir)) {
  console.log('⚠️  Build do Next.js não encontrado!');
  console.log('📦 Executando build...\n');

  const build = spawn('npm', ['run', 'build'], {
    stdio: 'inherit',
    shell: true,
    cwd: __dirname
  });

  build.on('close', (code) => {
    if (code !== 0) {
      console.error('❌ Erro ao fazer build!');
      process.exit(1);
    }
    startServer();
  });
} else {
  startServer();
}

function startServer() {
  console.log('🚀 Iniciando servidor...\n');

  const server = spawn('npm', ['run', 'start'], {
    stdio: 'inherit',
    shell: true,
    cwd: __dirname
  });

  server.on('error', (err) => {
    console.error('❌ Erro ao iniciar servidor:', err);
    process.exit(1);
  });

  server.on('close', (code) => {
    console.log(`\n🛑 Servidor encerrado com código ${code}`);
    process.exit(code);
  });

  // Capturar Ctrl+C
  process.on('SIGINT', () => {
    console.log('\n\n🛑 Encerrando servidor...');
    server.kill('SIGINT');
  });
}
