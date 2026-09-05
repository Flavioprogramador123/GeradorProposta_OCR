import { NextApiRequest, NextApiResponse } from 'next';
import { promises as fs } from 'fs';
import path from 'path';
import { supabase } from '@/lib/supabase';
import { loadSistemaConfigFlat } from '@/lib/sistemaConfig';

const CONFIG_FILE_PATH = path.join(process.cwd(), 'src/data/sistema/configuracoes.json');
const SERVERLESS_FILE_PATH = path.join('/tmp', 'configuracoes.json');

async function saveConfigToFile(config: Record<string, any>) {
  const targetPath = process.env.VERCEL || process.env.NETLIFY ? SERVERLESS_FILE_PATH : CONFIG_FILE_PATH;
  const targetDir = path.dirname(targetPath);
  await fs.mkdir(targetDir, { recursive: true });
  await fs.writeFile(targetPath, JSON.stringify(config, null, 2), 'utf8');
}

async function saveConfigToSupabase(config: Record<string, any>) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabase) {
    console.warn('⚠️ Supabase client não disponível');
    return { success: false, error: 'Supabase não configurado' };
  }

  if (!supabaseUrl || !supabaseKey) {
    console.warn('⚠️ Variáveis Supabase não configuradas');
    return { success: false, error: 'Variáveis Supabase não configuradas' };
  }

  try {
    const updates = Object.entries(config).map(([chave, valor]) => ({
      chave,
      valor: JSON.stringify(valor),
      updated_at: new Date().toISOString(),
    }));

    console.log(`💾 Salvando ${updates.length} configurações no Supabase...`);

    const { data, error } = await supabase
      .from('configuracoes')
      .upsert(updates, { onConflict: 'chave' })
      .select();

    if (error) {
      console.error('❌ Erro ao salvar configurações no Supabase:', error);
      return { success: false, error: error.message, details: error };
    }

    console.log(`✅ ${updates.length} configurações salvas no Supabase com sucesso`);
    return { success: true, data };
  } catch (err) {
    console.error('❌ Erro inesperado ao salvar no Supabase:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Erro desconhecido' };
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const config = await loadSistemaConfigFlat();
      return res.status(200).json(config);
    } catch (error) {
      console.error('Erro ao carregar configuração:', error);
      return res.status(500).json({ message: 'Erro ao carregar configuração' });
    }
  } else if (req.method === 'POST') {
    try {
      const config = req.body;

      if (!config || typeof config !== 'object') {
        return res.status(400).json({
          message: 'Dados de configuração inválidos',
          error: 'Body deve ser um objeto JSON válido',
        });
      }

      // Não regravar blob legado (ainda tinha HSP 5.3 / GO 5.3)
      const { sistema_config: _legado, ...configLimpo } = config as Record<string, unknown>;

      const configWithMetadata = {
        ...configLimpo,
        metadata: {
          lastUpdate: new Date().toISOString(),
          version: (config as { metadata?: { version?: string } })?.metadata?.version || '2.0',
        },
      };

      console.log('💾 Tentando salvar configuração...');
      const supabaseResult = await saveConfigToSupabase(configWithMetadata);
      const isProduction = process.env.VERCEL || process.env.NETLIFY;
      const shouldFallbackToFile = !supabaseResult.success && !isProduction;

      if (supabaseResult.success) {
        // Em local, espelha no JSON para o V3 (captura/SQLite) ler sync
        if (!isProduction) {
          try {
            await saveConfigToFile(configWithMetadata);
          } catch (e) {
            console.warn('⚠️ Supabase ok, mas falhou espelho local:', e);
          }
        }
        return res.status(200).json({
          message: 'Configuração salva com sucesso no Supabase!',
          source: 'supabase',
        });
      }

      if (shouldFallbackToFile) {
        try {
          await saveConfigToFile(configWithMetadata);
          return res.status(200).json({
            message: 'Configuração salva localmente (modo desenvolvimento).',
            source: 'filesystem',
            warning: 'Supabase não disponível, usando fallback local',
          });
        } catch (fileError) {
          console.error('❌ Erro ao salvar no filesystem:', fileError);
          return res.status(500).json({
            message: 'Erro ao salvar configuração no filesystem',
            error: fileError instanceof Error ? fileError.message : 'Erro desconhecido',
            supabaseError: supabaseResult.error,
          });
        }
      }

      if (isProduction) {
        try {
          console.log('⚠️ Supabase falhou, tentando salvar em arquivo temporário...');
          await saveConfigToFile(configWithMetadata);
          return res.status(200).json({
            message: 'Configuração salva em arquivo temporário (Supabase não disponível).',
            source: 'filesystem-temp',
            warning:
              'A tabela "configuracoes" não existe no Supabase. Execute o script criar_tabela_configuracoes.sql',
            error: supabaseResult.error,
            debug: {
              hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
              hasSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
              isProduction,
              supabaseClientAvailable: !!supabase,
              tableError: supabaseResult.error?.includes('table')
                ? 'Tabela configuracoes não encontrada'
                : 'Outro erro',
            },
          });
        } catch (fileError) {
          console.error('❌ Erro ao salvar no filesystem temporário:', fileError);
        }
      }

      return res.status(500).json({
        message: 'Não foi possível salvar configuração. A tabela "configuracoes" não existe no Supabase.',
        error: supabaseResult.error,
        solution: 'Execute o script criar_tabela_configuracoes.sql no Supabase Dashboard',
        debug: {
          hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
          hasSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          isProduction,
          supabaseClientAvailable: !!supabase,
          tableError: supabaseResult.error?.includes('table')
            ? 'Tabela configuracoes não encontrada'
            : 'Outro erro',
        },
      });
    } catch (error) {
      console.error('❌ Erro ao salvar configuração:', error);
      return res.status(500).json({
        message: 'Erro ao salvar configuração',
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        stack: error instanceof Error ? error.stack : undefined,
      });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}
