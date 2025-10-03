/**
 * Google Drive Integration - PIENG
 * Upload automático de propostas para Google Workspace
 */

import { google } from 'googleapis';

// ====================================
// CONFIGURAÇÃO
// ====================================
const CLIENT_ID = process.env.GOOGLE_DRIVE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.GOOGLE_DRIVE_REFRESH_TOKEN;
const FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;

// ====================================
// VERIFICAR SE ESTÁ CONFIGURADO
// ====================================
export function isGoogleDriveConfigured(): boolean {
  return !!(CLIENT_ID && CLIENT_SECRET && REFRESH_TOKEN && FOLDER_ID);
}

// ====================================
// CRIAR CLIENTE AUTENTICADO
// ====================================
function getAuthClient() {
  if (!isGoogleDriveConfigured()) {
    throw new Error('Google Drive não configurado. Execute: node scripts/setup-google-drive.js');
  }

  const oauth2Client = new google.auth.OAuth2(
    CLIENT_ID,
    CLIENT_SECRET,
    'http://localhost:3000/oauth2callback'
  );

  oauth2Client.setCredentials({
    refresh_token: REFRESH_TOKEN
  });

  return oauth2Client;
}

// ====================================
// INTERFACE DE RESULTADO
// ====================================
export interface DriveUploadResult {
  success: boolean;
  fileId?: string;
  webViewLink?: string;
  webContentLink?: string;
  error?: string;
}

// ====================================
// UPLOAD DE ARQUIVO HTML
// ====================================
export async function uploadPropostaHTML(
  clienteSlug: string,
  htmlContent: string,
  fileName?: string
): Promise<DriveUploadResult> {
  try {
    const auth = getAuthClient();
    const drive = google.drive({ version: 'v3', auth });

    // Nome do arquivo
    const finalFileName = fileName || `proposta_${clienteSlug}_${Date.now()}.html`;

    // Criar subpasta para o cliente (se não existir)
    const clienteFolderId = await getOrCreateClientFolder(drive, clienteSlug);

    // Metadata do arquivo
    const fileMetadata = {
      name: finalFileName,
      mimeType: 'text/html',
      parents: [clienteFolderId]
    };

    // Upload
    const file = await drive.files.create({
      requestBody: fileMetadata,
      media: {
        mimeType: 'text/html',
        body: htmlContent
      },
      fields: 'id, name, webViewLink, webContentLink'
    });

    console.log(`✅ Proposta salva no Google Drive: ${file.data.name}`);

    return {
      success: true,
      fileId: file.data.id!,
      webViewLink: file.data.webViewLink!,
      webContentLink: file.data.webContentLink!
    };

  } catch (error) {
    console.error('❌ Erro ao fazer upload para Google Drive:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    };
  }
}

// ====================================
// UPLOAD DE JSON (BACKUP)
// ====================================
export async function uploadPropostaJSON(
  clienteSlug: string,
  jsonData: any,
  fileName?: string
): Promise<DriveUploadResult> {
  try {
    const auth = getAuthClient();
    const drive = google.drive({ version: 'v3', auth });

    const finalFileName = fileName || `proposta_${clienteSlug}_${Date.now()}.json`;
    const clienteFolderId = await getOrCreateClientFolder(drive, clienteSlug);

    const fileMetadata = {
      name: finalFileName,
      mimeType: 'application/json',
      parents: [clienteFolderId]
    };

    const file = await drive.files.create({
      requestBody: fileMetadata,
      media: {
        mimeType: 'application/json',
        body: JSON.stringify(jsonData, null, 2)
      },
      fields: 'id, name, webViewLink'
    });

    console.log(`✅ JSON salvo no Google Drive: ${file.data.name}`);

    return {
      success: true,
      fileId: file.data.id!,
      webViewLink: file.data.webViewLink!
    };

  } catch (error) {
    console.error('❌ Erro ao fazer upload de JSON:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    };
  }
}

// ====================================
// CRIAR PASTA DO CLIENTE
// ====================================
async function getOrCreateClientFolder(drive: any, clienteSlug: string): Promise<string> {
  try {
    // Buscar se já existe
    const searchRes = await drive.files.list({
      q: `name='${clienteSlug}' and '${FOLDER_ID}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id, name)',
      spaces: 'drive'
    });

    if (searchRes.data.files.length > 0) {
      return searchRes.data.files[0].id;
    }

    // Criar nova pasta
    const folderMetadata = {
      name: clienteSlug,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [FOLDER_ID]
    };

    const folder = await drive.files.create({
      requestBody: folderMetadata,
      fields: 'id'
    });

    return folder.data.id;

  } catch (error) {
    console.error(`❌ Erro ao criar pasta do cliente: ${error}`);
    // Fallback: usar pasta raiz
    return FOLDER_ID!;
  }
}

// ====================================
// LISTAR PROPOSTAS DO CLIENTE
// ====================================
export async function listClientePropostas(clienteSlug: string): Promise<any[]> {
  try {
    const auth = getAuthClient();
    const drive = google.drive({ version: 'v3', auth });

    // Buscar pasta do cliente
    const clienteFolderId = await getOrCreateClientFolder(drive, clienteSlug);

    // Listar arquivos na pasta
    const res = await drive.files.list({
      q: `'${clienteFolderId}' in parents and trashed=false`,
      fields: 'files(id, name, mimeType, createdTime, modifiedTime, webViewLink, size)',
      orderBy: 'modifiedTime desc'
    });

    return res.data.files || [];

  } catch (error) {
    console.error(`❌ Erro ao listar propostas: ${error}`);
    return [];
  }
}

// ====================================
// DELETAR ARQUIVO
// ====================================
export async function deleteFile(fileId: string): Promise<boolean> {
  try {
    const auth = getAuthClient();
    const drive = google.drive({ version: 'v3', auth });

    await drive.files.delete({ fileId });
    console.log(`✅ Arquivo deletado do Google Drive: ${fileId}`);
    return true;

  } catch (error) {
    console.error(`❌ Erro ao deletar arquivo: ${error}`);
    return false;
  }
}

// ====================================
// OBTER INFO DE ARMAZENAMENTO
// ====================================
export async function getStorageInfo(): Promise<any> {
  try {
    const auth = getAuthClient();
    const drive = google.drive({ version: 'v3', auth });

    const res = await drive.about.get({
      fields: 'storageQuota, user'
    });

    const quota = res.data.storageQuota;
    const usedGB = quota?.usage ? (parseInt(quota.usage) / 1024 / 1024 / 1024).toFixed(2) : 0;
    const limitGB = quota?.limit ? (parseInt(quota.limit) / 1024 / 1024 / 1024).toFixed(2) : 'Ilimitado';

    return {
      user: res.data.user,
      used: usedGB,
      limit: limitGB,
      usedPercentage: quota?.limit ? (parseInt(quota.usage!) / parseInt(quota.limit) * 100).toFixed(2) : 0
    };

  } catch (error) {
    console.error(`❌ Erro ao obter info de armazenamento: ${error}`);
    return null;
  }
}

// ====================================
// FUNÇÃO AUXILIAR: Upload Completo
// ====================================
export async function uploadPropostaCompleta(
  clienteSlug: string,
  htmlContent: string,
  jsonData: any
): Promise<{ html: DriveUploadResult; json: DriveUploadResult }> {
  const timestamp = Date.now();

  const [htmlResult, jsonResult] = await Promise.all([
    uploadPropostaHTML(clienteSlug, htmlContent, `proposta_${clienteSlug}_${timestamp}.html`),
    uploadPropostaJSON(clienteSlug, jsonData, `proposta_${clienteSlug}_${timestamp}.json`)
  ]);

  return {
    html: htmlResult,
    json: jsonResult
  };
}
