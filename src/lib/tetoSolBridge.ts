/**
 * Ponte leve Gerador PIENG → Teto_sol (produtos separados).
 * Espelha ModuleSpec + Etiqueta de Teto_sol/src/types.ts — sem acoplar o app Vite.
 *
 * Entrega: JSON + postMessage ao abrir o Teto (localhost:5173 ou URL configurada).
 */
import catalogJson from '@/data/tetoModuleCatalog.json';

export const PIENG_TETO_BRIDGE_TYPE = 'PIENG_TETO_BRIDGE' as const;
export const PIENG_TETO_BRIDGE_VERSION = 1;

/** Compatível com Teto_sol ModuleSpec */
export interface TetoModuleSpec {
  brand: string;
  model: string;
  power_w: number;
  width_m: number;
  height_m: number;
  thickness_m: number;
  gap_m: number;
  quantity_target: number;
  rotation_allowed: boolean;
}

/** Compatível com Teto_sol Etiqueta (campos de cliente) */
export interface TetoEtiquetaBridge {
  titulo?: string;
  cliente?: string | null;
  endereco?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  data?: string | null;
  responsavel?: string | null;
}

export interface PiengTetoBridgePayload {
  version: number;
  source: 'pieng-gerador';
  created_at: string;
  module: TetoModuleSpec;
  etiqueta: TetoEtiquetaBridge;
  /** slug / id opcional só para rastreio */
  ref?: string | null;
}

export interface PiengTetoBridgeMessage {
  type: typeof PIENG_TETO_BRIDGE_TYPE;
  version: number;
  payload: PiengTetoBridgePayload;
}

type CatalogEntry = {
  id: string;
  brand: string;
  model: string;
  power_w: number;
  width_m: number;
  height_m: number;
  thickness_m: number;
  gap_m: number;
};

const CATALOG = (catalogJson as { modules: CatalogEntry[] }).modules;

function nearestCatalog(powerW: number): CatalogEntry {
  const p = Math.max(0, Number(powerW) || 0);
  if (!CATALOG.length) {
    return {
      id: 'fallback',
      brand: 'MODULO',
      model: `${p || 550}W`,
      power_w: p || 550,
      width_m: 2.278,
      height_m: 1.134,
      thickness_m: 0.035,
      gap_m: 0.02,
    };
  }
  let best = CATALOG[0];
  let bestDiff = Math.abs(best.power_w - p);
  for (const m of CATALOG) {
    const d = Math.abs(m.power_w - p);
    if (d < bestDiff) {
      best = m;
      bestDiff = d;
    }
  }
  return best;
}

export function getTetoSolUrl(): string {
  const fromEnv =
    typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_TETO_SOL_URL : undefined;
  return (fromEnv || 'http://localhost:5173').replace(/\/$/, '');
}

export interface BuildTetoBridgeInput {
  marcaModulo?: string;
  potModuloW: number;
  qtdModulos: number;
  /** Dimensões reais se conhecidas; senão catalogo por potência */
  width_m?: number;
  height_m?: number;
  thickness_m?: number;
  gap_m?: number;
  clienteNome?: string;
  cidade?: string;
  bairro?: string;
  endereco?: string;
  responsavel?: string;
  ref?: string;
}

export function buildPiengTetoBridge(input: BuildTetoBridgeInput): PiengTetoBridgePayload {
  const pot = Math.round(Number(input.potModuloW) || 0);
  const cat = nearestCatalog(pot || 550);
  const brand = (input.marcaModulo || cat.brand || 'MODULO').trim() || cat.brand;
  const model = pot > 0 ? `${pot}W` : cat.model;

  const module: TetoModuleSpec = {
    brand,
    model,
    power_w: pot > 0 ? pot : cat.power_w,
    width_m: Number(input.width_m) > 0 ? Number(input.width_m) : cat.width_m,
    height_m: Number(input.height_m) > 0 ? Number(input.height_m) : cat.height_m,
    thickness_m: Number(input.thickness_m) > 0 ? Number(input.thickness_m) : cat.thickness_m,
    gap_m: Number(input.gap_m) >= 0 ? Number(input.gap_m) : cat.gap_m,
    quantity_target: Math.max(1, Math.round(Number(input.qtdModulos) || 1)),
    rotation_allowed: true,
  };

  const today = new Date().toLocaleDateString('pt-BR');

  return {
    version: PIENG_TETO_BRIDGE_VERSION,
    source: 'pieng-gerador',
    created_at: new Date().toISOString(),
    module,
    etiqueta: {
      titulo: 'PROJEÇÃO DE IMPLANTAÇÃO',
      cliente: input.clienteNome?.trim() || null,
      endereco: input.endereco?.trim() || null,
      bairro: input.bairro?.trim() || null,
      cidade: input.cidade?.trim() || null,
      data: today,
      responsavel: input.responsavel?.trim() || null,
    },
    ref: input.ref || null,
  };
}

export function downloadPiengTetoBridgeJson(payload: PiengTetoBridgePayload, filename?: string): void {
  if (typeof window === 'undefined') return;
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safe =
    filename ||
    `pieng-teto-bridge-${(payload.etiqueta.cliente || 'cliente')
      .toString()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9-_]+/g, '-')
      .toLowerCase()}.json`;
  a.href = url;
  a.download = safe.endsWith('.json') ? safe : `${safe}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Abre o Teto_sol e envia o bridge via postMessage (apps em portas/origens diferentes).
 * Também baixa o JSON para import manual.
 */
export function openTetoSolWithBridge(
  payload: PiengTetoBridgePayload,
  options?: { downloadJson?: boolean; url?: string }
): Window | null {
  if (typeof window === 'undefined') return null;

  if (options?.downloadJson !== false) {
    downloadPiengTetoBridgeJson(payload);
  }

  const base = (options?.url || getTetoSolUrl()).replace(/\/$/, '');
  const win = window.open(`${base}/?from=pieng`, '_blank');

  const message: PiengTetoBridgeMessage = {
    type: PIENG_TETO_BRIDGE_TYPE,
    version: PIENG_TETO_BRIDGE_VERSION,
    payload,
  };

  const send = () => {
    try {
      win?.postMessage(message, '*');
    } catch {
      /* popup bloqueado / fechado */
    }
  };
  send();
  window.setTimeout(send, 800);
  window.setTimeout(send, 2000);
  window.setTimeout(send, 4000);

  return win;
}
