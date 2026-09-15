/**
 * Potência mínima de catálogo V3 — fonte: /admin/configuracoes
 * (exclui Enphase ~0,475 kW e módulos ~415/425 W que o usuário não quer no auto)
 */
import fs from 'fs';
import path from 'path';
import { loadSistemaConfigFlat } from '@/lib/sistemaConfig';
import { mergeConfiguracoes } from '@/utils/configuracoes';

export type PotenciaMinimos = {
  /** Módulo: Wp mínimo (ex.: 500 exclui 415/425) */
  moduloW: number;
  /** Inversor/micro: kW mínimo (ex.: 1 exclui Enphase 0,475) */
  inversorKw: number;
};

const DEFAULTS: PotenciaMinimos = { moduloW: 500, inversorKw: 1 };

let cache: (PotenciaMinimos & { at: number }) | null = null;

function fromConfig(raw: Record<string, unknown> | null | undefined): PotenciaMinimos {
  const c = mergeConfiguracoes(raw);
  const moduloW = Number(c.moduloPotenciaMinW);
  const inversorKw = Number(c.inversorPotenciaMinKw);
  return {
    moduloW: Number.isFinite(moduloW) && moduloW >= 0 ? moduloW : DEFAULTS.moduloW,
    inversorKw: Number.isFinite(inversorKw) && inversorKw >= 0 ? inversorKw : DEFAULTS.inversorKw,
  };
}

function readLocalFile(): PotenciaMinimos | null {
  try {
    const p = path.join(process.cwd(), 'src/data/sistema/configuracoes.json');
    if (!fs.existsSync(p)) return null;
    return fromConfig(JSON.parse(fs.readFileSync(p, 'utf8')));
  } catch {
    return null;
  }
}

export function getPotenciaMinimos(): PotenciaMinimos {
  if (cache && Date.now() - cache.at < 60_000) {
    return { moduloW: cache.moduloW, inversorKw: cache.inversorKw };
  }
  const local = readLocalFile();
  const v = local || DEFAULTS;
  cache = { ...v, at: Date.now() };
  return v;
}

export async function refreshPotenciaMinimosFromAdmin(): Promise<PotenciaMinimos> {
  try {
    const flat = await loadSistemaConfigFlat();
    const v = fromConfig(flat);
    cache = { ...v, at: Date.now() };
    return v;
  } catch {
    return getPotenciaMinimos();
  }
}

export function setPotenciaMinimosOverride(v: PotenciaMinimos) {
  cache = { ...v, at: Date.now() };
}
