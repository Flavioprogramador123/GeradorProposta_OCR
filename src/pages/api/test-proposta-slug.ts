import { NextApiRequest, NextApiResponse } from 'next';
import { getPropostaBySlug } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';

/**
 * API de teste para verificar se uma proposta existe no Supabase
 * 
 * USO:
 * GET /api/test-proposta-slug?slug=cliente-padrao-0006-31-10-2025
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { slug } = req.query;

  if (!slug || typeof slug !== 'string') {
    return res.status(400).json({
      error: 'Parâmetro "slug" é obrigatório',
      exemplo: '/api/test-proposta-slug?slug=cliente-padrao-0006-31-10-2025'
    });
  }

  try {
    console.log('🔍 Testando busca de proposta com slug:', slug);

    // Verificar variáveis de ambiente
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({
        error: 'Variáveis Supabase não configuradas',
        supabaseUrl: !!supabaseUrl,
        supabaseKey: !!supabaseKey
      });
    }

    // Teste 1: Buscar usando função helper
    console.log('📋 Teste 1: Usando getPropostaBySlug()...');
    const propostaHelper = await getPropostaBySlug(slug);

    // Teste 2: Buscar diretamente
    console.log('📋 Teste 2: Query direta no Supabase...');
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { data: propostaDireta, error: erroDireto } = await supabase
      .from('propostas')
      .select('id, slug, titulo, status, html_gerado, dados_completos, created_at')
      .eq('slug', slug)
      .maybeSingle();

    // Teste 3: Listar todas as propostas com slug similar
    console.log('📋 Teste 3: Buscando propostas similares...');
    const { data: propostasSimilares, error: erroSimilares } = await supabase
      .from('propostas')
      .select('slug, titulo, status, created_at')
      .ilike('slug', `%${slug.split('-')[0]}%`)
      .order('created_at', { ascending: false })
      .limit(10);

    // Teste 4: Contar todas as propostas
    console.log('📋 Teste 4: Contando todas as propostas...');
    const { count } = await supabase
      .from('propostas')
      .select('*', { count: 'exact', head: true });

    // Retornar diagnóstico completo
    return res.status(200).json({
      success: true,
      slug: slug,
      timestamp: new Date().toISOString(),
      
      config: {
        supabaseUrl: supabaseUrl,
        supabaseKeyConfigured: !!supabaseKey
      },

      teste1_helper: {
        encontrado: !!propostaHelper,
        dados: propostaHelper ? {
          id: propostaHelper.id,
          slug: propostaHelper.slug,
          titulo: propostaHelper.titulo,
          status: propostaHelper.status,
          temHtml: !!propostaHelper.html_gerado,
          tamanhoHtml: propostaHelper.html_gerado?.length || 0,
          temDadosCompletos: !!propostaHelper.dados_completos,
          created_at: propostaHelper.created_at
        } : null
      },

      teste2_direto: {
        encontrado: !!propostaDireta,
        erro: erroDireto?.message || null,
        dados: propostaDireta ? {
          id: propostaDireta.id,
          slug: propostaDireta.slug,
          titulo: propostaDireta.titulo,
          status: propostaDireta.status,
          temHtml: !!propostaDireta.html_gerado,
          tamanhoHtml: propostaDireta.html_gerado?.length || 0,
          temDadosCompletos: !!propostaDireta.dados_completos,
          created_at: propostaDireta.created_at
        } : null
      },

      teste3_similares: {
        encontradas: propostasSimilares?.length || 0,
        erro: erroSimilares?.message || null,
        propostas: propostasSimilares?.map(p => ({
          slug: p.slug,
          titulo: p.titulo,
          status: p.status,
          created_at: p.created_at
        })) || []
      },

      teste4_total: {
        totalPropostas: count || 0
      },

      diagnostico: {
        propostaExiste: !!propostaDireta || !!propostaHelper,
        possivelCausa: !propostaDireta && !propostaHelper 
          ? 'Proposta não encontrada no banco. Verifique se foi salva corretamente.'
          : propostaDireta && !propostaDireta.html_gerado
          ? 'Proposta existe mas sem HTML gerado.'
          : propostaDireta && !propostaDireta.dados_completos
          ? 'Proposta existe mas sem dados_completos.'
          : 'Proposta encontrada e completa ✅'
      }
    });

  } catch (error) {
    console.error('❌ Erro no teste:', error);
    return res.status(500).json({
      error: 'Erro ao testar proposta',
      message: error instanceof Error ? error.message : 'Erro desconhecido',
      stack: error instanceof Error ? error.stack : undefined
    });
  }
}

