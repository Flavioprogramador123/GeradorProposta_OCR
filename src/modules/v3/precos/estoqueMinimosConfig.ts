/**
 * Premissas de estoque V3 — fonte: /admin/configuracoes
 * (estoqueMinimoSoolar = módulos, estoqueMinimoOutros = demais)
 */
import fs from 'fs';
import path from 'path';
import { loadSistemaConfigFlat } from '@/lib/sistemaConfig';
import { mergeConfiguracoes } from '@/utils/configuracoes';

export type EstoqueMinimos = { modulo: number; outros: number };

const DEFAULTS: EstoqueMinimos = { modulo: 20, outros: 5 };

let cache: (EstoqueMinimos & { at: number }) | null = null;

function fromConfig(raw: Record<string, unknown> | null | undefined): EstoqueMinimos {
  const c = mergeConfiguracoes(raw);
  const modulo = Number(c.estoqueMinimoSoolar);
  const outros = Number(c.estoqueMinimoOutros);
  return {
    modulo: Number.isFinite(modulo) ? modulo : DEFAULTS.modulo,
    outros: Number.isFinite(outros) ? outros : DEFAULTS.outros,
  };
}

function readLocalFile(): EstoqueMinimos | null {
  try {
    const p = path.join(process.cwd(), 'src/data/sistema/configuracoes.json');
    if (!fs.existsSync(p)) return null;
    return fromConfig(JSON.parse(fs.readFileSync(p, 'utf8')));
  } catch {
    return null;
  }
}

/** Sync — usa cache ou arquivo local (dev). */
export function getEstoqueMinimos(): EstoqueMinimos {
  if (cache && Date.now() - cache.at < 60_000) {
    return { modulo: cache.modulo, outros: cache.outros };
  }
  const local = readLocalFile();
  const v = local || DEFAULTS;
  cache = { ...v, at: Date.now() };
  return v;
}

/** Preferir no início de jobs/API (Supabase → arquivo). */
export async function refreshEstoqueMinimosFromAdmin(): Promise<EstoqueMinimos> {
  try {
    const flat = await loadSistemaConfigFlat();
    const v = fromConfig(flat);
    cache = { ...v, at: Date.now() };
    return v;
  } catch {
    return getEstoqueMinimos();
  }
}

export function setEstoqueMinimosOverride(v: EstoqueMinimos) {
  cache = { ...v, at: Date.now() };
}
