import { NextApiRequest, NextApiResponse } from 'next';

/**
 * API para validar qual ambiente está rodando
 * Útil para garantir que está usando DEV e não PROD
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const vercelEnv = process.env.VERCEL_ENV;
    const vercelUrl = process.env.VERCEL_URL;
    const nodeEnv = process.env.NODE_ENV;

    // Detectar ambiente
    const isProd = vercelEnv === 'production' || vercelUrl?.includes('pieng-propostas.vercel.app');
    const isDev = vercelEnv === 'preview' || vercelUrl?.includes('pieng-propostas-dev.vercel.app');
    const isLocal = !vercelEnv;

    // Detectar qual Supabase está conectado
    const supabaseProject = supabaseUrl?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] || 'unknown';
    const isSupabaseProd = supabaseProject === 'asmvbrcxzvfvvolnalxw';
    const isSupabaseDev = supabaseProject !== 'asmvbrcxzvfvvolnalxw' && supabaseProject !== 'unknown';

    // Verificar se configuração é segura
    const configSegura = (isDev && isSupabaseDev) || (isProd && isSupabaseProd) || isLocal;

    // Detectar problemas de configuração
    const warnings = [];
    const errors = [];

    if (isProd && isSupabaseDev) {
      errors.push('🚨 ERRO CRÍTICO: Produção conectada ao Supabase DEV!');
    }

    if (isDev && isSupabaseProd) {
      errors.push('⚠️ AVISO: Desenvolvimento conectado ao Supabase PRODUÇÃO!');
    }

    if (!supabaseUrl || !supabaseKey) {
      warnings.push('⚠️ Supabase não configurado - Sistema em modo fallback');
    }

    if (isLocal && isSupabaseProd) {
      warnings.push('💡 Local conectado à PRODUÇÃO - Use Supabase DEV para testes');
    }

    // Montar resposta
    const response = {
      status: configSegura ? 'ok' : 'warning',
      ambiente: {
        tipo: isLocal ? 'local' : isProd ? 'production' : isDev ? 'development' : 'unknown',
        vercel: {
          env: vercelEnv || 'local',
          url: vercelUrl || 'localhost',
          isProd,
          isDev,
          isLocal
        },
        node: {
          env: nodeEnv
        }
      },
      supabase: {
        url: supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : 'não configurado',
        project: supabaseProject,
        isProd: isSupabaseProd,
        isDev: isSupabaseDev,
        configured: !!supabaseUrl && !!supabaseKey
      },
      seguranca: {
        configSegura,
        errors,
        warnings
      },
      recomendacao: getRecomendacao(isLocal, isProd, isDev, isSupabaseProd, isSupabaseDev)
    };

    // Retornar com status apropriado
    if (errors.length > 0) {
      return res.status(500).json(response);
    }

    return res.status(200).json(response);

  } catch (error) {
    console.error('Erro ao validar ambiente:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Erro ao validar ambiente',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

function getRecomendacao(
  isLocal: boolean,
  isProd: boolean,
  isDev: boolean,
  isSupabaseProd: boolean,
  isSupabaseDev: boolean
): string {
  if (isLocal && isSupabaseProd) {
    return '💡 Para desenvolvimento local, use Supabase DEV. Configure no .env.local';
  }

  if (isDev && isSupabaseProd) {
    return '⚠️ Vercel DEV não deveria usar Supabase PROD! Corrija as Environment Variables';
  }

  if (isProd && isSupabaseDev) {
    return '🚨 CRÍTICO: Produção não pode usar Supabase DEV! Corrija IMEDIATAMENTE';
  }

  if (isLocal && isSupabaseDev) {
    return '✅ Configuração ideal para desenvolvimento local';
  }

  if (isDev && isSupabaseDev) {
    return '✅ Configuração ideal para ambiente de desenvolvimento';
  }

  if (isProd && isSupabaseProd) {
    return '✅ Configuração correta para produção';
  }

  return 'ℹ️ Configure o Supabase para usar o sistema';
}
