import { NextApiRequest, NextApiResponse } from 'next';
import { isGoogleDriveConfigured, getStorageInfo } from '@/lib/google-drive';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Verificar se está configurado
    const isConfigured = isGoogleDriveConfigured();

    if (!isConfigured) {
      return res.status(500).json({
        success: false,
        message: 'Google Drive não está configurado',
        configured: false
      });
    }

    // Tentar obter informações de armazenamento
    const storageInfo = await getStorageInfo();

    if (!storageInfo) {
      return res.status(500).json({
        success: false,
        message: 'Não foi possível conectar ao Google Drive',
        configured: true,
        connected: false
      });
    }

    res.status(200).json({
      success: true,
      message: 'Google Drive conectado com sucesso!',
      configured: true,
      connected: true,
      storage: storageInfo
    });

  } catch (error) {
    console.error('Erro ao testar Google Drive:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao testar conexão',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}
