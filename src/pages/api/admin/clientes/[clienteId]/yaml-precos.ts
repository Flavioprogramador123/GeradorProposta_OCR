import { NextApiRequest, NextApiResponse } from 'next';
import { promises as fs } from 'fs';
import path from 'path';
import yaml from 'js-yaml';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { clienteId } = req.query;

  if (!clienteId || typeof clienteId !== 'string') {
    return res.status(400).json({ message: 'ID do cliente é obrigatório' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Primeiro tenta buscar arquivo YAML específico do cliente
    const clienteYamlPath = path.join(process.cwd(), 'src/data/clientes', clienteId, 'orcamentos.yaml');

    let yamlData: any = {};

    // Verifica se existe arquivo YAML do cliente
    try {
      const yamlContent = await fs.readFile(clienteYamlPath, 'utf8');
      yamlData = yaml.load(yamlContent) as any;
    } catch (error) {
      // Se não existe arquivo do cliente, tenta buscar orcamento_dutra.yaml como fallback
      try {
        const fallbackYamlPath = path.join(process.cwd(), 'src/data/clientes', 'orcamento_dutra.yaml');
        const yamlContent = await fs.readFile(fallbackYamlPath, 'utf8');
        yamlData = yaml.load(yamlContent) as any;
      } catch (fallbackError) {
        console.log('Nenhum arquivo YAML encontrado:', fallbackError);
        return res.status(200).json({}); // Retorna objeto vazio se não encontrar YAML
      }
    }

    // Processa e organiza os dados do YAML
    const processedData: any = {};

    if (yamlData.consolidado_orcamentos_distribuidores) {
      for (const distribuidor in yamlData.consolidado_orcamentos_distribuidores) {
        const orcamentos = yamlData.consolidado_orcamentos_distribuidores[distribuidor];

        processedData[distribuidor] = orcamentos.map((item: any) => ({
          arquivo_origem: item.orcamento?.arquivo_origem,
          preco_total: item.orcamento?.preco_total,
          orcamento_id: item.orcamento?.orcamento_id,
          potencia_total_sistema: item.orcamento?.potencia_total_sistema,
          modulos: item.orcamento?.modulos || [],
          inversores: item.orcamento?.inversores || []
        }));
      }
    }

    res.status(200).json(processedData);
  } catch (error) {
    console.error('Erro ao processar YAML:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
}