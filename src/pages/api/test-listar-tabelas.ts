import { NextApiRequest, NextApiResponse } from 'next';

/**
 * API para listar todas as tabelas do Supabase
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!SUPABASE_URL || !SUPABASE_KEY) {
      return res.status(500).json({ error: 'Variáveis não configuradas' });
    }

    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    // Tentar listar cada tabela
    const resultados: any = {
      timestamp: new Date().toISOString(),
      tabelas_testadas: {},
    };

    // Testar tabela CLIENTES
    try {
      const { data: clientes, error: clientesError } = await supabase
        .from('clientes')
        .select('*')
        .limit(3);

      resultados.tabelas_testadas.clientes = {
        existe: !clientesError,
        registros: clientes?.length || 0,
        erro: clientesError ? {
          message: clientesError.message,
          code: clientesError.code,
          hint: clientesError.hint,
        } : null,
        colunas_exemplo: clientes && clientes.length > 0 ? Object.keys(clientes[0]) : [],
      };
    } catch (error) {
      resultados.tabelas_testadas.clientes = {
        existe: false,
        erro: error instanceof Error ? error.message : 'Erro desconhecido',
      };
    }

    // Testar tabela PROPOSTAS
    try {
      const { data: propostas, error: propostasError } = await supabase
        .from('propostas')
        .select('*')
        .limit(3);

      resultados.tabelas_testadas.propostas = {
        existe: !propostasError,
        registros: propostas?.length || 0,
        erro: propostasError ? {
          message: propostasError.message,
          code: propostasError.code,
          hint: propostasError.hint,
        } : null,
        colunas_exemplo: propostas && propostas.length > 0 ? Object.keys(propostas[0]) : [],
      };
    } catch (error) {
      resultados.tabelas_testadas.propostas = {
        existe: false,
        erro: error instanceof Error ? error.message : 'Erro desconhecido',
      };
    }

    // Testar tabela ORCAMENTOS
    try {
      const { data: orcamentos, error: orcamentosError } = await supabase
        .from('orcamentos')
        .select('*')
        .limit(3);

      resultados.tabelas_testadas.orcamentos = {
        existe: !orcamentosError,
        registros: orcamentos?.length || 0,
        erro: orcamentosError ? {
          message: orcamentosError.message,
          code: orcamentosError.code,
          hint: orcamentosError.hint,
        } : null,
        colunas_exemplo: orcamentos && orcamentos.length > 0 ? Object.keys(orcamentos[0]) : [],
      };
    } catch (error) {
      resultados.tabelas_testadas.orcamentos = {
        existe: false,
        erro: error instanceof Error ? error.message : 'Erro desconhecido',
      };
    }

    // Testar tabela CONFIGURACOES
    try {
      const { data: configuracoes, error: configError } = await supabase
        .from('configuracoes')
        .select('*')
        .limit(3);

      resultados.tabelas_testadas.configuracoes = {
        existe: !configError,
        registros: configuracoes?.length || 0,
        erro: configError ? {
          message: configError.message,
          code: configError.code,
          hint: configError.hint,
        } : null,
        colunas_exemplo: configuracoes && configuracoes.length > 0 ? Object.keys(configuracoes[0]) : [],
      };
    } catch (error) {
      resultados.tabelas_testadas.configuracoes = {
        existe: false,
        erro: error instanceof Error ? error.message : 'Erro desconhecido',
      };
    }

    // Resumo
    const tabelasExistentes = Object.entries(resultados.tabelas_testadas)
      .filter(([_, info]: [string, any]) => info.existe)
      .map(([nome]) => nome);

    const tabelasComErro = Object.entries(resultados.tabelas_testadas)
      .filter(([_, info]: [string, any]) => !info.existe)
      .map(([nome]) => nome);

    resultados.resumo = {
      total_tabelas_testadas: 4,
      tabelas_ok: tabelasExistentes.length,
      tabelas_com_erro: tabelasComErro.length,
      lista_ok: tabelasExistentes,
      lista_erro: tabelasComErro,
    };

    return res.status(200).json(resultados);

  } catch (error) {
    console.error('❌ Erro ao listar tabelas:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      stack: error instanceof Error ? error.stack : undefined,
    });
  }
}
