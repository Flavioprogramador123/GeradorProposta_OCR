import { NextApiRequest, NextApiResponse } from 'next';
import { promises as fs } from 'fs';
import path from 'path';

interface PropostaInfo {
  file: string;
  name: string;
  displayName: string;
  url: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // 🔧 MÉTODO DELETE: Apagar proposta
  if (req.method === 'DELETE') {
    const { filename } = req.body;

    if (!filename) {
      return res.status(400).json({ message: 'Nome do arquivo não fornecido' });
    }

    try {
      const publicPropostasDir = path.join(process.cwd(), 'public/propostas/orçamento/clientes');
      const filePath = path.join(publicPropostasDir, filename);

      await fs.unlink(filePath);
      console.log(`✅ Proposta deletada: ${filename}`);

      return res.status(200).json({ message: 'Proposta deletada com sucesso' });
    } catch (error) {
      console.error('Erro ao deletar proposta:', error);
      return res.status(500).json({ message: 'Erro ao deletar proposta' });
    }
  }

  // 🔧 MÉTODO GET: Listar propostas
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // 🚀 VERCEL: Ler da pasta public/ (migração completa)
    const publicPropostasDir = path.join(process.cwd(), 'public/propostas/orçamento/clientes');

    let propostas: PropostaInfo[] = [];

    try {
      await fs.access(publicPropostasDir);
      const files = await fs.readdir(publicPropostasDir);

      // 🔧 LER METADADOS DOS ARQUIVOS para ordenar por data de modificação
      const filesWithStats = await Promise.all(
        files
          .filter(file => file.endsWith('.html') && !file.includes('resultados'))
          .map(async (file) => {
            const filePath = path.join(publicPropostasDir, file);
            const stats = await fs.stat(filePath);
            return { file, mtime: stats.mtime };
          })
      );

      // 🔧 ORDENAR POR DATA: Mais recentes primeiro
      propostas = filesWithStats
        .sort((a, b) => b.mtime.getTime() - a.mtime.getTime())
        .map(({ file }) => {
          const name = file.replace('.html', '');
          const displayName = formatDisplayName(name);
          return {
            file,
            name,
            displayName,
            url: `propostas/orçamento/clientes/${file}`
          };
        });

    } catch (error) {
      console.log('⚠️ Diretório public/propostas não encontrado, usando fallback');
    }

    // Se não encontrou propostas ou está em ambiente serverless, usar dados de fallback
    if (propostas.length === 0) {
      propostas = [
        {
          file: 'proposta_marcelo-14-10-2025.html',
          name: 'marcelo-14-10-2025',
          displayName: 'Marcelo',
          url: 'orçamento/clientes/proposta_marcelo-14-10-2025.html'
        },
        {
          file: 'proposta_daniel-verdura-29-09-2025.html',
          name: 'daniel-verdura-29-09-2025',
          displayName: 'Daniel Verdura',
          url: 'orçamento/clientes/proposta_daniel-verdura-29-09-2025.html'
        },
        {
          file: 'proposta_cliente-padrao-14-10-2025.html',
          name: 'cliente-padrao-14-10-2025',
          displayName: 'Cliente Padrão',
          url: 'orçamento/clientes/proposta_cliente-padrao-14-10-2025.html'
        },
        {
          file: 'proposta_betania-01-10-2025.html',
          name: 'betania-01-10-2025',
          displayName: 'Betania',
          url: 'orçamento/clientes/proposta_betania-01-10-2025.html'
        },
        {
          file: 'proposta_dorvalina-ioneide-06-10-2025.html',
          name: 'dorvalina-ioneide-06-10-2025',
          displayName: 'Dorvalina Ioneide',
          url: 'orçamento/clientes/proposta_dorvalina-ioneide-06-10-2025.html'
        }
      ];
    }

    console.log(`API Propostas Públicas: ${propostas.length} propostas encontradas`);

    res.status(200).json({ 
      propostas,
      stats: {
        total: propostas.length,
        lastUpdated: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Erro ao listar propostas públicas:', error);
    
    // Fallback em caso de erro
    const fallbackPropostas = [
      {
        file: 'proposta_marcelo-14-10-2025.html',
        name: 'marcelo-14-10-2025',
        displayName: 'Marcelo',
        url: 'orçamento/clientes/proposta_marcelo-14-10-2025.html'
      }
    ];
    
    res.status(200).json({
      propostas: fallbackPropostas,
      stats: {
        total: 1,
        lastUpdated: new Date().toISOString()
      }
    });
  }
}

/**
 * Formata o nome da proposta para exibição
 */
function formatDisplayName(name: string): string {
  // Remove prefixos comuns
  let displayName = name
    .replace(/^proposta_/, '')
    .replace(/^proposta_resultados_/, '')
    .replace(/^orçamento_/, '')
    .replace(/^orçamento-/, '')
    .replace(/-/g, ' ')
    .replace(/_/g, ' ');

  // Capitaliza primeira letra de cada palavra
  displayName = displayName
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');

  return displayName;
}
