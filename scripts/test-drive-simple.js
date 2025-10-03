require('dotenv').config();
const { google } = require('googleapis');

async function testDrive() {
  console.log('\n🧪 Teste Simples Google Drive API\n');

  try {
    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_DRIVE_CLIENT_ID,
      process.env.GOOGLE_DRIVE_CLIENT_SECRET,
      process.env.GOOGLE_DRIVE_REDIRECT_URI
    );

    // Tentar obter refresh token do .env
    const refreshToken = process.env.GOOGLE_DRIVE_REFRESH_TOKEN;

    if (!refreshToken) {
      console.log('❌ Refresh Token não encontrado no .env');
      console.log('⚠️  Execute: node scripts/setup-google-drive.js');
      return;
    }

    auth.setCredentials({
      refresh_token: refreshToken
    });

    const drive = google.drive({ version: 'v3', auth });

    console.log('⏳ Listando arquivos do Drive...\n');

    const response = await drive.files.list({
      pageSize: 10,
      fields: 'files(id, name, mimeType, createdTime)'
    });

    const files = response.data.files;

    if (!files || files.length === 0) {
      console.log('✅ Conexão OK! (Nenhum arquivo encontrado)');
    } else {
      console.log(`✅ Conexão OK! Encontrados ${files.length} arquivos:\n`);
      files.forEach(file => {
        console.log(`  📄 ${file.name} (${file.mimeType})`);
      });
    }

    console.log('\n🎉 Google Drive API funcionando perfeitamente!\n');

  } catch (error) {
    console.error('\n❌ Erro ao testar Drive API:');
    console.error(`   ${error.message}\n`);

    if (error.message.includes('API has not been used')) {
      console.log('💡 Solução: Habilitar Google Drive API');
      console.log('   https://console.developers.google.com/apis/api/drive.googleapis.com/overview?project=860734769459\n');
    } else if (error.message.includes('invalid_grant')) {
      console.log('💡 Solução: Refresh Token inválido. Execute novamente:');
      console.log('   node scripts/setup-google-drive.js\n');
    }
  }
}

testDrive();
