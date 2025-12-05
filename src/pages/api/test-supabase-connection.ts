import { NextApiRequest, NextApiResponse } from 'next';

/**
 * API de teste avançado para diagnosticar problemas de conexão com Supabase
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    const diagnostics: any = {
      timestamp: new Date().toISOString(),
      env: {
        hasUrl: !!SUPABASE_URL,
        hasKey: !!SUPABASE_KEY,
        urlPreview: SUPABASE_URL?.substring(0, 30) + '...',
        keyPreview: SUPABASE_KEY?.substring(0, 20) + '...',
      },
      tests: [],
    };

    if (!SUPABASE_URL || !SUPABASE_KEY) {
      return res.status(500).json({
        error: 'Variáveis de ambiente não configuradas',
        diagnostics,
      });
    }

    // Teste 1: Criar cliente
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: { persistSession: false },
      });
      diagnostics.tests.push({ name: 'createClient', status: 'success' });
    } catch (error: any) {
      diagnostics.tests.push({ 
        name: 'createClient', 
        status: 'error', 
        error: error.message 
      });
      return res.status(500).json({ error: 'Erro ao criar cliente', diagnostics });
    }

    // Teste 2: Query simples na tabela clientes
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
      
      const { data, error } = await supabase
        .from('clientes')
        .select('id')
        .limit(1);

      if (error) {
        diagnostics.tests.push({ 
          name: 'query_clientes', 
          status: 'error',
          error: {
            message: error.message,
            code: error.code,
            hint: error.hint,
            details: error.details,
          }
        });
      } else {
        diagnostics.tests.push({ 
          name: 'query_clientes', 
          status: 'success',
          count: data?.length || 0
        });
      }
    } catch (error: any) {
      diagnostics.tests.push({ 
        name: 'query_clientes', 
        status: 'exception',
        error: error.message,
        stack: error.stack?.substring(0, 500)
      });
    }

    // Teste 3: Query simples na tabela propostas
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
      
      const { data, error } = await supabase
        .from('propostas')
        .select('id')
        .limit(1);

      if (error) {
        diagnostics.tests.push({ 
          name: 'query_propostas', 
          status: 'error',
          error: {
            message: error.message,
            code: error.code,
            hint: error.hint,
          }
        });
      } else {
        diagnostics.tests.push({ 
          name: 'query_propostas', 
          status: 'success',
          count: data?.length || 0
        });
      }
    } catch (error: any) {
      diagnostics.tests.push({ 
        name: 'query_propostas', 
        status: 'exception',
        error: error.message
      });
    }

    // Teste 4: Verificar se URL está acessível
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
        method: 'GET',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
        },
      });

      diagnostics.tests.push({
        name: 'url_accessibility',
        status: response.ok ? 'success' : 'error',
        statusCode: response.status,
        statusText: response.statusText,
      });
    } catch (error: any) {
      diagnostics.tests.push({
        name: 'url_accessibility',
        status: 'exception',
        error: error.message,
      });
    }

    const allTestsPassed = diagnostics.tests.every((t: any) => t.status === 'success');
    
    return res.status(allTestsPassed ? 200 : 500).json({
      success: allTestsPassed,
      message: allTestsPassed 
        ? '✅ Todos os testes passaram!' 
        : '⚠️ Alguns testes falharam',
      diagnostics,
    });

  } catch (error: any) {
    return res.status(500).json({
      error: 'Erro inesperado no teste',
      message: error.message,
      stack: error.stack,
    });
  }
}

