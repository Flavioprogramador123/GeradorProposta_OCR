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
      
      // ✅ BUSCAR DADOS ATUALIZADOS DO CLIENTE DO SUPABASE
      // Isso garante que temos os valores mais recentes (hsp, tarifa, etc.)
      let dadosCompletos = propostaSupabase.dados_completos;
      
      if (propostaSupabase.cliente_id) {
        try {
          const { getClienteById } = await import('@/lib/supabase');
          const clienteAtualizado = await getClienteById(propostaSupabase.cliente_id);
          
          if (clienteAtualizado && dadosCompletos.cliente) {
            // Atualizar dados do cliente com valores do Supabase
            dadosCompletos.cliente = {
              ...dadosCompletos.cliente,
              // ✅ Prioridade: Supabase > dados_completos
              hsp: clienteAtualizado.hsp_local || dadosCompletos.cliente.hsp || dadosCompletos.cliente.hspLocal,
              hspLocal: clienteAtualizado.hsp_local || dadosCompletos.cliente.hspLocal,
              consumoMensal: clienteAtualizado.consumo_mensal || dadosCompletos.cliente.consumoMensal,
              tipoImovel: clienteAtualizado.tipo_imovel || dadosCompletos.cliente.tipoImovel,
              cidade: clienteAtualizado.cidade || dadosCompletos.cliente.cidade,
              estado: clienteAtualizado.estado || dadosCompletos.cliente.estado,
              email: clienteAtualizado.email || dadosCompletos.cliente.email,
              telefone: clienteAtualizado.telefone || dadosCompletos.cliente.telefone
            };
            
            console.log('✅ Dados do cliente atualizados do Supabase:', {
              hsp: dadosCompletos.cliente.hsp,
              consumoMensal: dadosCompletos.cliente.consumoMensal,
              cidade: dadosCompletos.cliente.cidade
            });
          }
        } catch (error) {
          console.warn('⚠️ Não foi possível buscar cliente atualizado, usando dados da proposta:', error);
        }
      }
      
      // Adicionar headers de cache para melhor performance
      res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
      
      return res.status(200).json(dadosCompletos);
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

