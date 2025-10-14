import { NextApiRequest, NextApiResponse } from 'next';
import { promises as fs } from 'fs';
import path from 'path';
import { google } from 'googleapis';

interface PropostaData {
  cliente: {
    nome: string;
    cidade: string;
    consumoMensal: number;
    tipoInstalacao?: string;
  };
  sistemas: Array<{
    titulo: string;
    potencia: string;
    valorTotal: number;
    geracaoMensal: number;
    paybackMeses: number;
    cobertura: number;
  }>;
  metadata?: {
    created: string;
    status: string;
  };
}

/**
 * Configuração do Google Drive API
 */
function getGoogleDriveClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/drive'],
  });

  return google.drive({ version: 'v3', auth });
}

/**
 * Buscar pasta do Google Drive por nome
 */
async function findFolderByName(drive: any, folderName: string, parentId?: string) {
  try {
    const query = `name='${folderName}' and mimeType='application/vnd.google-apps.folder'`;
    const parentQuery = parentId ? ` and '${parentId}' in parents` : '';
    
    const response = await drive.files.list({
      q: query + parentQuery,
      fields: 'files(id, name, parents)',
    });

    return response.data.files?.[0] || null;
  } catch (error) {
    console.error('Erro ao buscar pasta:', error);
    return null;
  }
}

/**
 * Criar pasta no Google Drive
 */
async function createFolder(drive: any, folderName: string, parentId?: string) {
  try {
    const fileMetadata = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: parentId ? [parentId] : undefined,
    };

    const response = await drive.files.create({
      requestBody: fileMetadata,
      fields: 'id, name',
    });

    return response.data;
  } catch (error) {
    console.error('Erro ao criar pasta:', error);
    return null;
  }
}

/**
 * Upload de arquivo para o Google Drive
 */
async function uploadFile(drive: any, fileName: string, content: string, folderId: string) {
  try {
    const fileMetadata = {
      name: fileName,
      parents: [folderId],
    };

    const media = {
      mimeType: 'application/json',
      body: content,
    };

    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, name, webViewLink',
    });

    return response.data;
  } catch (error) {
    console.error('Erro ao fazer upload:', error);
    return null;
  }
}

/**
 * Verificar se arquivo existe no Google Drive
 */
async function fileExists(drive: any, fileName: string, folderId: string) {
  try {
    const response = await drive.files.list({
      q: `name='${fileName}' and '${folderId}' in parents`,
      fields: 'files(id, name)',
    });

    return response.data.files?.[0] || null;
  } catch (error) {
    console.error('Erro ao verificar arquivo:', error);
    return null;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { clientePasta } = req.body;

    if (!clientePasta) {
      return res.status(400).json({ message: 'clientePasta é obrigatório' });
    }

    // Verificar se as credenciais do Google estão configuradas
    if (!process.env.GOOGLE_CLIENT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
      return res.status(500).json({ 
        message: 'Credenciais do Google não configuradas',
        error: 'GOOGLE_CLIENT_EMAIL e GOOGLE_PRIVATE_KEY são necessários'
      });
    }

    const drive = getGoogleDriveClient();
    
    // Buscar ou criar pasta principal "PIENG-Propostas"
    let mainFolder = await findFolderByName(drive, 'PIENG-Propostas');
    if (!mainFolder) {
      mainFolder = await createFolder(drive, 'PIENG-Propostas');
      if (!mainFolder) {
        throw new Error('Não foi possível criar pasta principal');
      }
    }

    // Buscar ou criar pasta "Clientes"
    let clientesFolder = await findFolderByName(drive, 'Clientes', mainFolder.id);
    if (!clientesFolder) {
      clientesFolder = await createFolder(drive, 'Clientes', mainFolder.id);
      if (!clientesFolder) {
        throw new Error('Não foi possível criar pasta de clientes');
      }
    }

    // Buscar ou criar pasta do cliente específico
    let clienteFolder = await findFolderByName(drive, clientePasta, clientesFolder.id);
    if (!clienteFolder) {
      clienteFolder = await createFolder(drive, clientePasta, clientesFolder.id);
      if (!clienteFolder) {
        throw new Error(`Não foi possível criar pasta do cliente ${clientePasta}`);
      }
    }

    // Ler arquivos locais do cliente
    const clientePath = path.join(process.cwd(), 'src/data/clientes', clientePasta);
    
    try {
      await fs.access(clientePath);
    } catch {
      return res.status(404).json({ message: 'Cliente não encontrado localmente' });
    }

    const files = await fs.readdir(clientePath);
    const uploadedFiles = [];

    // Upload de cada arquivo
    for (const file of files) {
      const filePath = path.join(clientePath, file);
      const stat = await fs.stat(filePath);
      
      if (stat.isFile()) {
        try {
          const content = await fs.readFile(filePath, 'utf8');
          
          // Verificar se arquivo já existe no Google Drive
          const existingFile = await fileExists(drive, file, clienteFolder.id);
          
          if (existingFile) {
            console.log(`Arquivo ${file} já existe no Google Drive, pulando...`);
            uploadedFiles.push({
              fileName: file,
              status: 'exists',
              id: existingFile.id
            });
          } else {
            // Fazer upload do arquivo
            const uploadedFile = await uploadFile(drive, file, content, clienteFolder.id);
            
            if (uploadedFile) {
              uploadedFiles.push({
                fileName: file,
                status: 'uploaded',
                id: uploadedFile.id,
                webViewLink: uploadedFile.webViewLink
              });
            } else {
              uploadedFiles.push({
                fileName: file,
                status: 'error',
                error: 'Falha no upload'
              });
            }
          }
        } catch (error) {
          console.error(`Erro ao processar arquivo ${file}:`, error);
          uploadedFiles.push({
            fileName: file,
            status: 'error',
            error: error instanceof Error ? error.message : 'Erro desconhecido'
          });
        }
      }
    }

    res.status(200).json({
      success: true,
      message: `Cliente ${clientePasta} sincronizado com Google Drive`,
      clienteFolder: {
        id: clienteFolder.id,
        name: clienteFolder.name
      },
      uploadedFiles,
      stats: {
        totalFiles: files.length,
        uploaded: uploadedFiles.filter(f => f.status === 'uploaded').length,
        existing: uploadedFiles.filter(f => f.status === 'exists').length,
        errors: uploadedFiles.filter(f => f.status === 'error').length
      }
    });

  } catch (error) {
    console.error('Erro ao sincronizar com Google Drive:', error);
    res.status(500).json({ 
      message: 'Erro interno do servidor',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}
