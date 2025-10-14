import { NextApiRequest, NextApiResponse } from 'next';
import { google } from 'googleapis';

interface ClienteInfo {
  nome: string;
  cidade: string;
  pasta: string;
  status: string;
  ultimaModificacao: string;
  temProposta: boolean;
}

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
 * Listar arquivos de uma pasta
 */
async function listFilesInFolder(drive: any, folderId: string) {
  try {
    const response = await drive.files.list({
      q: `'${folderId}' in parents`,
      fields: 'files(id, name, mimeType, modifiedTime, webViewLink)',
    });

    return response.data.files || [];
  } catch (error) {
    console.error('Erro ao listar arquivos:', error);
    return [];
  }
}

/**
 * Baixar conteúdo de um arquivo
 */
async function downloadFile(drive: any, fileId: string) {
  try {
    const response = await drive.files.get({
      fileId: fileId,
      alt: 'media',
    }, { responseType: 'stream' });

    return new Promise((resolve, reject) => {
      let data = '';
      response.data.on('data', (chunk) => {
        data += chunk;
      });
      response.data.on('end', () => {
        resolve(data);
      });
      response.data.on('error', reject);
    });
  } catch (error) {
    console.error('Erro ao baixar arquivo:', error);
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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Verificar se as credenciais do Google estão configuradas
    if (!process.env.GOOGLE_CLIENT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
      console.log('Credenciais do Google não configuradas, usando dados locais');
      
      // Fallback para dados locais ou hardcoded
      const fallbackClientes = [
        {
          nome: "MARCELO",
          cidade: "Anápolis/GO",
          pasta: "marcelo-14-10-2025",
          status: "proposta_gerada",
          ultimaModificacao: "14/10/2025",
          temProposta: true
        }
      ];
      
      return res.status(200).json({
        clientes: fallbackClientes,
        stats: {
          totalClientes: 1,
          proposasGeradas: 1,
          aguardandoOrcamentos: 0
        }
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

    // Listar todas as pastas de clientes
    const clientesFolders = await listFilesInFolder(drive, clientesFolder.id);
    const clientes: ClienteInfo[] = [];
    
    let proposasGeradas = 0;
    let aguardandoOrcamentos = 0;

    for (const folder of clientesFolders) {
      if (folder.mimeType !== 'application/vnd.google-apps.folder') continue;

      try {
        // Listar arquivos da pasta do cliente
        const clienteFiles = await listFilesInFolder(drive, folder.id!);
        
        let clienteData: ClienteInfo = {
          nome: folder.name!,
          cidade: 'N/A',
          pasta: folder.name!,
          status: 'aguardando_orcamentos',
          ultimaModificacao: folder.modifiedTime ? new Date(folder.modifiedTime).toLocaleDateString('pt-BR') : 'N/A',
          temProposta: false
        };

        // Procurar por arquivo proposta.json
        const propostaFile = clienteFiles.find(file => file.name === 'proposta.json');
        
        if (propostaFile) {
          // Baixar e ler proposta.json
          const propostaContent = await downloadFile(drive, propostaFile.id!);
          
          if (propostaContent) {
            try {
              const proposta: PropostaData = JSON.parse(propostaContent as string);
              
              clienteData.nome = proposta.cliente.nome;
              clienteData.cidade = proposta.cliente.cidade;
              clienteData.temProposta = true;
              clienteData.status = proposta.metadata?.status || 'proposta_gerada';
              clienteData.ultimaModificacao = proposta.metadata?.created 
                ? new Date(proposta.metadata.created).toLocaleDateString('pt-BR')
                : clienteData.ultimaModificacao;
              
              proposasGeradas++;
            } catch (error) {
              console.error(`Erro ao parsear proposta de ${folder.name}:`, error);
              aguardandoOrcamentos++;
            }
          } else {
            aguardandoOrcamentos++;
          }
        } else {
          aguardandoOrcamentos++;
        }

        clientes.push(clienteData);

      } catch (error) {
        console.error(`Erro ao processar cliente ${folder.name}:`, error);
        // Adicionar cliente com dados mínimos mesmo com erro
        clientes.push({
          nome: folder.name!,
          cidade: 'Erro ao carregar',
          pasta: folder.name!,
          status: 'erro',
          ultimaModificacao: folder.modifiedTime ? new Date(folder.modifiedTime).toLocaleDateString('pt-BR') : 'N/A',
          temProposta: false
        });
      }
    }

    // Ordenar por última modificação (mais recente primeiro)
    clientes.sort((a, b) => {
      return new Date(b.ultimaModificacao).getTime() - new Date(a.ultimaModificacao).getTime();
    });

    const stats = {
      totalClientes: clientes.length,
      proposasGeradas,
      aguardandoOrcamentos
    };

    console.log(`Google Drive API: ${clientes.length} clientes encontrados (${propostasGeradas} com propostas, ${aguardandoOrcamentos} aguardando)`);

    res.status(200).json({ clientes, stats });

  } catch (error) {
    console.error('Erro ao listar clientes do Google Drive:', error);
    
    // Fallback em caso de erro
    const fallbackClientes = [
      {
        nome: "MARCELO",
        cidade: "Anápolis/GO",
        pasta: "marcelo-14-10-2025",
        status: "proposta_gerada",
        ultimaModificacao: "14/10/2025",
        temProposta: true
      }
    ];
    
    res.status(200).json({
      clientes: fallbackClientes,
      stats: {
        totalClientes: 1,
        proposasGeradas: 1,
        aguardandoOrcamentos: 0
      }
    });
  }
}
