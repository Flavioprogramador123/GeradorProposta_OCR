/**
 * Script de Teste - Google Drive API
 * Verifica se a configuração está correta
 */

require('dotenv').config();
const { isGoogleDriveConfigured, getStorageInfo, uploadPropostaHTML } = require('../src/lib/google-drive');

console.log(`
╔══════════════════════════════════════════════════════════════╗
║  🧪 PIENG - Teste Google Drive API                          ║
╚══════════════════════════════════════════════════════════════╝
`);

async function test() {
  // Teste 1: Verificar configuração
  console.log(`\n📋 Teste 1: Verificar Configuração`);
  console.log(`   ⏳ Verificando variáveis de ambiente...`);

  const configured = isGoogleDriveConfigured();

  if (!configured) {
    console.log(`\n❌ Google Drive não configurado!`);
    console.log(`\nExecute primeiro: node scripts/setup-google-drive.js\n`);
    process.exit(1);
  }

  console.log(`   ✅ Variáveis configuradas`);

  // Teste 2: Obter informações da conta
  console.log(`\n📋 Teste 2: Conexão com Google Drive`);
  console.log(`   ⏳ Obtendo informações da conta...`);

  try {
    const info = await getStorageInfo();

    if (info) {
      console.log(`   ✅ Conectado com sucesso!`);
      console.log(`\n   👤 Usuário: ${info.user.displayName}`);
      console.log(`   📧 Email: ${info.user.emailAddress}`);
      console.log(`   💾 Armazenamento: ${info.used}GB / ${info.limit}GB (${info.usedPercentage}% usado)`);
    } else {
      console.log(`   ❌ Erro ao obter informações`);
      process.exit(1);
    }
  } catch (error) {
    console.log(`   ❌ Erro na conexão: ${error.message}`);
    process.exit(1);
  }

  // Teste 3: Upload de teste
  console.log(`\n📋 Teste 3: Upload de Arquivo`);
  console.log(`   ⏳ Enviando arquivo de teste...`);

  const htmlTeste = `
<!DOCTYPE html>
<html>
<head>
  <title>Teste PIENG</title>
  <style>
    body { font-family: Arial; padding: 50px; text-align: center; }
    .success { color: #2ecc71; font-size: 24px; }
  </style>
</head>
<body>
  <div class="success">✅ Teste de Upload - PIENG</div>
  <p>Este arquivo foi gerado automaticamente em ${new Date().toLocaleString('pt-BR')}</p>
  <p>Se você está vendo isso, o sistema está funcionando corretamente!</p>
</body>
</html>
  `;

  try {
    const result = await uploadPropostaHTML(
      'teste-sistema',
      htmlTeste,
      `teste_${Date.now()}.html`
    );

    if (result.success) {
      console.log(`   ✅ Upload realizado com sucesso!`);
      console.log(`\n   🔗 Ver arquivo: ${result.webViewLink}`);
      console.log(`   📥 Download: ${result.webContentLink}`);
      console.log(`   🆔 ID: ${result.fileId}`);
    } else {
      console.log(`   ❌ Erro no upload: ${result.error}`);
      process.exit(1);
    }
  } catch (error) {
    console.log(`   ❌ Erro: ${error.message}`);
    process.exit(1);
  }

  // Sucesso total
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║  🎉 TODOS OS TESTES PASSARAM!                               ║
╚══════════════════════════════════════════════════════════════╝

✅ Configuração correta
✅ Conexão estabelecida
✅ Upload funcionando

🚀 Sistema pronto para uso!

📁 Acesse seu Google Drive para ver o arquivo de teste:
   Google Drive > PIENG Propostas Solares > teste-sistema/

💡 Próximos passos:
   1. Gere uma proposta no sistema
   2. Ela será salva automaticamente no Drive
   3. Você receberá o link de compartilhamento
  `);
}

test().catch(error => {
  console.error(`\n❌ Erro fatal: ${error.message}`);
  console.error(error.stack);
  process.exit(1);
});
