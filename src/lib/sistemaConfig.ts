import { promises as fs } from 'fs';
import path from 'path';
import { supabase } from '@/lib/supabase';

const CONFIG_FILE_PATH = path.join(process.cwd(), 'src/data/sistema/configuracoes.json');
const SERVERLESS_FILE_PATH = path.join('/tmp', 'configuracoes.json');

export async function readConfigFromFile(): Promise<Record<string, any>> {
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

export async function readConfigFromSupabase(): Promise<Record<string, any> | null> {
  if (!supabase) return null;

  const { data, error } = await supabase.from('configuracoes').select('chave, valor');

  if (error) {
    console.error('Erro ao ler configurações no Supabase:', error);
    return null;
  }

  if (!data || data.length === 0) {
    console.warn('⚠️ Nenhuma configuração encontrada no Supabase');
    return null;
  }

  const config: Record<string, any> = {};
  data.forEach((item: any) => {
    let valor = item.valor;

    if (typeof valor === 'string') {
      const trimmed = valor.trim();
      try {
        if (
          (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
          (trimmed.startsWith('[') && trimmed.endsWith(']')) ||
          (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
          /^-?\d+(\.\d+)?$/.test(trimmed) ||
          trimmed === 'true' ||
          trimmed === 'false' ||
          trimmed === 'null'
        ) {
          valor = JSON.parse(trimmed);
        }
      } catch {
        // mantém string
      }
    }

    if (typeof valor === 'string' && /^-?\d+(\.\d+)?$/.test(valor.trim())) {
      const n = parseFloat(valor);
      if (Number.isFinite(n)) valor = n;
    }

    config[item.chave] = valor;
  });

  return config;
}

/** Remove blob legado que ainda guarda HSP 5.3 e conflita com o flat. */
function stripLegadoSistemaConfig(config: Record<string, any>): Record<string, any> {
  if (!config || typeof config !== 'object') return config;
  const { sistema_config: _legado, ...rest } = config;
  return rest;
}

/** Carrega config flat.
 * - Produção: Supabase (se houver) → arquivo → {}
 * - Local: merge arquivo por cima do Supabase — o save local (fallback RLS) precisa aparecer no GET
 */
export async function loadSistemaConfigFlat(): Promise<Record<string, any>> {
  const [supabaseConfig, fileConfig] = await Promise.all([
    readConfigFromSupabase(),
    readConfigFromFile(),
  ]);
  const file = fileConfig && typeof fileConfig === 'object' ? fileConfig : {};
  const sb = supabaseConfig && typeof supabaseConfig === 'object' ? supabaseConfig : null;
  const isProduction = Boolean(process.env.VERCEL || process.env.NETLIFY);

  let merged: Record<string, any>;
  if (isProduction) {
    merged = sb && Object.keys(sb).length > 0 ? { ...file, ...sb } : file;
  } else if (sb && Object.keys(sb).length > 0) {
    // Dev: JSON local (última gravação bem-sucedida no disco) prevalece sobre Supabase antigo/incompleto
    merged = { ...sb, ...file };
  } else {
    merged = file;
  }

  return stripLegadoSistemaConfig(merged);
}
