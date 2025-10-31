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
  // 🔧 MÉTODO DELETE trabalhos Apagar proposta
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
    let propostas: PropostaInfo[] = [];
    
    // 🚀 PRIORIDADE 1: Buscar do Supabase (PRODUÇÃO)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseKey) {
      try {
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        console.log('🔍 Buscando propostas no Supabase...');
        const { data: propostasSupabase, error } = await supabase
          .from('propostas')
          .select('slug, titulo, created_at, clientes(nome)')
          .eq('status', 'ativa')
          .order('created_at', { ascending: false });

        if (!error && propostasSupabase && propostasSupabase.length > 0) {
          console.log(`✅ ${propostasSupabase.length} propostas encontradas no Supabase`);
          
          propostas = propostasSupabase.map((proposta: any) => {
            const clienteNome = proposta.clientes?.nome || proposta.titulo?.replace('Proposta Solar - ', '') || 'Cliente';
            const slug = proposta.slug;
            const fileName = `proposta_${slug}.html`;
            const dataFormatada = new Date(proposta.created_at).toLocaleDateString('pt-BR').replace(/\//g, '-');
            const displayName = `${formatDisplayName(clienteNome)} ${dataFormatada}`;
            
            return {
              file: fileName,
              name: slug,
              displayName: displayName,
              url: `proposta/${slug}` // URL da rota Next.js (busca do Supabase)
            };
          });
        }
      } catch (supabaseError) {
        console.error('⚠️ Erro ao buscar do Supabase, usando fallback filesystem:', supabaseError);
      }
    }

    // 🗂️ PRIORIDADE 2: Fallback para arquivos HTML (COMPATIBILIDADE)
    try {
      const publicPropostasDir = path.join(process.cwd(), 'public/propostas/orçamento/clientes');
      await fs.access(publicPropostasDir);
      const files = await fs.readdir(publicPropostasDir);

      const filesWithStats = await Promise.all(
        files
          .filter(file => file.endsWith('.html') && !file.includes('resultados'))
          .map(async (file) => {
            const filePath = path.join(publicPropostasDir, file);
            const stats = await fs.stat(filePath);
            return { file, mtime: stats.mtime };
          })
      );

      const propostasFilesystem = filesWithStats
        .sort((a, b) => b.mtime.getTime() - a.mtime.getTime())
        .map(({ file }) => {
          const name = file.replace('.html', '').replace('proposta_', '');
          const displayName = formatDisplayName(name);
          return {
            file,
            name,
            displayName,
            url: `propostas/orçamento/clientes/${file}`
          };
        });

      // Combinar propostas do Supabase + filesystem (evitar duplicatas)
      if (propostas.length > 0) {
        const slugsSupabase = new Set(propostas.map(p => p.name));
        propostasFilesystem.forEach(p => {
          if (!slugsSupabase.has(p.name)) {
            propostas.push(p);
          }
        });
      } else {
        propostas = propostasFilesystem;
      }
    } catch (error) {
      console.log('⚠️ Diretório public/propostas não encontrado');
    }

    // Se não encontrou propostas, usar dados de fallback
    if (propostas.length === 0) {
      propostas = [
        {
          file: 'proposta_marcelo-14-10-2025.html',
          name: 'marcelo-14-10-2025',
          displayName: 'Marcelo',
          url: 'orçamento/clientes/proposta_marcelo-14-10-2025.html'
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
