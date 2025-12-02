import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { getClientesWithPropostas } from '@/lib/supabase';

/**
 * 🧹 API DE LIMPEZA DE CLIENTES DE TESTE
 * 
 * Remove clientes que começam com "Cliente Padrão" ou outros padrões de teste
 * Deleta também todas as propostas, analytics e orçamentos relacionados
 */

interface LimpezaResult {
  clientesDeletados: number;
  propostasDeletadas: number;
  analyticsDeletados: number;
  orcamentosDeletados: number;
  clientes: Array<{
    nome: string;
    id: string;
    propostas: number;
  }>;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ error: 'Supabase não configurado' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('🧹 Iniciando limpeza de clientes de teste...');

    // Buscar todos os clientes
    const clientes = await getClientesWithPropostas();
    
    // Filtrar clientes de teste
    const clientesTeste = clientes.filter((c: any) => {
      const nome = c.nome?.toLowerCase() || '';
      // Padrões de teste comuns
      return (
        nome.includes('cliente padrão') ||
        nome.includes('teste') ||
        nome.includes('test') ||
        nome.includes('exemplo') ||
        nome.includes('demo') ||
        nome.startsWith('cliente-') ||
        (nome.includes('padrão') && nome.includes('00'))
      );
    });

    console.log(`📊 Encontrados ${clientesTeste.length} cliente(s) de teste para deletar`);

    if (clientesTeste.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'Nenhum cliente de teste encontrado',
        result: {
          clientesDeletados: 0,
          propostasDeletadas: 0,
          analyticsDeletados: 0,
          orcamentosDeletados: 0,
          clientes: []
        }
      });
    }

    const resultado: LimpezaResult = {
      clientesDeletados: 0,
      propostasDeletadas: 0,
      analyticsDeletados: 0,
      orcamentosDeletados: 0,
      clientes: []
    };

    // Deletar cada cliente de teste
    for (const cliente of clientesTeste) {
      console.log(`🗑️ Deletando cliente de teste: ${cliente.nome} (ID: ${cliente.id})`);

      try {
        // 1. Buscar todas as propostas do cliente
        const { data: propostas, error: propostasError } = await supabase
          .from('propostas')
          .select('id, slug')
          .eq('cliente_id', cliente.id);

        let propostasCount = 0;
        let analyticsCount = 0;

        if (propostas && propostas.length > 0) {
          propostasCount = propostas.length;
          console.log(`   📊 Encontradas ${propostas.length} proposta(s)`);

          // 1.1. Deletar analytics de todas as propostas
          for (const proposta of propostas) {
            if (proposta.slug) {
              const { error: analyticsError } = await supabase
                .from('proposta_analytics')
                .delete()
                .eq('proposta_slug', proposta.slug);

              if (!analyticsError || analyticsError.code === 'PGRST116') {
                analyticsCount++;
              }
            }
          }

          // 1.2. Deletar todas as propostas
          const { error: deletePropostasError } = await supabase
            .from('propostas')
            .delete()
            .eq('cliente_id', cliente.id);

          if (deletePropostasError) {
            console.warn(`   ⚠️ Erro ao deletar propostas:`, deletePropostasError);
          } else {
            console.log(`   ✅ ${propostas.length} proposta(s) deletada(s)`);
          }
        }

        // 2. Deletar orçamentos
        let orcamentosCount = 0;
        try {
          const { error: orcamentosError } = await supabase
            .from('orcamentos')
            .delete()
            .eq('cliente_id', cliente.id);

          if (!orcamentosError || orcamentosError.code === 'PGRST116') {
            orcamentosCount = 1; // Assumindo que deletou (não temos contagem exata)
          }
        } catch (orcError) {
          // Tabela pode não existir
        }

        // 3. Deletar o cliente
        const { error: deleteClienteError } = await supabase
          .from('clientes')
          .delete()
          .eq('id', cliente.id);

        if (deleteClienteError) {
          console.error(`   ❌ Erro ao deletar cliente:`, deleteClienteError);
          continue;
        }

        console.log(`   ✅ Cliente "${cliente.nome}" deletado com sucesso!`);

        resultado.clientesDeletados++;
        resultado.propostasDeletadas += propostasCount;
        resultado.analyticsDeletados += analyticsCount;
        resultado.orcamentosDeletados += orcamentosCount;
        resultado.clientes.push({
          nome: cliente.nome,
          id: cliente.id,
          propostas: propostasCount
        });

      } catch (error) {
        console.error(`   ❌ Erro ao processar cliente ${cliente.nome}:`, error);
      }
    }

    console.log(`✅ Limpeza concluída!`);
    console.log(`   - ${resultado.clientesDeletados} cliente(s) deletado(s)`);
    console.log(`   - ${resultado.propostasDeletadas} proposta(s) deletada(s)`);
    console.log(`   - ${resultado.analyticsDeletados} registro(s) de analytics deletado(s)`);
    console.log(`   - ${resultado.orcamentosDeletados} orçamento(s) deletado(s)`);

    return res.status(200).json({
      success: true,
      message: `Limpeza concluída com sucesso! ${resultado.clientesDeletados} cliente(s) de teste removido(s)`,
      result: resultado
    });

  } catch (error) {
    console.error('❌ Erro ao fazer limpeza:', error);
    return res.status(500).json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}


