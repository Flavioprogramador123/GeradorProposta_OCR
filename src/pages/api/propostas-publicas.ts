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
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Detectar ambiente serverless
    const isServerless = process.env.NETLIFY || process.env.VERCEL || process.env.NODE_ENV === 'production';
    
    // Definir diretório base baseado no ambiente
    const baseDir = isServerless ? '/tmp' : process.cwd();
    const propostasDir = path.join(baseDir, 'pastanetilify/orçamento/clientes');
    
    let propostas: PropostaInfo[] = [];

    if (!isServerless) {
      // No ambiente local, tentar ler arquivos
      try {
        await fs.access(propostasDir);
        const files = await fs.readdir(propostasDir);
        
        propostas = files
          .filter(file => file.endsWith('.html'))
          .map(file => {
            const name = file.replace('.html', '');
            const displayName = formatDisplayName(name);
            return {
              file,
              name,
              displayName,
              url: `orçamento/clientes/${file}`
            };
          })
          .sort((a, b) => a.displayName.localeCompare(b.displayName));
          
      } catch (error) {
        console.log('Diretório de propostas não encontrado, usando dados de fallback');
      }
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
