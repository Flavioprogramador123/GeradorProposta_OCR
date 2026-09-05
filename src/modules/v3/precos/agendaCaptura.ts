import fs from 'fs';
import path from 'path';
import { getV3DataDir } from '../db/paths';
import type { CapturaFonte } from './capturaJob';

export type DiaSemana = 1 | 2 | 3 | 4 | 5 | 6 | 0; // 1=seg … 5=sex (Date.getDay())

export interface CapturaAgenda {
  enabled: boolean;
  /** Horário local America/Sao_Paulo HH:mm */
  hora: string;
  /** Dias: 1=seg … 5=sex */
  dias: number[];
  fonte: CapturaFonte;
  headless: boolean;
  timezone: string;
  updatedAt?: string;
  lastRunAt?: string;
  lastRunOk?: boolean;
  lastRunMsg?: string;
}

export const CAPTURA_AGENDA_DEFAULT: CapturaAgenda = {
  enabled: false,
  hora: '07:30',
  dias: [1, 2, 3, 4, 5], // seg–sex
  fonte: 'scrape',
  headless: true,
  timezone: 'America/Sao_Paulo',
};

function agendaPath() {
  return path.join(getV3DataDir(), 'captura-agenda.json');
}

export function getAgendaPath() {
  return agendaPath();
}

export function loadCapturaAgenda(): CapturaAgenda {
  try {
    const file = agendaPath();
    if (!fs.existsSync(file)) return { ...CAPTURA_AGENDA_DEFAULT };
    const raw = JSON.parse(fs.readFileSync(file, 'utf8')) as Partial<CapturaAgenda>;
    const hora = String(raw.hora || CAPTURA_AGENDA_DEFAULT.hora);
    const dias = Array.isArray(raw.dias)
      ? raw.dias.map(Number).filter((d) => d >= 0 && d <= 6)
      : [...CAPTURA_AGENDA_DEFAULT.dias];
    const fonte = (['temp', 'scrape', 'both'].includes(String(raw.fonte))
      ? raw.fonte
      : 'scrape') as CapturaFonte;
    return {
      ...CAPTURA_AGENDA_DEFAULT,
      ...raw,
      hora: /^\d{2}:\d{2}$/.test(hora) ? hora : CAPTURA_AGENDA_DEFAULT.hora,
      dias: dias.length ? dias : [...CAPTURA_AGENDA_DEFAULT.dias],
      fonte,
      headless: raw.headless !== false,
      enabled: Boolean(raw.enabled),
    };
  } catch {
    return { ...CAPTURA_AGENDA_DEFAULT };
  }
}

export function saveCapturaAgenda(partial: Partial<CapturaAgenda>): CapturaAgenda {
  const current = loadCapturaAgenda();
  const next: CapturaAgenda = {
    ...current,
    ...partial,
    updatedAt: new Date().toISOString(),
  };
  if (partial.hora != null && !/^\d{2}:\d{2}$/.test(String(partial.hora))) {
    next.hora = current.hora;
  }
  if (partial.dias != null) {
    next.dias = (partial.dias as number[]).map(Number).filter((d) => d >= 0 && d <= 6);
    if (!next.dias.length) next.dias = [...CAPTURA_AGENDA_DEFAULT.dias];
  }
  const file = agendaPath();
  const dir = path.dirname(file);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(file, JSON.stringify(next, null, 2), 'utf8');
  return next;
}

/** Próxima execução aproximada (local) a partir de agora */
export function proximaExecucao(agenda: CapturaAgenda, now = new Date()): Date | null {
  if (!agenda.enabled) return null;
  const [hh, mm] = agenda.hora.split(':').map(Number);
  for (let add = 0; add < 14; add++) {
    const d = new Date(now);
    d.setDate(d.getDate() + add);
    d.setHours(hh, mm, 0, 0);
    if (d.getTime() <= now.getTime()) continue;
    if (!agenda.dias.includes(d.getDay())) continue;
    return d;
  }
  return null;
}

export const DIAS_LABEL: Record<number, string> = {
  0: 'Dom',
  1: 'Seg',
  2: 'Ter',
  3: 'Qua',
  4: 'Qui',
  5: 'Sex',
  6: 'Sáb',
};
