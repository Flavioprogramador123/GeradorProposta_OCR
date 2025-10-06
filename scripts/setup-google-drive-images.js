#!/usr/bin/env node

/**
 * 🔧 SCRIPT: Configurar Google Drive para Imagens PIENG
 * 
 * Este script configura o acesso ao Google Drive para:
 * 1. Listar imagens de serviços disponíveis
 * 2. Baixar logos e fotos para o projeto
 * 3. Organizar estrutura de imagens
 */

const { google } = require('googleapis');
const fs = require('fs').promises;
const path = require('path');

// Configuração OAuth 2.0
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_DRIVE_CLIENT_ID,
  process.env.GOOGLE_DRIVE_CLIENT_SECRET,
  'http://localhost:3000/oauth2callback'
);

// ====================================
// FUNÇÃO: Autenticar Google Drive
// ====================================
async function authenticate() {
  try {
    // Verificar se já temos tokens salvos
    const tokenPath = path.join(__dirname, '..', '.env');
    const envContent = await fs.readFile(tokenPath, 'utf8');
    
    if (envContent.includes('GOOGLE_DRIVE_REFRESH_TOKEN')) {
      const refreshToken = envContent.match(/GOOGLE_DRIVE_REFRESH_TOKEN=(.+)/)?.[1];
      if (refreshToken) {
        oauth2Client.setCredentials({
          refresh_token: refreshToken
        });
        console.log('✅ Usando token salvo');
        return true;
      }
    }

    // Gerar URL de autorização
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/drive.readonly'],
      prompt: 'consent'
    });

    console.log('\n🔐 AUTENTICAÇÃO GOOGLE DRIVE');
    console.log('============================');
    console.log('1. Acesse esta URL no navegador:');
    console.log(authUrl);
    console.log('\n2. Autorize o acesso');
    console.log('3. Copie o código de autorização');
    
    // Simular entrada do código (em produção, usar readline)
    console.log('\n⚠️  Para continuar, configure manualmente:');
    console.log('GOOGLE_DRIVE_CLIENT_ID=seu_client_id');
    console.log('GOOGLE_DRIVE_CLIENT_SECRET=seu_client_secret');
    console.log('GOOGLE_DRIVE_REFRESH_TOKEN=seu_refresh_token');
    
    return false;
  } catch (error) {
    console.error('❌ Erro na autenticação:', error.message);
    return false;
  }
}

// ====================================
// FUNÇÃO: Listar Imagens no Drive
// ====================================
async function listImages() {
  const drive = google.drive({ version: 'v3', auth: oauth2Client });

  try {
    console.log('\n📸 BUSCANDO IMAGENS NO GOOGLE DRIVE...');
    
    // Buscar pastas PIENG
    const folders = await drive.files.list({
      q: "name contains 'PIENG' and mimeType='application/vnd.google-apps.folder' and trashed=false",
      fields: 'files(id, name, webViewLink)',
      spaces: 'drive'
    });

    if (folders.data.files.length === 0) {
      console.log('❌ Nenhuma pasta PIENG encontrada no Google Drive');
      return [];
    }

    console.log(`✅ Encontradas ${folders.data.files.length} pastas PIENG:`);
    folders.data.files.forEach(folder => {
      console.log(`   📁 ${folder.name} - ${folder.webViewLink}`);
    });

    // Buscar imagens em todas as pastas PIENG
    const allImages = [];
    
    for (const folder of folders.data.files) {
      console.log(`\n🔍 Buscando imagens em: ${folder.name}`);
      
      const images = await drive.files.list({
        q: `'${folder.id}' in parents and (mimeType contains 'image/' or name contains '.jpg' or name contains '.png' or name contains '.jpeg') and trashed=false`,
        fields: 'files(id, name, mimeType, size, webViewLink, webContentLink)',
        spaces: 'drive'
      });

      if (images.data.files.length > 0) {
        console.log(`   ✅ ${images.data.files.length} imagens encontradas:`);
        images.data.files.forEach(img => {
          console.log(`      🖼️  ${img.name} (${Math.round(img.size/1024)}KB)`);
          allImages.push({
            ...img,
            folder: folder.name
          });
        });
      } else {
        console.log('   ❌ Nenhuma imagem encontrada');
      }
    }

    return allImages;
  } catch (error) {
    console.error('❌ Erro ao listar imagens:', error.message);
    return [];
  }
}

// ====================================
// FUNÇÃO: Baixar Imagens
// ====================================
async function downloadImages(images) {
  const drive = google.drive({ version: 'v3', auth: oauth2Client });
  
  // Criar estrutura de diretórios
  const imagesDir = path.join(__dirname, '..', 'public', 'assets', 'images');
  const logosDir = path.join(__dirname, '..', 'public', 'assets', 'logos');
  
  await fs.mkdir(imagesDir, { recursive: true });
  await fs.mkdir(logosDir, { recursive: true });

  console.log('\n📥 BAIXANDO IMAGENS...');
  
  for (const img of images) {
    try {
      // Determinar se é logo ou imagem de serviço
      const isLogo = img.name.toLowerCase().includes('logo') || 
                     img.name.toLowerCase().includes('marca') ||
                     img.name.toLowerCase().includes('brand');
      
      const targetDir = isLogo ? logosDir : imagesDir;
      const filePath = path.join(targetDir, img.name);
      
      // Verificar se já existe
      try {
        await fs.access(filePath);
        console.log(`   ⏭️  ${img.name} já existe, pulando...`);
        continue;
      } catch {
        // Arquivo não existe, continuar
      }

      // Baixar arquivo
      const response = await drive.files.get({
        fileId: img.id,
        alt: 'media'
      }, { responseType: 'stream' });

      const writeStream = require('fs').createWriteStream(filePath);
      response.data.pipe(writeStream);

      await new Promise((resolve, reject) => {
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
      });

      console.log(`   ✅ ${img.name} baixado para ${isLogo ? 'logos' : 'images'}`);
      
    } catch (error) {
      console.error(`   ❌ Erro ao baixar ${img.name}:`, error.message);
    }
  }
}

// ====================================
// FUNÇÃO: Gerar Relatório
// ====================================
async function generateReport(images) {
  const report = {
    totalImages: images.length,
    logos: images.filter(img => 
      img.name.toLowerCase().includes('logo') || 
      img.name.toLowerCase().includes('marca')
    ).length,
    serviceImages: images.filter(img => 
      !img.name.toLowerCase().includes('logo') && 
      !img.name.toLowerCase().includes('marca')
    ).length,
    folders: [...new Set(images.map(img => img.folder))],
    images: images.map(img => ({
      name: img.name,
      size: Math.round(img.size/1024),
      type: img.mimeType,
      folder: img.folder,
      isLogo: img.name.toLowerCase().includes('logo') || 
              img.name.toLowerCase().includes('marca')
    }))
  };

  console.log('\n📊 RELATÓRIO DE IMAGENS');
  console.log('=======================');
  console.log(`📸 Total de imagens: ${report.totalImages}`);
  console.log(`🏷️  Logos: ${report.logos}`);
  console.log(`🖼️  Imagens de serviços: ${report.serviceImages}`);
  console.log(`📁 Pastas encontradas: ${report.folders.join(', ')}`);
  
  // Salvar relatório
  await fs.writeFile(
    path.join(__dirname, '..', 'docs', 'google-drive-images-report.json'),
    JSON.stringify(report, null, 2)
  );
  
  console.log('\n💾 Relatório salvo em: docs/google-drive-images-report.json');
  
  return report;
}

// ====================================
// EXECUÇÃO PRINCIPAL
// ====================================
async function main() {
  console.log('🔧 CONFIGURAÇÃO GOOGLE DRIVE - IMAGENS PIENG');
  console.log('============================================');
  
  // Verificar variáveis de ambiente
  if (!process.env.GOOGLE_DRIVE_CLIENT_ID || !process.env.GOOGLE_DRIVE_CLIENT_SECRET) {
    console.log('\n❌ Variáveis de ambiente não configuradas!');
    console.log('Configure no arquivo .env:');
    console.log('GOOGLE_DRIVE_CLIENT_ID=seu_client_id');
    console.log('GOOGLE_DRIVE_CLIENT_SECRET=seu_client_secret');
    console.log('GOOGLE_DRIVE_REFRESH_TOKEN=seu_refresh_token');
    return;
  }

  // Autenticar
  const authSuccess = await authenticate();
  if (!authSuccess) {
    console.log('\n⚠️  Configure as credenciais e execute novamente');
    return;
  }

  // Listar imagens
  const images = await listImages();
  if (images.length === 0) {
    console.log('\n❌ Nenhuma imagem encontrada no Google Drive');
    return;
  }

  // Baixar imagens
  await downloadImages(images);

  // Gerar relatório
  await generateReport(images);

  console.log('\n✅ CONFIGURAÇÃO CONCLUÍDA!');
  console.log('Agora você pode usar as imagens no projeto PIENG');
}

// Executar se chamado diretamente
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { authenticate, listImages, downloadImages, generateReport };
