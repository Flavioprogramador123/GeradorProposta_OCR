require('dotenv').config();
const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');

async function testUpload() {
  console.log('\n🧪 Teste de Upload de Proposta HTML no Google Drive\n');

  try {
    // Configurar OAuth
    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_DRIVE_CLIENT_ID,
      process.env.GOOGLE_DRIVE_CLIENT_SECRET,
      process.env.GOOGLE_DRIVE_REDIRECT_URI
    );

    auth.setCredentials({
      refresh_token: process.env.GOOGLE_DRIVE_REFRESH_TOKEN
    });

    const drive = google.drive({ version: 'v3', auth });

    // Criar HTML de teste
    const htmlContent = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Proposta Solar - Teste</title>
  <style>
    body { font-family: Arial; padding: 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
    .container { background: white; color: #333; padding: 30px; border-radius: 15px; max-width: 800px; margin: 0 auto; }
    h1 { color: #667eea; }
    .info { background: #f0f0f0; padding: 15px; border-radius: 8px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🌞 PIENG Soluções - Proposta Solar</h1>
    <div class="info">
      <h2>Cliente: Teste Upload Google Drive</h2>
      <p><strong>Data:</strong> ${new Date().toLocaleDateString('pt-BR')}</p>
      <p><strong>Sistema:</strong> 12 módulos de 580W = 6,96 kWp</p>
      <p><strong>Investimento:</strong> R$ 24.500,00</p>
      <p><strong>Payback:</strong> 3,5 anos</p>
    </div>
    <p>Esta é uma proposta de teste gerada automaticamente pelo sistema PIENG.</p>
    <p>✅ Upload realizado com sucesso no Google Drive!</p>
  </div>
</body>
</html>
    `.trim();

    const fileName = `proposta_teste_${Date.now()}.html`;
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

    console.log('📤 Fazendo upload da proposta...\n');

    // Upload do arquivo
    const response = await drive.files.create({
      requestBody: {
        name: fileName,
        mimeType: 'text/html',
        parents: [folderId]
      },
      media: {
        mimeType: 'text/html',
        body: htmlContent
      },
      fields: 'id, name, webViewLink, webContentLink'
    });

    console.log('✅ Upload concluído com sucesso!\n');
    console.log('📄 Detalhes do arquivo:');
    console.log(`   ID: ${response.data.id}`);
    console.log(`   Nome: ${response.data.name}`);
    console.log(`   Link para visualizar: ${response.data.webViewLink}`);
    console.log(`   Link para download: ${response.data.webContentLink}\n`);

    // Tornar o arquivo público (opcional)
    console.log('🔓 Tornando arquivo público...\n');

    await drive.permissions.create({
      fileId: response.data.id,
      requestBody: {
        role: 'reader',
        type: 'anyone'
      }
    });

    const publicLink = `https://drive.google.com/file/d/${response.data.id}/view?usp=sharing`;

    console.log('✅ Arquivo agora está público!\n');
    console.log('🔗 Link público compartilhável:');
    console.log(`   ${publicLink}\n`);

    console.log('🎉 Teste concluído com sucesso!');
    console.log('📁 Verifique a pasta "PIENG Propostas Solares" no seu Google Drive\n');

  } catch (error) {
    console.error('\n❌ Erro no teste de upload:');
    console.error(`   ${error.message}\n`);
  }
}

testUpload();
