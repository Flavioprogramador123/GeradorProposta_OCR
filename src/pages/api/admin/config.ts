import { NextApiRequest, NextApiResponse } from 'next';
import { promises as fs } from 'fs';
import path from 'path';

const CONFIG_FILE_PATH = path.join(process.cwd(), 'src/data/sistema/configuracoes.json');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const configData = await fs.readFile(CONFIG_FILE_PATH, 'utf8');
      const config = JSON.parse(configData);
      res.status(200).json(config);
    } catch (error) {
      // Se o arquivo não existe, retorna configuração padrão
      res.status(200).json({});
    }
  } 
  else if (req.method === 'POST') {
    try {
      const config = req.body;
      
      // Criar diretório se não existe
      const configDir = path.dirname(CONFIG_FILE_PATH);
      await fs.mkdir(configDir, { recursive: true });
      
      // Salvar configuração com timestamp
      const configWithMetadata = {
        ...config,
        metadata: {
          lastUpdate: new Date().toISOString(),
          version: '2.0'
        }
      };
      
      await fs.writeFile(CONFIG_FILE_PATH, JSON.stringify(configWithMetadata, null, 2), 'utf8');
      
      res.status(200).json({ message: 'Configuração salva com sucesso!' });
    } catch (error) {
      console.error('Erro ao salvar configuração:', error);
      res.status(500).json({ message: 'Erro ao salvar configuração' });
    }
  } 
  else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}