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
  if (!supabase) return false;

  const { error } = await supabase
    .from('configuracoes')
    .upsert({
      chave: CONFIG_KEY,
      valor: config,
      descricao: 'Configurações globais do sistema',
      updated_at: new Date().toISOString()
    }, { onConflict: 'chave' });

  if (error) {
    console.error('Erro ao salvar configuração no Supabase:', error);
    return false;
  }

  return true;
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
      const configWithMetadata = {
        ...config,
        metadata: {
          lastUpdate: new Date().toISOString(),
          version: config?.metadata?.version || '2.0'
        }
      };

      const savedToSupabase = await saveConfigToSupabase(configWithMetadata);
      const shouldFallbackToFile = !savedToSupabase && !(process.env.VERCEL || process.env.NETLIFY);

      if (savedToSupabase) {
        return res.status(200).json({ message: 'Configuração salva com sucesso no Supabase!' });
      }

      if (shouldFallbackToFile) {
        await saveConfigToFile(configWithMetadata);
        return res.status(200).json({ message: 'Configuração salva localmente (modo desenvolvimento).' });
      }

      return res.status(500).json({ message: 'Não foi possível salvar configuração. Configure o Supabase.' });
    } catch (error) {
      console.error('Erro ao salvar configuração:', error);
      res.status(500).json({ message: 'Erro ao salvar configuração' });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}