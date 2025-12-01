import { NextApiRequest, NextApiResponse } from 'next';
import { getPropostaBySlug } from '@/lib/supabase';

/**
 * API para carregar propostas dinamicamente
 *
 * ESTRATÉGIA HÍBRIDA:
 * 1. Tenta Supabase primeiro (produção)
 * 2. Fallback para filesystem (desenvolvimento)
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { slug } = req.query;

  if (!slug || typeof slug !== 'string') {
    return res.status(400).json({ error: 'Slug inválido' });
  }

  try {
    // PRODUÇÃO: Tentar carregar do Supabase com timeout
    console.log('🔍 Buscando proposta no Supabase:', slug);
    const startTime = Date.now();
    
    // Adicionar timeout de 10 segundos
    const propostaSupabase = await Promise.race([
      getPropostaBySlug(slug),
      new Promise<null>((_, reject) => 
        setTimeout(() => reject(new Error('Timeout ao buscar proposta')), 10000)
      )
    ]);

    const elapsed = Date.now() - startTime;
    console.log(`⏱️ Tempo de busca: ${elapsed}ms`);

    if (propostaSupabase && propostaSupabase.dados_completos) {
      console.log('✅ API: Proposta encontrada no Supabase:', slug);
      
      // Adicionar headers de cache para melhor performance
      res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
      
      return res.status(200).json(propostaSupabase.dados_completos);
    }

    // DESENVOLVIMENTO: Fallback para filesystem
    if (process.env.NODE_ENV === 'development') {
      const fs = await import('fs');
      const path = await import('path');

      const propostaPath = path.join(
        process.cwd(),
        'src/data/clientes',
        slug,
        'proposta.json'
      );

      const propostaData = await fs.promises.readFile(propostaPath, 'utf8');
      const proposta = JSON.parse(propostaData);

      console.log('✅ API: Proposta encontrada no filesystem:', slug);
      return res.status(200).json(proposta);
    }

    // Não encontrado
    throw new Error('Proposta não encontrada');
  } catch (error) {
    console.error('❌ API: Proposta não encontrada para:', slug, error);

    // Retornar erro 404 com dica
    return res.status(404).json({
      error: 'Proposta não encontrada',
      slug,
      hint: `Acesse o HTML direto: https://pieng-propostas.vercel.app/propostas/orçamento/clientes/proposta_${slug}.html`,
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

