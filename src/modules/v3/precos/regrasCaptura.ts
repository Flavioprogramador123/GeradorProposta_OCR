/**
 * Regras de captura V3 — whitelist + estoque por categoria.
 *
 * Principal (ativo=1): módulos; inversores ≤30 kW; estruturas inox/trilhos;
 * cabos 25/50/100 m; MC4; DPS.
 * Demais → consulta (ativo=0 + rejeitados).
 * Premissas de estoque: /admin/configuracoes
 */
import type { EquipamentoCategoria } from '../equipamentos/types';
import { getEstoqueMinimos } from './estoqueMinimosConfig';

/** Defaults legados — valores vivos vêm de getEstoqueMinimos() / config admin */
export const ESTOQUE_MIN_MODULO = 20;
export const ESTOQUE_MIN_OUTROS = 5;
export const INVERSOR_KW_MAX = 30;

export function getEstoqueMinimoPorCategoria(categoria?: string | null): number {
  const mins = getEstoqueMinimos();
  if ((categoria || '').toLowerCase() === 'modulo') return mins.modulo;
  return mins.outros;
}

function parseKwDoNome(nome: string): number | null {
  const m = nome.match(/(\d+[.,]?\d*)\s*K(?:W)?\b/i);
  if (!m) return null;
  const n = Number(m[1].replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

/** Itens que entram na lista principal de equipamentos. */
export function ehEquipamentoPrincipal(opts: {
  nome: string;
  categoria: EquipamentoCategoria;
  potencia_kw?: number | null;
}): boolean {
  const u = opts.nome.toUpperCase();
  const cat = opts.categoria;

  if (cat === 'modulo') return true;

  if (cat === 'inversor' || cat === 'microinversor') {
    const kw = opts.potencia_kw ?? parseKwDoNome(opts.nome);
    if (kw != null && kw > INVERSOR_KW_MAX) return false;
    return true;
  }

  if (cat === 'estrutura') {
    // Trilhos / perfis de fixação + kits inox — parafuso solto e galvanizada ficam em consulta
    if (/TRILHO/i.test(u)) return true;
    if (
      /PERFIL/i.test(u) &&
      /FIXA|MODULO|M[OÓ]DULO/i.test(u) &&
      !/JUN[CÇ][AÃ]O/i.test(u)
    ) {
      return true;
    }
    if (/INOX/i.test(u) && /KIT|ESTRUTURA|GRAMPO|SUPORTE|FIXA/i.test(u)) return true;
    return false;
  }

  if (cat === 'cabo') {
    // Somente cabo solar 25 / 50 / 100 m
    if (!/CABO\s*SOLAR/i.test(u)) return false;
    return /(?:^|[^0-9])(25|50|100)\s*(?:MT|MTS|METROS?|M\b)/i.test(opts.nome);
  }

  if (cat === 'conector') {
    return /\bMC4\b/i.test(u);
  }

  if (cat === 'protecao') {
    // DPS de proteção solar/quadro — não filtro de linha doméstico
    if (!/\bDPS\b/i.test(u)) return false;
    if (/FILTRO\s*DE\s*LINHA|TOMADA|CARREGADOR/i.test(u)) return false;
    return true;
  }

  return false;
}
