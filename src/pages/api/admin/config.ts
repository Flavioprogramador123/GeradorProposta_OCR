import { NextApiRequest, NextApiResponse } from 'next';
import { promises as fs } from 'fs';
import path from 'path';
import { supabase } from '@/lib/supabase';

const CONFIG_FILE_PATH = path.join(process.cwd(), 'src/data/sistema/configuracoes.json');
const SERVERLESS_FILE_PATH = path.join('/tmp', 'configuracoes.json');
const CONFIG_KEY = 'sistema_config';

async function readConfigFromFile() {
  try {
    const configData = await fs.readFile(CONFIG_FILE_PATH, 'utf8');
    return JSON.parse(configData);
  } catch {
    try {
      const fallbackData = await fs.readFile(SERVERLESS_FILE_PATH, 'utf8');
      return JSON.parse(fallbackData);
    } catch {
      return {};
    }
  }
}

async function saveConfigToFile(config: Record<string, any>) {
  const targetPath = process.env.VERCEL || process.env.NETLIFY ? SERVERLESS_FILE_PATH : CONFIG_FILE_PATH;
  const targetDir = path.dirname(targetPath);
  await fs.mkdir(targetDir, { recursive: true });
  await fs.writeFile(targetPath, JSON.stringify(config, null, 2), 'utf8');
}

async function readConfigFromSupabase() {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('configuracoes')
    .select('valor')
    .eq('chave', CONFIG_KEY)
    .maybeSingle();

  if (error) {
    console.error('Erro ao ler configuração no Supabase:', error);
    return null;
  }

  return data?.valor || null;
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
    const { data, error } = await supabase
      .from('configuracoes')
      .upsert({
        chave: CONFIG_KEY,
        valor: config,
        descricao: 'Configurações globais do sistema',
        updated_at: new Date().toISOString()
      }, { onConflict: 'chave' })
      .select();

    if (error) {
      console.error('❌ Erro ao salvar configuração no Supabase:', error);
      return { success: false, error: error.message, details: error };
    }

    console.log('✅ Configuração salva no Supabase com sucesso');
    return { success: true, data };
  } catch (err) {
    console.error('❌ Erro inesperado ao salvar no Supabase:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Erro desconhecido' };
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const supabaseConfig = await readConfigFromSupabase();
      if (supabaseConfig) {
        return res.status(200).json(supabaseConfig);
      }

      const fileConfig = await readConfigFromFile();
      return res.status(200).json(fileConfig);
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
          error: 'Body deve ser um objeto JSON válido'
        });
      }

      const configWithMetadata = {
        ...config,
        metadata: {
          lastUpdate: new Date().toISOString(),
          version: config?.metadata?.version || '2.0'
        }
      };

      console.log('💾 Tentando salvar configuração...');
      const supabaseResult = await saveConfigToSupabase(configWithMetadata);
      const isProduction = process.env.VERCEL || process.env.NETLIFY;
      const shouldFallbackToFile = !supabaseResult.success && !isProduction;

      if (supabaseResult.success) {
        return res.status(200).json({ 
          message: 'Configuração salva com sucesso no Supabase!',
          source: 'supabase'
        });
      }

      if (shouldFallbackToFile) {
        try {
          await saveConfigToFile(configWithMetadata);
          return res.status(200).json({ 
            message: 'Configuração salva localmente (modo desenvolvimento).',
            source: 'filesystem',
            warning: 'Supabase não disponível, usando fallback local'
          });
        } catch (fileError) {
          console.error('❌ Erro ao salvar no filesystem:', fileError);
          return res.status(500).json({ 
            message: 'Erro ao salvar configuração no filesystem',
            error: fileError instanceof Error ? fileError.message : 'Erro desconhecido',
            supabaseError: supabaseResult.error
          });
        }
      }

      // Em produção, tentar fallback para arquivo temporário se Supabase falhar
      if (isProduction) {
        try {
          console.log('⚠️ Supabase falhou, tentando salvar em arquivo temporário...');
          await saveConfigToFile(configWithMetadata);
          return res.status(200).json({ 
            message: 'Configuração salva em arquivo temporário (Supabase não disponível).',
            source: 'filesystem-temp',
            warning: 'A tabela "configuracoes" não existe no Supabase. Execute o script criar_tabela_configuracoes.sql',
            error: supabaseResult.error,
            debug: {
              hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
              hasSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
              isProduction,
              supabaseClientAvailable: !!supabase,
              tableError: supabaseResult.error?.includes('table') ? 'Tabela configuracoes não encontrada' : 'Outro erro'
            }
          });
        } catch (fileError) {
          console.error('❌ Erro ao salvar no filesystem temporário:', fileError);
        }
      }

      // Se chegou aqui, não foi possível salvar
      return res.status(500).json({ 
        message: 'Não foi possível salvar configuração. A tabela "configuracoes" não existe no Supabase.',
        error: supabaseResult.error,
        solution: 'Execute o script criar_tabela_configuracoes.sql no Supabase Dashboard',
        debug: {
          hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
          hasSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          isProduction,
          supabaseClientAvailable: !!supabase,
          tableError: supabaseResult.error?.includes('table') ? 'Tabela configuracoes não encontrada' : 'Outro erro'
        }
      });
    } catch (error) {
      console.error('❌ Erro ao salvar configuração:', error);
      return res.status(500).json({ 
        message: 'Erro ao salvar configuração',
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        stack: error instanceof Error ? error.stack : undefined
      });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}