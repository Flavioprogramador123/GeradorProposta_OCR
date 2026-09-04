/**
 * CLI: importa preços dos dumps temp/ → SQLite
 * node scripts/v3-atualizar-precos.js
 */
const path = require('path');
const fs = require('fs');

process.chdir(path.join(__dirname, '..'));

async function viaHttp() {
  const res = await fetch('http://localhost:3000/api/v3/captura-precos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fonte: 'temp' }),
  });
  const text = await res.text();
  console.log(text);
  if (!res.ok) process.exit(1);
}

async function viaDirect() {
  // Minimal inline: require compiled? Use dynamic import of ts via http preferred.
  // Fallback: spawn node with next doesn't work. Call HTTP only.
  throw new Error('use HTTP');
}

viaHttp().catch(async (e) => {
  console.error('HTTP falhou:', e.message);
  console.error('Suba npm run dev e rode de novo, ou abra /admin/v3/precos');
  process.exit(1);
});
