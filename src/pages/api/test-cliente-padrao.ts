import { NextApiRequest, NextApiResponse } from 'next';
import { getAllClientes, getPropostaBySlug } from '@/lib/supabase';

/**
 * API de teste para verificar se o cliente padrão está no Supabase
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const slug = 'cliente-padrao-itamaraty-17-11-2025';
    
    // Buscar todos os clientes
    const clientes = await getAllClientes();
    
    // Buscar cliente específico por nome
    const clientePadrao = clientes.find(c => 
      c.nome.toLowerCase().includes('padrão') || 
      c.nome.toLowerCase().includes('padrao') ||
      c.nome.toLowerCase().includes('itamaraty')
    );
    
    // Buscar proposta por slug
    const proposta = await getPropostaBySlug(slug);
    
    return res.status(200).json({
      success: true,
      slug,
      cliente: {
        encontrado: !!clientePadrao,
        dados: clientePadrao || null,
      },
      proposta: {
        encontrada: !!proposta,
        dados: proposta ? {
          id: proposta.id,
          slug: proposta.slug,
          status: proposta.status,
          created_at: proposta.created_at,
          cliente_id: proposta.cliente_id,
        } : null,
      },
      totalClientes: clientes.length,
      todosClientes: clientes.map(c => ({
        id: c.id,
        nome: c.nome,
        cidade: c.cidade,
        created_at: c.created_at,
      })),
      urls: {
        vercel: {
          admin: 'https://pieng-propostas.vercel.app/admin/orcamentos',
          proposta: `https://pieng-propostas.vercel.app/proposta/${slug}`,
          test: 'https://pieng-propostas.vercel.app/api/test-cliente-padrao',
        },
        local: {
          admin: 'http://localhost:3000/admin/orcamentos',
          proposta: `http://localhost:3000/proposta/${slug}`,
          test: 'http://localhost:3000/api/test-cliente-padrao',
        },
      },
    });

  } catch (error) {
    console.error('❌ Erro no teste:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      stack: error instanceof Error ? error.stack : undefined,
    });
  }
}

