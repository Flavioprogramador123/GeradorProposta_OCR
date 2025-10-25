import { NextApiRequest, NextApiResponse } from 'next';

/**
 * API de teste para verificar conexão com Supabase
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    console.log('🧪 Teste Supabase - Variáveis:', {
      SUPABASE_URL: SUPABASE_URL ? 'OK' : 'MISSING',
      SUPABASE_KEY: SUPABASE_KEY ? 'OK' : 'MISSING',
    });

    if (!SUPABASE_URL || !SUPABASE_KEY) {
      return res.status(500).json({
        error: 'Variáveis de ambiente não configuradas',
        details: {
          SUPABASE_URL: SUPABASE_URL ? 'OK' : 'MISSING',
          SUPABASE_KEY: SUPABASE_KEY ? 'OK' : 'MISSING',
        }
      });
    }

    // Importar Supabase dinamicamente
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    console.log('✅ Cliente Supabase criado');

    // Tentar listar clientes
    const { data: clientes, error: clientesError } = await supabase
      .from('clientes')
      .select('id, nome')
      .limit(5);

    if (clientesError) {
      console.error('❌ Erro ao listar clientes:', clientesError);
      return res.status(500).json({
        error: 'Erro ao consultar Supabase',
        details: clientesError,
        message: clientesError.message,
        hint: clientesError.hint,
        code: clientesError.code,
      });
    }

    console.log('✅ Clientes encontrados:', clientes?.length || 0);

    return res.status(200).json({
      success: true,
      message: '✅ Conexão com Supabase funcionando!',
      clientesCount: clientes?.length || 0,
      clientes: clientes,
      env: {
        SUPABASE_URL: SUPABASE_URL ? 'Configurada' : 'MISSING',
        SUPABASE_KEY: SUPABASE_KEY ? 'Configurada' : 'MISSING',
      }
    });

  } catch (error) {
    console.error('❌ Erro no teste:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      stack: error instanceof Error ? error.stack : undefined,
    });
  }
}
