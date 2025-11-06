/**
 * Script para gerar ícones PWA a partir do SVG
 *
 * OPÇÕES DE CONVERSÃO:
 *
 * 1. ONLINE (Mais fácil):
 *    - Acesse: https://svgtopng.com/ ou https://cloudconvert.com/svg-to-png
 *    - Upload: public/icon.svg
 *    - Gere: icon-192x192.png e icon-512x512.png
 *    - Salve em: public/
 *
 * 2. INKSCAPE (Desktop):
 *    inkscape public/icon.svg --export-filename=public/icon-192x192.png --export-width=192 --export-height=192
 *    inkscape public/icon.svg --export-filename=public/icon-512x512.png --export-width=512 --export-height=512
 *
 * 3. IMAGEMAGICK:
 *    convert -background none -resize 192x192 public/icon.svg public/icon-192x192.png
 *    convert -background none -resize 512x512 public/icon.svg public/icon-512x512.png
 *
 * 4. PHOTOSHOP/FIGMA:
 *    - Abra icon.svg
 *    - Exporte como PNG nas dimensões 192x192 e 512x512
 */

const fs = require('fs');
const path = require('path');

console.log('📱 Gerador de Ícones PWA - PIENG Propostas\n');

const iconPath = path.join(__dirname, '../public/icon.svg');
const exists = fs.existsSync(iconPath);

if (exists) {
  console.log('✅ Ícone SVG encontrado:', iconPath);
  console.log('\n📋 Para gerar os PNGs, escolha uma opção acima no código deste arquivo.');
  console.log('\n🎯 Arquivos necessários:');
  console.log('   - public/icon-192x192.png (192x192 pixels)');
  console.log('   - public/icon-512x512.png (512x512 pixels)');
  console.log('\n💡 Dica: Use https://svgtopng.com/ para conversão rápida online!');
} else {
  console.log('❌ Erro: icon.svg não encontrado em public/');
}

// Verificar se os ícones já existem
const icon192 = path.join(__dirname, '../public/icon-192x192.png');
const icon512 = path.join(__dirname, '../public/icon-512x512.png');

console.log('\n📊 Status dos ícones:');
console.log('   icon-192x192.png:', fs.existsSync(icon192) ? '✅ Existe' : '❌ Faltando');
console.log('   icon-512x512.png:', fs.existsSync(icon512) ? '✅ Existe' : '❌ Faltando');

if (fs.existsSync(icon192) && fs.existsSync(icon512)) {
  console.log('\n🎉 Todos os ícones estão prontos!');
} else {
  console.log('\n⚠️  Gere os ícones PNG antes de testar o PWA.');
}
