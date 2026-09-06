/**
 * Carrega DC/AC de /admin/configuracoes (só server — usa fs/Supabase).
 * Não importar em páginas client; use só em API/jobs.
 */
import fs from 'fs';
import path from 'path';
import { loadSistemaConfigFlat } from '@/lib/sistemaConfig';
import { mergeConfiguracoes } from '@/utils/configuracoes';
import {
  getDcAcLimits,
  sanitizeDcAcLimits,
  setDcAcLimitsOverride,
  type DcAcLimits,
} from './dcAcRatio';

function fromConfig(raw: Record<string, unknown> | null | undefined): DcAcLimits {
  const c = mergeConfiguracoes(raw);
  return sanitizeDcAcLimits(Number(c.dcAcMin), Number(c.dcAcMax), Number(c.dcAcTolPp));
}

function readLocalFile(): DcAcLimits | null {
  try {
    const p = path.join(process.cwd(), 'src/data/sistema/configuracoes.json');
    if (!fs.existsSync(p)) return null;
    return fromConfig(JSON.parse(fs.readFileSync(p, 'utf8')));
  } catch {
    return null;
  }
}

/** Sync a partir do JSON local (dev) se ainda não houver override. */
export function hydrateDcAcLimitsFromLocalFile(): DcAcLimits {
  const local = readLocalFile();
  if (local) setDcAcLimitsOverride(local);
  return getDcAcLimits();
}

/** Preferir no início de jobs/API (Supabase → arquivo). */
export async function refreshDcAcLimitsFromAdmin(): Promise<DcAcLimits> {
  try {
    const flat = await loadSistemaConfigFlat();
    const v = fromConfig(flat);
    setDcAcLimitsOverride(v);
    return v;
  } catch {
    return hydrateDcAcLimitsFromLocalFile();
  }
}
