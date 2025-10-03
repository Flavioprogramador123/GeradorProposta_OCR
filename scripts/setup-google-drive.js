/**
 * Script de Setup Google Drive API para PIENG
 * Gera o Refresh Token automaticamente
 */

require('dotenv').config();
const { google } = require('googleapis');
const http = require('http');
const url = require('url');
const open = require('open');
const readline = require('readline');

// ====================================
// CONFIGURAÇÃO
// ====================================
const SCOPES = ['https://www.googleapis.com/auth/drive.file'];
const REDIRECT_URI = 'http://localhost:3000/oauth2callback';

// ====================================
// PASSO 1: Cole suas credenciais aqui
// ====================================
const CLIENT_ID = process.env.GOOGLE_DRIVE_CLIENT_ID || 'SEU_CLIENT_ID_AQUI';
const CLIENT_SECRET = process.env.GOOGLE_DRIVE_CLIENT_SECRET || 'SEU_CLIENT_SECRET_AQUI';

console.log(`
╔══════════════════════════════════════════════════════════════╗
║  🚀 PIENG - Setup Google Drive API                          ║
╚══════════════════════════════════════════════════════════════╝

📋 Este script vai:
   1. Abrir o navegador para você autorizar o app
   2. Gerar automaticamente o Refresh Token
   3. Salvar as configurações no arquivo .env

⚙️  Requisitos:
   ✓ Client ID configurado
   ✓ Client Secret configurado
   ✓ Google Drive API habilitada no Console
`);

// ====================================
// Verificar se credenciais foram configuradas
// ====================================
if (CLIENT_ID === 'SEU_CLIENT_ID_AQUI' || CLIENT_SECRET === 'SEU_CLIENT_SECRET_AQUI') {
  console.log(`
❌ ERRO: Credenciais não configuradas!

Por favor, siga estes passos:

1. Acesse: https://console.cloud.google.com/
2. Crie um projeto novo ou selecione existente
3. Habilite "Google Drive API"
4. Crie credenciais OAuth 2.0
5. Configure este script com suas credenciais:

   Opção A) Definir variáveis de ambiente:
   export GOOGLE_DRIVE_CLIENT_ID="seu_client_id"
   export GOOGLE_DRIVE_CLIENT_SECRET="seu_client_secret"

   Opção B) Editar este arquivo diretamente:
   Linha 17-18: Cole seu CLIENT_ID e CLIENT_SECRET

Depois execute novamente: node scripts/setup-google-drive.js
`);
  process.exit(1);
}

// ====================================
// Configurar OAuth2 Client
// ====================================
const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

// ====================================
// FUNÇÃO: Gerar URL de Autorização
// ====================================
function getAuthUrl() {
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent' // Força mostrar tela de consentimento
  });
}

// ====================================
// FUNÇÃO: Obter Tokens
// ====================================
async function getTokens(code) {
  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);
  return tokens;
}

// ====================================
// FUNÇÃO: Testar Conexão
// ====================================
async function testConnection() {
  const drive = google.drive({ version: 'v3', auth: oauth2Client });

  try {
    const res = await drive.about.get({ fields: 'user, storageQuota' });
    return {
      success: true,
      user: res.data.user,
      storage: res.data.storageQuota
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// ====================================
// FUNÇÃO: Criar Pasta PIENG
// ====================================
async function createPiengFolder() {
  const drive = google.drive({ version: 'v3', auth: oauth2Client });

  try {
    // Verificar se já existe
    const searchRes = await drive.files.list({
      q: "name='PIENG Propostas Solares' and mimeType='application/vnd.google-apps.folder' and trashed=false",
      fields: 'files(id, name)',
      spaces: 'drive'
    });

    if (searchRes.data.files.length > 0) {
      console.log(`\n✅ Pasta já existe: ${searchRes.data.files[0].name}`);
      return searchRes.data.files[0].id;
    }

    // Criar nova pasta
    const folderMetadata = {
      name: 'PIENG Propostas Solares',
      mimeType: 'application/vnd.google-apps.folder'
    };

    const folder = await drive.files.create({
      requestBody: folderMetadata,
      fields: 'id, name, webViewLink'
    });

    console.log(`\n✅ Pasta criada: ${folder.data.name}`);
    console.log(`🔗 Link: ${folder.data.webViewLink}`);

    return folder.data.id;
  } catch (error) {
    console.error(`❌ Erro ao criar pasta: ${error.message}`);
    return null;
  }
}

// ====================================
// FUNÇÃO: Salvar no .env
// ====================================
function saveToEnv(tokens, folderId) {
  const fs = require('fs');
  const path = require('path');
  const envPath = path.join(__dirname, '..', '.env');

  let envContent = '';

  // Ler .env existente se houver
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  }

  // Remover linhas antigas do Google Drive se existirem
  const lines = envContent.split('\n').filter(line =>
    !line.startsWith('GOOGLE_DRIVE_CLIENT_ID=') &&
    !line.startsWith('GOOGLE_DRIVE_CLIENT_SECRET=') &&
    !line.startsWith('GOOGLE_DRIVE_REFRESH_TOKEN=') &&
    !line.startsWith('GOOGLE_DRIVE_FOLDER_ID=')
  );

  // Adicionar novas configurações
  const newConfig = `
# Google Drive API - Configurado em ${new Date().toLocaleString('pt-BR')}
GOOGLE_DRIVE_CLIENT_ID=${CLIENT_ID}
GOOGLE_DRIVE_CLIENT_SECRET=${CLIENT_SECRET}
GOOGLE_DRIVE_REFRESH_TOKEN=${tokens.refresh_token}
GOOGLE_DRIVE_FOLDER_ID=${folderId}
`;

  envContent = lines.join('\n') + newConfig;

  fs.writeFileSync(envPath, envContent);
  console.log(`\n✅ Configurações salvas em .env`);
}

// ====================================
// MAIN: Servidor HTTP temporário
// ====================================
async function main() {
  const authUrl = getAuthUrl();

  console.log(`\n🌐 Abrindo navegador para autorização...`);
  console.log(`\nSe não abrir automaticamente, acesse:`);
  console.log(`\n${authUrl}\n`);

  // Abrir navegador
  try {
    await open(authUrl);
  } catch (error) {
    console.log(`⚠️  Não foi possível abrir automaticamente. Copie a URL acima.`);
  }

  // Criar servidor HTTP temporário para receber callback
  const server = http.createServer(async (req, res) => {
    if (req.url.indexOf('/oauth2callback') > -1) {
      const qs = new url.URL(req.url, 'http://localhost:3000').searchParams;
      const code = qs.get('code');

      res.end(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>PIENG - Autorização</title>
          <style>
            body { font-family: Arial; text-align: center; padding: 50px; }
            .success { color: #2ecc71; font-size: 24px; }
          </style>
        </head>
        <body>
          <div class="success">✅ Autorização concluída!</div>
          <p>Você pode fechar esta janela e voltar ao terminal.</p>
        </body>
        </html>
      `);

      server.close();

      try {
        console.log(`\n⏳ Obtendo tokens...`);
        const tokens = await getTokens(code);

        if (!tokens.refresh_token) {
          console.log(`\n⚠️  Refresh token não recebido. Tente novamente com uma conta diferente.`);
          process.exit(1);
        }

        console.log(`✅ Refresh Token obtido!`);

        console.log(`\n⏳ Testando conexão...`);
        const test = await testConnection();

        if (test.success) {
          console.log(`\n✅ Conexão estabelecida!`);
          console.log(`👤 Usuário: ${test.user.displayName} (${test.user.emailAddress})`);

          if (test.storage) {
            const usedGB = (parseInt(test.storage.usage) / 1024 / 1024 / 1024).toFixed(2);
            const limitGB = (parseInt(test.storage.limit) / 1024 / 1024 / 1024).toFixed(2);
            console.log(`💾 Armazenamento: ${usedGB}GB / ${limitGB}GB`);
          }

          console.log(`\n⏳ Criando pasta para propostas...`);
          const folderId = await createPiengFolder();

          if (folderId) {
            saveToEnv(tokens, folderId);

            console.log(`
╔══════════════════════════════════════════════════════════════╗
║  🎉 CONFIGURAÇÃO CONCLUÍDA COM SUCESSO!                     ║
╚══════════════════════════════════════════════════════════════╝

✅ Google Drive API configurado
✅ Pasta "PIENG Propostas Solares" criada
✅ Credenciais salvas em .env

🚀 Próximos passos:
   1. Reinicie o servidor Next.js: npm run dev
   2. Teste o upload de propostas
   3. As propostas serão salvas automaticamente no Drive

📁 Suas propostas estarão em:
   Google Drive > PIENG Propostas Solares

            `);
          }
        } else {
          console.error(`\n❌ Erro ao testar conexão: ${test.error}`);
        }

      } catch (error) {
        console.error(`\n❌ Erro: ${error.message}`);
      }

      process.exit(0);
    }
  });

  server.listen(3000, () => {
    console.log(`🚀 Servidor temporário rodando em http://localhost:3000`);
    console.log(`⏳ Aguardando autorização no navegador...`);
  });
}

// ====================================
// Executar
// ====================================
main().catch(console.error);
