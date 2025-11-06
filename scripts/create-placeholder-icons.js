/**
 * Cria ícones PNG placeholder para teste do PWA
 * Substitua depois por ícones profissionais convertidos do SVG
 */

const fs = require('fs');
const path = require('path');

// PNG 1x1 transparente válido em base64
const transparentPNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
);

// Criar ícones placeholder
const publicDir = path.join(__dirname, '../public');

// Ícone 192x192 (placeholder)
const icon192Path = path.join(publicDir, 'icon-192x192.png');
const icon512Path = path.join(publicDir, 'icon-512x512.png');

// Criar canvas simples com Node.js (sem dependências)
// Para produção, use conversão real do SVG

console.log('📱 Criando ícones placeholder para teste...\n');

try {
  // Copiar o placeholder para ambos os tamanhos
  // Em produção, esses devem ser gerados do icon.svg
  fs.writeFileSync(icon192Path, transparentPNG);
  fs.writeFileSync(icon512Path, transparentPNG);

  console.log('✅ Ícones placeholder criados:');
  console.log('   - icon-192x192.png');
  console.log('   - icon-512x512.png');
  console.log('\n⚠️  ATENÇÃO: Estes são placeholders 1x1 para teste.');
  console.log('   Para produção, converta icon.svg usando:');
  console.log('   - https://svgtopng.com/');
  console.log('   - Inkscape, ImageMagick ou Photoshop');
  console.log('\n✅ PWA pode ser testado agora com estes placeholders.');
} catch (error) {
  console.error('❌ Erro ao criar ícones:', error.message);
}
