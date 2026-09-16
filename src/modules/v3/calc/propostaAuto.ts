import { getV3Db } from '../db/sqlite';
import {
  getCalcParams,
  geracaoFromKwp,
  kwpFromGeracao,
  precificarCusto,
  fatoresVarianciaAlvo,
  sanitizeVarianciaAlvoPct,
  type CalcParams,
} from './params';
import { calcularOrcamentoBase } from '../orcamentos/kitEngine';
import {
  ajustarQtdModulosAoInversor,
  faixaKwInversorParaKwp,
  getDcAcLimits,
  inversorAdequadoParaKwp,
  isInversorHibrido,
  passaFiltroRede220380,
  ratioDcAc,
} from './dcAcRatio';
import { createOrcamentoBase } from '../orcamentos/repository';
import { precificarComercialV2, resolveComercialConfig, type PrecificacaoComercial } from '../bridge/comercial';
import { buildGeradorBridgePayload, type GeradorBridgePayload } from '../bridge/toGerador';
import type { PropostaConfigInput } from '@/lib/propostaOrcamentoProcessor';
import { getPotenciaMinimos } from '../precos/potenciaMinimosConfig';
import { parsePotenciaKwDoNome, mpptDoEquipamento } from '../precos/parsePotencia';

export type ModoDim = 'geracao_mensal' | 'potencia_kwp' | 'consumo_mensal';

/** Kit escolhido manualmente na 3a (Incluir) */
export interface KitManualInput {
  sku_modulo: string;
  sku_inversor: string;
  qtd_modulos?: number;
  qtd_inversores?: number;
  titulo?: string;
  /** Ponto no range: min | mid | max — default mid */
  alvo?: 'min' | 'mid' | 'max';
}

export interface PropostaAutoInput {
  modo: ModoDim;
  geracao_mensal_kwh?: number;
  /** Faixa de geração (kWh/mês) — preferível ao valor cravado */
  geracao_mensal_min?: number;
  geracao_mensal_max?: number;
  potencia_kwp?: number;
  consumo_mensal_kwh?: number;
  consumo_mensal_min?: number;
  consumo_mensal_max?: number;
  /** CD principal (compat). Preferir `cdIds` multi. */
  cdId: number;
  /** CDs / fornecedores marcados na base (ex.: Feira + Fortlev). */
  cdIds?: number[];
  cliente_nome?: string;
  hsp?: number;
  tarifa?: number;
  performanceRate?: number;
  /** Cap de cards gerados (default 6). Emissão final pode enviar menos. */
  maxAlternativas?: number;
  /** Margem ±% em torno do alvo (default 20; /admin/configuracoes). */
  varianciaAlvoPct?: number;
  salvar?: boolean;
  frete?: number;
  comercial?: PropostaConfigInput;
  /** Kits da 3a — um card por kit (micro + string etc.) */
  kits_manuais?: KitManualInput[];
  /** Se true (default), ainda gera autos além dos manuais até maxAlternativas */
  incluir_auto?: boolean;
  /**
   * Filtro de topologia no auto:
   * - só micro marcado → só micro
   * - só string marcado → só string
   * - nenhum ou ambos → gera os dois
   */
  incluir_micro?: boolean;
  incluir_string?: boolean;
  /**
   * Rede trifásica (mutuamente exclusiva):
   * - true (default): 220/380 V → exclui trifásico 220 (127/220)
   * - false: 127/220 V → exclui trifásico 380
   * Mono e micro passam nos dois modos.
   */
  rede_220_380?: boolean;
}

export interface PassoAuditoria {
  etapa: string;
  formula: string;
  valores: Record<string, number | string | boolean | null>;
  resultado: string;
}

export interface AlternativaProposta {
  titulo: string;
  tipo: 'micro' | 'string';
  sku_modulo: string;
  sku_inversor: string;
  nome_modulo?: string;
  nome_inversor?: string;
  /** Tag de marca do catálogo/scraping (fonte preferida para cards) */
  marca_modulo?: string | null;
  marca_inversor?: string | null;
  potencia_modulo_w?: number;
  potencia_inversor_kw?: number;
  preco_unit_modulo?: number;
  preco_unit_inversor?: number;
  custo_rs_kwp_modulo?: number | null;
  /** PIX ÷ Wp do sistema (métrica portal Fortlev) */
  custo_rs_wp?: number | null;
  qtd_modulos: number;
  qtd_inversores: number;
  potencia_kwp: number;
  geracao_mensal_kwh: number;
  cobertura_pct: number | null;
  custo_total: number;
  precos: ReturnType<typeof precificarCusto>;
  orcamento_itens: ReturnType<typeof calcularOrcamentoBase>['itens'];
  breakdown: Record<string, number>;
  avisos: string[];
  orcamento_base_id?: number;
  auditoria: {
    passos: PassoAuditoria[];
    economia_mensal_estimada: number | null;
  };
  comercial: PrecificacaoComercial;
  frete?: number;
  precos_simplificado_4a?: ReturnType<typeof precificarCusto>;
  origem?: 'manual_3a' | 'auto';
  faixa_alvo_kwh?: number;
  /** true se geração/kWp ficou fora da faixa pedida (após DC/AC) */
  fora_faixa?: boolean;
  /** Desvio percentual vs alvo do card (positivo = acima) */
  desvio_faixa_pct?: number | null;
  /** CD / fornecedor da base de preços deste card */
  cd_id?: number;
  cd_nome?: string;
  fornecedor?: string;
}

type ModRow = {
  id: number;
  sku_interno: string;
  nome: string;
  marca: string | null;
  potencia_w: number;
  preco_custo: number;
  estoque: number | null;
  custo_rs_kwp?: number;
};

type InvRow = {
  id: number;
  sku_interno: string;
  nome: string;
  marca: string | null;
  categoria: string;
  potencia_kw: number;
  /** Entradas MPPT (= placas/micro no dimensionamento). */
  mppt: number;
  preco_custo: number;
  estoque: number | null;
};

/** Preferência na 4a: SAJ → DEye → demais (orçamento aproximado) */
export const INVERSOR_MARCAS_PREFERENCIA = ['SAJ', 'DEYE', 'D-EYE'] as const;

function rankMarcaInversor(marca: string | null | undefined, nome: string | null | undefined): number {
  const blob = `${marca || ''} ${nome || ''}`.toUpperCase();
  for (let i = 0; i < INVERSOR_MARCAS_PREFERENCIA.length; i++) {
    if (blob.includes(INVERSOR_MARCAS_PREFERENCIA[i])) return i;
  }
  return INVERSOR_MARCAS_PREFERENCIA.length;
}

function sortInversoresPreferencia(a: InvRow, b: InvRow): number {
  const ra = rankMarcaInversor(a.marca, a.nome);
  const rb = rankMarcaInversor(b.marca, b.nome);
  if (ra !== rb) return ra - rb;
  return a.potencia_kw - b.potencia_kw;
}

/** Fortlev: menor R$/kW do inversor (preço÷kW), depois mais kW. */
function sortInversoresPorCustoKw(a: InvRow, b: InvRow): number {
  const ca = a.potencia_kw > 0 ? a.preco_custo / a.potencia_kw : 1e12;
  const cb = b.potencia_kw > 0 ? b.preco_custo / b.potencia_kw : 1e12;
  if (Math.abs(ca - cb) > 1) return ca - cb;
  return b.potencia_kw - a.potencia_kw;
}

function rsWpDoSistema(ppix: number, potenciaKwp: number): number | null {
  const wp = potenciaKwp * 1000;
  if (!(ppix > 0) || !(wp > 0)) return null;
  return Math.round((ppix / wp) * 10000) / 10000;
}

function listModulosComPreco(cdId: number): ModRow[] {
  const db = getV3Db();
  const { moduloW: minW } = getPotenciaMinimos();
  const rows = db
    .prepare(
      `SELECT e.id, e.sku_interno, e.nome, e.marca, e.potencia_w, p.preco_custo, p.estoque
       FROM equipamentos e
       JOIN precos_cd p ON p.equipamento_id = e.id AND p.cd_id = ? AND p.valido_estoque = 1
       WHERE e.ativo = 1 AND e.categoria = 'modulo' AND e.potencia_w IS NOT NULL AND e.potencia_w > 0`
    )
    .all(cdId) as ModRow[];

  return rows
    .filter((r) => (r.potencia_w || 0) >= minW)
    .map((r) => ({
      ...r,
      custo_rs_kwp: r.preco_custo / (r.potencia_w / 1000),
    }))
    .sort((a, b) => {
      const d = (a.custo_rs_kwp || 0) - (b.custo_rs_kwp || 0);
      if (Math.abs(d) < 0.5) return b.potencia_w - a.potencia_w;
      return d;
    });
}

function listInversoresComPreco(cdId: number): InvRow[] {
  const db = getV3Db();
  const { inversorKw: minKw } = getPotenciaMinimos();
  const rows = db
    .prepare(
      `SELECT e.id, e.sku_interno, e.nome, e.marca, e.categoria, e.potencia_kw, p.preco_custo, p.estoque
       FROM equipamentos e
       JOIN precos_cd p ON p.equipamento_id = e.id AND p.cd_id = ? AND p.valido_estoque = 1
       WHERE e.ativo = 1 AND e.categoria IN ('inversor','microinversor')`
    )
    .all(cdId) as InvRow[];

  return rows
    .map((r) => {
      const kw =
        r.potencia_kw != null && r.potencia_kw > 0
          ? r.potencia_kw
          : parsePotenciaKwDoNome(r.nome || '', r.sku_interno) || 0;
      const mppt = mpptDoEquipamento(r.nome || '', r.sku_interno) || 0;
      return { ...r, potencia_kw: kw, mppt };
    })
    .filter((r) => r.potencia_kw > 0 && r.potencia_kw >= minKw)
    .sort(sortInversoresPreferencia);
}

function findModulo(cdId: number, sku: string, fallback: ModRow[]): ModRow | null {
  const db = getV3Db();
  const row = db
    .prepare(
      `SELECT e.id, e.sku_interno, e.nome, e.marca, e.potencia_w, p.preco_custo, p.estoque
       FROM equipamentos e
       JOIN precos_cd p ON p.equipamento_id = e.id AND p.cd_id = ? AND p.valido_estoque = 1
       WHERE e.sku_interno = ? AND e.categoria = 'modulo'`
    )
    .get(cdId, sku) as ModRow | undefined;
  if (row) return { ...row, custo_rs_kwp: row.preco_custo / (row.potencia_w / 1000) };
  return fallback.find((m) => m.sku_interno === sku) || null;
}

function findInversor(cdId: number, sku: string, fallback: InvRow[]): InvRow | null {
  const db = getV3Db();
  const row = db
    .prepare(
      `SELECT e.id, e.sku_interno, e.nome, e.marca, e.categoria, e.potencia_kw, p.preco_custo, p.estoque
       FROM equipamentos e
       JOIN precos_cd p ON p.equipamento_id = e.id AND p.cd_id = ? AND p.valido_estoque = 1
       WHERE e.sku_interno = ? AND e.categoria IN ('inversor','microinversor')`
    )
    .get(cdId, sku) as InvRow | undefined;
  if (row) {
    const kw =
      row.potencia_kw != null && row.potencia_kw > 0
        ? row.potencia_kw
        : parsePotenciaKwDoNome(row.nome || '', row.sku_interno) || 0;
    const mppt = mpptDoEquipamento(row.nome || '', row.sku_interno) || 0;
    return { ...row, potencia_kw: kw, mppt };
  }
  return fallback.find((i) => i.sku_interno === sku) || null;
}

function roundUpModulos(n: number, step = 2): number {
  const x = Math.ceil(n);
  return x % step === 0 ? x : x + (step - (x % step));
}

function economiaMensal(geracao: number, consumo: number | null, tarifa: number): number | null {
  if (consumo == null || consumo <= 0) return Math.round(geracao * tarifa * 100) / 100;
  const kwh = Math.min(geracao, consumo);
  return Math.round(kwh * tarifa * 100) / 100;
}

function resolveFaixaAlvo(ponto: 'min' | 'mid' | 'max', min: number, max: number): number {
  if (ponto === 'min') return min;
  if (ponto === 'max') return max;
  return (min + max) / 2;
}

function resolveFaixaAlvoTriplo(
  ponto: 'min' | 'mid' | 'max',
  min: number,
  mid: number,
  max: number
): number {
  if (ponto === 'min') return min;
  if (ponto === 'max') return max;
  return mid;
}

/**
 * Placas por micro = entradas MPPT do modelo (Foxess M1→2, NEP BDM-2500→6),
 * limitado pelo teto DC/AC. Fallback: params.placasPorMicro.
 */
function placasPorMicroEfetivo(mod: ModRow, micro: InvRow, params: CalcParams): number {
  const lim = getDcAcLimits();
  const kwpMod = mod.potencia_w / 1000;
  const mppt =
    micro.mppt > 0
      ? micro.mppt
      : mpptDoEquipamento(micro.nome, micro.sku_interno) || params.placasPorMicro;
  if (kwpMod <= 0 || micro.potencia_kw <= 0) return Math.max(1, mppt);
  const maxPorDcAc = Math.max(1, Math.floor((micro.potencia_kw * lim.teto) / kwpMod + 1e-9));
  return Math.max(1, Math.min(mppt, maxPorDcAc));
}

/** Módulos cuja qtd×Wp chega perto do kWp alvo (diversifica Wp: 585, 600, 680…). */
function modsProximosAoKwp(
  modulos: ModRow[],
  alvoKwp: number,
  kwpMin: number,
  kwpMax: number,
  limit = 6
): ModRow[] {
  const scored = modulos.map((mod) => {
    const wp = mod.potencia_w / 1000;
    if (wp <= 0) return { mod, score: 1e9 };
    let bestDist = 1e9;
    const q0 = Math.max(4, Math.round(alvoKwp / wp));
    for (let d = -4; d <= 6; d++) {
      const q = q0 + d;
      if (q < 4) continue;
      const pot = q * wp;
      const dist = Math.abs(pot - alvoKwp);
      const penal = pot >= kwpMin - 1e-9 && pot <= kwpMax + 1e-9 ? 0 : 5;
      if (dist + penal < bestDist) bestDist = dist + penal;
    }
    return { mod, score: bestDist };
  });
  scored.sort((a, b) => a.score - b.score || b.mod.potencia_w - a.mod.potencia_w);
  const seenWp = new Set<number>();
  const out: ModRow[] = [];
  for (const s of scored) {
    if (seenWp.has(s.mod.potencia_w)) continue;
    seenWp.add(s.mod.potencia_w);
    out.push(s.mod);
    if (out.length >= limit) break;
  }
  return out.length ? out : modulos.slice(0, limit);
}

/**
 * Micros candidatos para o módulo: prioriza menor R$/Wp conectável
 * (preço_micro ÷ (placas×Wp)), depois mais MPPTs, depois mais kW.
 * Evita escolher Foxess M1 (2 MPPT) quando NEP 6 MPPT é bem mais barato por Wp.
 */
function escolherMicrosParaModulo(
  mod: ModRow,
  micros: InvRow[],
  params: CalcParams,
  limit = 3
): InvRow[] {
  if (!micros.length) return [];
  const lim = getDcAcLimits();
  const kwpMod = mod.potencia_w / 1000;
  const scored = micros.map((m) => {
    const placas = placasPorMicroEfetivo(mod, m, params);
    const ratio = m.potencia_kw > 0 && kwpMod > 0 ? (placas * kwpMod) / m.potencia_kw : 99;
    const ok = ratio <= lim.teto + 0.05;
    const mppt = m.mppt > 0 ? m.mppt : mpptDoEquipamento(m.nome, m.sku_interno) || placas;
    const wattsConect = Math.max(1, placas * mod.potencia_w);
    const rsPorWp = m.preco_custo / wattsConect;
    // score menor = melhor: DC/AC ok → R$/Wp → mais MPPT → mais kW
    const score = (ok ? 0 : 1000) + rsPorWp * 100 - mppt * 0.01 - m.potencia_kw * 0.001;
    return { m, score, ok, rsPorWp, mppt };
  });
  scored.sort((a, b) => a.score - b.score);
  const out: InvRow[] = [];
  const seen = new Set<string>();
  for (const s of scored) {
    if (seen.has(s.m.sku_interno)) continue;
    seen.add(s.m.sku_interno);
    out.push(s.m);
    if (out.length >= limit) break;
  }
  return out;
}

/** @deprecated use escolherMicrosParaModulo */
function escolherMicroParaModulo(mod: ModRow, micros: InvRow[], params: CalcParams): InvRow | null {
  return escolherMicrosParaModulo(mod, micros, params, 1)[0] || null;
}

/** Tolerância dinâmica (±varianciaAlvoPct) ao encaixar kit na faixa pedida. */
function geracaoDentroDaFaixa(
  ger: number,
  min: number,
  max: number,
  varianciaPct: number
): boolean {
  if (min <= 0 && max <= 0) return true;
  const { baixo, alto } = fatoresVarianciaAlvo(varianciaPct);
  const lo = Math.min(min, max) * baixo;
  const hi = Math.max(min, max) * alto;
  return ger >= lo && ger <= hi;
}

function desvioPctVsAlvo(ger: number, alvo: number): number | null {
  if (!alvo || alvo <= 0) return null;
  return Math.round(((ger - alvo) / alvo) * 1000) / 10;
}

function montarAltFromKit(opts: {
  mod: ModRow;
  inv: InvRow;
  qtdMod: number;
  qtdInv: number;
  params: CalcParams;
  consumoRef: number | null;
  cdId: number;
  cdNome?: string;
  fornecedor?: string;
  frete: number;
  comercial?: PropostaConfigInput;
  titulo?: string;
  origem: 'manual_3a' | 'auto';
  faixa_alvo_kwh: number;
  faixaMin?: number;
  faixaMax?: number;
  varianciaAlvoPct?: number;
  /** Quando definido, fora_faixa / desvio usam kWp (modo potência do sistema). */
  alvoKwp?: number;
  faixaKwpMin?: number;
  faixaKwpMax?: number;
  passosExtras?: PassoAuditoria[];
}): AlternativaProposta {
  const { mod, inv, qtdMod, qtdInv, params, consumoRef, cdId } = opts;
  const isMicro = inv.categoria === 'microinversor';
  const pot = (qtdMod * mod.potencia_w) / 1000;
  const ger = geracaoFromKwp(pot, params, isMicro);
  const calc = calcularOrcamentoBase({
    cdId,
    autoComplementos: true,
    itens: [
      { sku_interno: mod.sku_interno, quantidade: qtdMod },
      { sku_interno: inv.sku_interno, quantidade: qtdInv },
    ],
  });
  const isFortlev = (opts.fornecedor || '').toLowerCase() === 'fortlev';
  // Fortlev: frete já vem no preço do portal — não soma fretePadrao de novo
  const freteEfetivo = isFortlev ? 0 : Math.max(0, Number(opts.frete) || 0);
  const precos = precificarCusto(calc.custo_total, params);
  const comercial = precificarComercialV2(calc.custo_total, opts.comercial, freteEfetivo, {
    aplicarDescontoFortlev: isFortlev,
  });
  const cob = consumoRef && consumoRef > 0 ? Math.round((ger / consumoRef) * 100) : null;
  const potencia_kwp = Math.round(pot * 1000) / 1000;
  const custo_rs_wp = rsWpDoSistema(comercial.ppix, potencia_kwp);
  const tituloBase =
    opts.titulo ||
    `${isMicro ? 'Micro' : 'String'} ${inv.marca || ''} ${qtdMod}×${mod.potencia_w}W`.replace(/\s+/g, ' ').trim();
  const prefixoCd = opts.cdNome ? `${opts.fornecedor || opts.cdNome} · ` : '';
  const titulo = `${prefixoCd}${tituloBase}`.replace(/\s+/g, ' ').trim();

  const modoKwp =
    opts.alvoKwp != null &&
    opts.faixaKwpMin != null &&
    opts.faixaKwpMax != null &&
    opts.alvoKwp > 0;

  let fora_faixa: boolean;
  let desvio_faixa_pct: number | null;
  if (modoKwp) {
    const kMin = opts.faixaKwpMin!;
    const kMax = opts.faixaKwpMax!;
    fora_faixa = pot + 1e-9 < kMin || pot - 1e-9 > kMax;
    desvio_faixa_pct = desvioPctVsAlvo(pot, opts.alvoKwp!);
  } else {
    const fMin = opts.faixaMin ?? opts.faixa_alvo_kwh;
    const fMax = opts.faixaMax ?? opts.faixa_alvo_kwh;
    const varPct = sanitizeVarianciaAlvoPct(opts.varianciaAlvoPct ?? params.varianciaAlvoPct);
    fora_faixa = !geracaoDentroDaFaixa(ger, fMin, fMax, varPct);
    desvio_faixa_pct = desvioPctVsAlvo(ger, opts.faixa_alvo_kwh);
  }

  const avisosKit = [...calc.avisos];
  if (fora_faixa) {
    avisosKit.unshift(
      modoKwp
        ? `Fora da faixa de kWp: ${pot.toFixed(2)} kWp (alvo ${opts.alvoKwp!.toFixed(2)}, faixa ${opts.faixaKwpMin!.toFixed(2)}–${opts.faixaKwpMax!.toFixed(2)})`
        : `Fora da faixa pedida: gerou ${Math.round(ger)} kWh (alvo ${Math.round(opts.faixa_alvo_kwh)}, faixa ${Math.round(opts.faixaMin ?? opts.faixa_alvo_kwh)}–${Math.round(opts.faixaMax ?? opts.faixa_alvo_kwh)})`
    );
  }

  const fMinAudit = modoKwp ? opts.faixaKwpMin! : opts.faixaMin ?? opts.faixa_alvo_kwh;
  const fMaxAudit = modoKwp ? opts.faixaKwpMax! : opts.faixaMax ?? opts.faixa_alvo_kwh;

  const passos: PassoAuditoria[] = [
    ...(opts.passosExtras || []),
    {
      etapa: 'Kit montado',
      formula: 'kWp = qtd×Wp/1000 · geração = kWp×HSP×dias×PR[×bonus micro]',
      valores: {
        sku_modulo: mod.sku_interno,
        sku_inversor: inv.sku_interno,
        qtd_modulos: qtdMod,
        qtd_inversores: qtdInv,
        kWp: pot,
        geracao: ger,
        faixa_alvo_kwh: opts.faixa_alvo_kwh,
        faixa_alvo_kwp: opts.alvoKwp ?? null,
        faixa_min: fMinAudit,
        faixa_max: fMaxAudit,
        fora_faixa,
        modo_margem: modoKwp ? 'kwp' : 'kwh',
        bonus_micro: isMicro,
        origem: opts.origem,
        cd_id: cdId,
        cd_nome: opts.cdNome || null,
      },
      resultado: fora_faixa
        ? modoKwp
          ? `${pot.toFixed(2)} kWp FORA ${fMinAudit.toFixed(2)}–${fMaxAudit.toFixed(2)} · PIX ${comercial.ppix}`
          : `${Math.round(ger)} kWh FORA da faixa ${Math.round(fMinAudit)}–${Math.round(fMaxAudit)} · PIX ${comercial.ppix}`
        : `${pot.toFixed(2)} kWp · ${Math.round(ger)} kWh/mês · PIX ${comercial.ppix}`,
    },
  ];

  return {
    titulo,
    tipo: isMicro ? 'micro' : 'string',
    sku_modulo: mod.sku_interno,
    sku_inversor: inv.sku_interno,
    nome_modulo: mod.nome,
    nome_inversor: inv.nome,
    marca_modulo: mod.marca || null,
    marca_inversor: inv.marca || null,
    potencia_modulo_w: mod.potencia_w,
    potencia_inversor_kw: inv.potencia_kw,
    preco_unit_modulo: mod.preco_custo,
    preco_unit_inversor: inv.preco_custo,
    custo_rs_kwp_modulo: Math.round((mod.preco_custo / (mod.potencia_w / 1000)) * 100) / 100,
    qtd_modulos: qtdMod,
    qtd_inversores: qtdInv,
    potencia_kwp,
    custo_rs_wp,
    geracao_mensal_kwh: Math.round(ger),
    cobertura_pct: cob,
    custo_total: calc.custo_total,
    frete: freteEfetivo,
    precos,
    precos_simplificado_4a: precos,
    comercial,
    orcamento_itens: calc.itens,
    breakdown: calc.breakdown,
    avisos: avisosKit,
    origem: opts.origem,
    faixa_alvo_kwh: Math.round(opts.faixa_alvo_kwh),
    fora_faixa,
    desvio_faixa_pct,
    cd_id: cdId,
    cd_nome: opts.cdNome,
    fornecedor: opts.fornecedor,
    auditoria: {
      passos,
      economia_mensal_estimada: economiaMensal(ger, consumoRef, params.tarifa),
    },
  };
}

function resolveInputCdIds(input: PropostaAutoInput): number[] {
  const raw =
    Array.isArray(input.cdIds) && input.cdIds.length > 0
      ? input.cdIds
      : [input.cdId];
  const uniq = Array.from(
    new Set(
      raw
        .map((n) => Number(n))
        .filter((n) => Number.isFinite(n) && n > 0)
    )
  );
  if (!uniq.length) throw new Error('Selecione ao menos um CD / fornecedor');
  return uniq;
}

function metaCd(cdId: number): { nome: string; fornecedor: string } {
  const db = getV3Db();
  const row = db
    .prepare('SELECT nome, slug_portal FROM cds WHERE id = ?')
    .get(cdId) as { nome: string; slug_portal: string } | undefined;
  const nome = row?.nome || `CD ${cdId}`;
  const fornecedor =
    row?.slug_portal === 'fortlev' || /fortlev/i.test(nome) ? 'Fortlev' : 'SOOLLAR';
  return { nome, fornecedor };
}

function chaveAlt(a: AlternativaProposta): string {
  return `${a.cd_id || 0}|${a.tipo}|${a.sku_modulo}|${a.sku_inversor}|${a.qtd_modulos}`;
}

/** Manuais primeiro; autos diversificados por CD e R$/Wp (dentro da faixa). */
function selecionarAlternativasDiversas(
  manuais: AlternativaProposta[],
  autos: AlternativaProposta[],
  maxAlt: number
): AlternativaProposta[] {
  const slotsAuto = Math.max(0, Math.max(maxAlt, manuais.length) - manuais.length);
  const byRsWp = (a: AlternativaProposta, b: AlternativaProposta) => {
    const ra = a.custo_rs_wp ?? (a.comercial.ppix / Math.max(a.potencia_kwp * 1000, 1));
    const rb = b.custo_rs_wp ?? (b.comercial.ppix / Math.max(b.potencia_kwp * 1000, 1));
    return (
      ra - rb ||
      a.comercial.ppix - b.comercial.ppix ||
      Math.abs(a.desvio_faixa_pct ?? 999) - Math.abs(b.desvio_faixa_pct ?? 999)
    );
  };
  // Dentro da faixa: menor R$/Wp (métrica Fortlev/portal), depois PIX, depois desvio
  const dentro = autos.filter((a) => !a.fora_faixa).sort(byRsWp);
  const fora = autos.filter((a) => a.fora_faixa).sort(byRsWp);

  const pool = [...dentro, ...fora];
  const byCd = new Map<number, AlternativaProposta[]>();
  for (const a of pool) {
    const id = a.cd_id || 0;
    if (!byCd.has(id)) byCd.set(id, []);
    byCd.get(id)!.push(a);
  }
  const queues = Array.from(byCd.values());
  const chosen: AlternativaProposta[] = [...manuais];
  const used = new Set(manuais.map(chaveAlt));
  let qi = 0;
  let guard = 0;
  while (chosen.length - manuais.length < slotsAuto && queues.some((q) => q.length) && guard < 500) {
    guard += 1;
    const q = queues[qi % queues.length];
    qi += 1;
    while (q.length) {
      const next = q.shift()!;
      const k = chaveAlt(next);
      if (used.has(k)) continue;
      used.add(k);
      chosen.push(next);
      break;
    }
  }
  return chosen.slice(0, Math.max(maxAlt, manuais.length));
}

/** Dimensiona micro para cair na faixa [geracaoMin, geracaoMax], priorizando alvoGeracao. */
function dimensionarMicro(
  mod: ModRow,
  micro: InvRow,
  params: CalcParams,
  alvoGeracao: number,
  geracaoMin: number,
  geracaoMax: number,
  varianciaPct: number,
  /** Se definido, gira em kWp (modo potência) — sem round-trip geração+bônus micro. */
  optsKwp?: { alvoKwp: number; kwpMin: number; kwpMax: number }
): { qtdMod: number; nMicros: number; pot: number; ger: number } {
  const placas = placasPorMicroEfetivo(mod, micro, params);
  const kwpMod = mod.potencia_w / 1000;

  if (optsKwp && optsKwp.alvoKwp > 0) {
    const { alvoKwp, kwpMin, kwpMax } = optsKwp;
    let qtdMod = Math.max(placas, Math.ceil(alvoKwp / kwpMod - 1e-9));
    qtdMod = Math.ceil(qtdMod / placas) * placas;
    let pot = qtdMod * kwpMod;

    const dist = (p: number) => Math.abs(p - alvoKwp);

    // Sobe se ficou abaixo da faixa
    while (pot + 1e-9 < kwpMin && qtdMod / placas < 40) {
      qtdMod += placas;
      pot = qtdMod * kwpMod;
    }
    // Desce se passou demais do teto, sem piorar vs alvo
    while (pot - 1e-9 > kwpMax && qtdMod - placas >= placas) {
      const next = qtdMod - placas;
      const nextPot = next * kwpMod;
      if (nextPot + 1e-9 < kwpMin && dist(nextPot) >= dist(pot)) break;
      qtdMod = next;
      pot = nextPot;
    }
    // Ajuste fino: se ainda dá para aproximar do alvo com ±1 bloco
    for (const dir of [1, -1] as const) {
      const next = qtdMod + dir * placas;
      if (next < placas || next / placas > 40) continue;
      const nextPot = next * kwpMod;
      if (nextPot + 1e-9 < kwpMin || nextPot - 1e-9 > kwpMax) continue;
      if (dist(nextPot) + 1e-9 < dist(pot)) {
        qtdMod = next;
        pot = nextPot;
      }
    }

    const nMicros = Math.max(1, Math.round(qtdMod / placas));
    const ger = geracaoFromKwp(pot, params, true);
    return { qtdMod, nMicros, pot, ger };
  }

  const { baixo, alto } = fatoresVarianciaAlvo(varianciaPct);
  const kwpPorMicro = kwpMod * placas;
  const alvoKwp = kwpFromGeracao(alvoGeracao, params, true);
  let nMicros = Math.max(1, Math.ceil(alvoKwp / kwpPorMicro));
  let qtdMod = nMicros * placas;
  let pot = qtdMod * kwpMod;
  let ger = geracaoFromKwp(pot, params, true);

  while (ger < alvoGeracao * 0.95 && nMicros < 40) {
    const next = nMicros + 1;
    const nextGer = geracaoFromKwp((next * placas * mod.potencia_w) / 1000, params, true);
    if (nextGer > geracaoMax * alto && ger >= geracaoMin * baixo) break;
    nMicros = next;
    qtdMod = nMicros * placas;
    pot = (qtdMod * mod.potencia_w) / 1000;
    ger = nextGer;
  }

  while (ger > geracaoMax * alto && nMicros > 1) {
    const next = nMicros - 1;
    const nextGer = geracaoFromKwp((next * placas * mod.potencia_w) / 1000, params, true);
    if (nextGer < geracaoMin * baixo && geracaoDentroDaFaixa(ger, geracaoMin, geracaoMax, varianciaPct))
      break;
    nMicros = next;
    qtdMod = nMicros * placas;
    pot = (qtdMod * mod.potencia_w) / 1000;
    ger = nextGer;
  }

  return { qtdMod, nMicros, pot, ger };
}

/**
 * Ordena candidatos de inversor para um kWp alvo (soft → hard → faixa kW → teto → maior).
 * @param porCusto Fortlev: dentro de cada banda, menor R$/kW primeiro.
 */
function listarInversoresParaKwp(
  potKwp: number,
  strings: InvRow[],
  opts?: { porCusto?: boolean }
): InvRow[] {
  if (!strings.length) return [];
  const lim = getDcAcLimits();
  const porCusto = Boolean(opts?.porCusto);
  const ordenados = [...strings].sort(
    porCusto ? sortInversoresPorCustoKw : sortInversoresPreferencia
  );
  const seen = new Set<string>();
  const out: InvRow[] = [];
  const push = (list: InvRow[]) => {
    const ordered = porCusto ? [...list].sort(sortInversoresPorCustoKw) : list;
    for (const i of ordered) {
      if (seen.has(i.sku_interno)) continue;
      seen.add(i.sku_interno);
      out.push(i);
    }
  };
  push(ordenados.filter((i) => inversorAdequadoParaKwp(i.potencia_kw, potKwp, 'soft')));
  push(ordenados.filter((i) => inversorAdequadoParaKwp(i.potencia_kw, potKwp, 'hard')));
  const { minKw, maxKw } = faixaKwInversorParaKwp(potKwp);
  push(ordenados.filter((i) => i.potencia_kw >= minKw && i.potencia_kw <= maxKw));
  push(ordenados.filter((i) => i.potencia_kw >= potKwp / lim.teto));
  push(
    porCusto
      ? [...ordenados].sort(sortInversoresPorCustoKw)
      : [...ordenados].sort((a, b) => b.potencia_kw - a.potencia_kw)
  );
  return out;
}

function escolherInversorParaKwp(
  potKwp: number,
  strings: InvRow[],
  opts?: { porCusto?: boolean }
): InvRow | null {
  return listarInversoresParaKwp(potKwp, strings, opts)[0] || null;
}

/**
 * Dimensiona string: escolhe inversor para o kWp alvo e ajusta módulos
 * DENTRO da faixa DC/AC e da faixa de geração pedida (auditoria indigo).
 */
function dimensionarString(
  mod: ModRow,
  strings: InvRow[],
  params: CalcParams,
  alvoGeracao: number,
  geracaoMin: number,
  geracaoMax: number,
  varianciaPct: number,
  optsKwp?: { alvoKwp: number; kwpMin: number; kwpMax: number },
  optsSel?: { porCusto?: boolean }
): { qtdMod: number; inv: InvRow; pot: number; ger: number; avisos?: string[] } | null {
  const pool = strings.filter((s) => !isInversorHibrido(s));
  const lista = pool.length ? pool : strings;
  if (!lista.length) return null;

  const lim = getDcAcLimits();
  const porCusto = Boolean(optsSel?.porCusto);
  const { baixo, alto } = fatoresVarianciaAlvo(varianciaPct);
  const alvoKwp =
    optsKwp && optsKwp.alvoKwp > 0 ? optsKwp.alvoKwp : kwpFromGeracao(alvoGeracao, params, false);
  const candidatos = listarInversoresParaKwp(alvoKwp, lista, { porCusto });

  type Cand = {
    qtdMod: number;
    inv: InvRow;
    pot: number;
    ger: number;
    avisos: string[];
    score: number;
    custoEst: number;
  };
  let melhorDentro: Cand | null = null;
  let melhorQualquer: Cand | null = null;

  for (const inv of candidatos) {
    const avisosDim: string[] = [];
    const adjBounds = ajustarQtdModulosAoInversor(
      roundUpModulos((alvoKwp * 1000) / mod.potencia_w, 2),
      mod.potencia_w,
      inv.potencia_kw
    );
    let qtdMod = adjBounds.qtdMod;
    if (qtdMod < 4) qtdMod = 4;

    const maxAdj = ajustarQtdModulosAoInversor(120, mod.potencia_w, inv.potencia_kw);
    const minAdj = ajustarQtdModulosAoInversor(2, mod.potencia_w, inv.potencia_kw);
    const maxQtd = maxAdj.qtdMod;
    const minQtd = Math.max(4, minAdj.qtdMod);

    qtdMod = Math.min(maxQtd, Math.max(minQtd, qtdMod));
    let pot = (qtdMod * mod.potencia_w) / 1000;
    let ger = geracaoFromKwp(pot, params, false);

    if (optsKwp && optsKwp.alvoKwp > 0) {
      const { kwpMin, kwpMax } = optsKwp;
      const dist = (p: number) => Math.abs(p - alvoKwp);
      while (pot + 1e-9 < kwpMin && qtdMod + 2 <= maxQtd) {
        qtdMod += 2;
        pot = (qtdMod * mod.potencia_w) / 1000;
      }
      while (pot - 1e-9 > kwpMax && qtdMod - 2 >= minQtd) {
        const next = qtdMod - 2;
        const nextPot = (next * mod.potencia_w) / 1000;
        if (nextPot + 1e-9 < kwpMin && dist(nextPot) >= dist(pot)) break;
        qtdMod = next;
        pot = nextPot;
      }
      for (const dir of [2, -2] as const) {
        const next = qtdMod + dir;
        if (next < minQtd || next > maxQtd) continue;
        const nextPot = (next * mod.potencia_w) / 1000;
        if (nextPot + 1e-9 < kwpMin || nextPot - 1e-9 > kwpMax) continue;
        if (dist(nextPot) + 1e-9 < dist(pot)) {
          qtdMod = next;
          pot = nextPot;
        }
      }
      ger = geracaoFromKwp(pot, params, false);
    } else {
      while (ger < alvoGeracao * 0.98 && qtdMod + 2 <= maxQtd) {
        const next = qtdMod + 2;
        const nextGer = geracaoFromKwp((next * mod.potencia_w) / 1000, params, false);
        if (nextGer > geracaoMax * alto && ger >= geracaoMin * baixo) break;
        qtdMod = next;
        pot = (next * mod.potencia_w) / 1000;
        ger = nextGer;
      }

      while (ger > geracaoMax * alto && qtdMod - 2 >= minQtd) {
        const next = qtdMod - 2;
        const nextGer = geracaoFromKwp((next * mod.potencia_w) / 1000, params, false);
        if (
          nextGer < geracaoMin * baixo &&
          geracaoDentroDaFaixa(ger, geracaoMin, geracaoMax, varianciaPct)
        ) {
          break;
        }
        qtdMod = next;
        pot = (next * mod.potencia_w) / 1000;
        ger = nextGer;
      }
    }

    const r = ratioDcAc(pot, inv.potencia_kw);
    if (r > lim.teto + 0.001 || r < lim.min - 0.001) {
      avisosDim.push(
        `DC/AC ${r.toFixed(2)} fora da faixa ideal (${lim.min}–${lim.teto}) · ${pot.toFixed(2)} kWp / ${inv.potencia_kw} kW`
      );
    }
    if (adjBounds.ajustou) {
      avisosDim.push(`Qtd encaixada na DC/AC do ${inv.potencia_kw} kW (teto ${lim.teto})`);
    }

    const score = optsKwp ? Math.abs(pot - alvoKwp) : Math.abs(ger - alvoGeracao);
    const custoEst = qtdMod * mod.preco_custo + inv.preco_custo;
    const cand: Cand = { qtdMod, inv, pot, ger, avisos: avisosDim, score, custoEst };
    const melhorQue = (cur: Cand | null, novo: Cand) => {
      if (!cur) return true;
      if (porCusto) {
        if (Math.abs(novo.custoEst - cur.custoEst) > 50) return novo.custoEst < cur.custoEst;
        return novo.score < cur.score;
      }
      return novo.score < cur.score;
    };
    if (melhorQue(melhorQualquer, cand)) melhorQualquer = cand;

    const dentroKwp =
      optsKwp &&
      pot + 1e-9 >= optsKwp.kwpMin &&
      pot - 1e-9 <= optsKwp.kwpMax;
    const dentroGer =
      !optsKwp && geracaoDentroDaFaixa(ger, geracaoMin, geracaoMax, varianciaPct);
    if (dentroKwp || dentroGer) {
      if (melhorQue(melhorDentro, cand)) {
        melhorDentro = cand;
        // SOOLLAR: para no 1º encaixe. Fortlev (porCusto): varre todos e fica com o mais barato.
        if (!porCusto) break;
      }
    }
  }

  const best = melhorDentro || melhorQualquer;
  if (!best) return null;
  if (!melhorDentro && melhorQualquer) {
    best.avisos.push(
      optsKwp
        ? `Não coube na faixa ${optsKwp.kwpMin.toFixed(2)}–${optsKwp.kwpMax.toFixed(2)} kWp com DC/AC; melhor esforço ${best.pot.toFixed(2)} kWp`
        : `Não coube na faixa ${Math.round(geracaoMin)}–${Math.round(geracaoMax)} kWh (±${sanitizeVarianciaAlvoPct(varianciaPct)}%) com DC/AC; melhor esforço ${Math.round(best.ger)} kWh`
    );
  }
  return {
    qtdMod: best.qtdMod,
    inv: best.inv,
    pot: best.pot,
    ger: best.ger,
    avisos: best.avisos.length ? best.avisos : undefined,
  };
}

export function montarPropostaAuto(input: PropostaAutoInput): {
  params: CalcParams;
  modo: ModoDim;
  alvoKwp: number;
  alvoKwpMin: number;
  alvoKwpMax: number;
  alvoGeracao: number;
  alvoGeracaoMin: number;
  alvoGeracaoMax: number;
  consumoRef: number | null;
  alternativas: AlternativaProposta[];
  avisos: string[];
  auditoria_alvo: PassoAuditoria[];
  gerador_payload: GeradorBridgePayload;
  comercial_config: PropostaConfigInput;
} {
  const base = getCalcParams();
  const params: CalcParams = {
    ...base,
    hsp: input.hsp ?? base.hsp,
    tarifa: input.tarifa ?? base.tarifa,
    performanceRate: input.performanceRate ?? base.performanceRate,
    maxAlternativas: input.maxAlternativas ?? base.maxAlternativas,
    varianciaAlvoPct: sanitizeVarianciaAlvoPct(
      input.varianciaAlvoPct ?? base.varianciaAlvoPct,
      20
    ),
  };

  const avisos: string[] = [];
  const auditoria_alvo: PassoAuditoria[] = [];
  let alvoGeracaoMin = 0;
  let alvoGeracaoMax = 0;
  let consumoRef: number | null = null;
  const cdIds = resolveInputCdIds(input);
  const cdPrincipal = cdIds[0];

  auditoria_alvo.push({
    etapa: 'Parâmetros ativos',
    formula: 'hsp · diasMes · PR · bonusMicro%',
    valores: {
      hsp: params.hsp,
      diasMes: params.diasMes,
      performanceRate: params.performanceRate,
      bonusMicroPercent: params.bonusMicroPercent,
      placasPorMicro: params.placasPorMicro,
      tarifa: params.tarifa,
      modo: input.modo,
      cdId: cdPrincipal,
      cdIds: cdIds.join(','),
      maxAlternativas: params.maxAlternativas,
    },
    resultado: `fator string = ${(params.hsp * params.diasMes * params.performanceRate).toFixed(4)} kWh/kWp·mês · CDs [${cdIds.join(', ')}]`,
  });

  const modoPotencia = input.modo === 'potencia_kwp';
  let alvoKwpPedido = 0;

  if (modoPotencia) {
    alvoKwpPedido = Number(input.potencia_kwp) || 0;
    const ger = geracaoFromKwp(alvoKwpPedido, params, false);
    alvoGeracaoMin = ger;
    alvoGeracaoMax = ger;
    auditoria_alvo.push({
      etapa: 'Alvo a partir de kWp',
      formula: 'margem ±% gira em kWp · geração = kWp × HSP × diasMes × PR (referência)',
      valores: { potencia_kwp: alvoKwpPedido, geracao_ref_kwh: ger },
      resultado: `${alvoKwpPedido} kWp → ~${ger.toFixed(2)} kWh/mês (ref.)`,
    });
  } else if (input.modo === 'geracao_mensal') {
    const unico = Number(input.geracao_mensal_kwh) || 0;
    const gmin = Number(input.geracao_mensal_min);
    const gmax = Number(input.geracao_mensal_max);
    if (Number.isFinite(gmin) && gmin > 0 && Number.isFinite(gmax) && gmax > 0) {
      alvoGeracaoMin = Math.min(gmin, gmax);
      alvoGeracaoMax = Math.max(gmin, gmax);
    } else if (unico > 0) {
      alvoGeracaoMin = unico;
      alvoGeracaoMax = unico;
    }
    consumoRef = (alvoGeracaoMin + alvoGeracaoMax) / 2;
    auditoria_alvo.push({
      etapa: 'Faixa de geração mensal',
      formula: 'dimensiona kits para cair entre min e max (kWh/mês)',
      valores: {
        geracao_min: alvoGeracaoMin,
        geracao_max: alvoGeracaoMax,
        geracao_mid: consumoRef,
        valor_unico_legado: unico || null,
      },
      resultado:
        alvoGeracaoMin === alvoGeracaoMax
          ? `alvo cravado ${alvoGeracaoMin} kWh`
          : `faixa ${alvoGeracaoMin}–${alvoGeracaoMax} kWh/mês`,
    });
  } else {
    const unico = Number(input.consumo_mensal_kwh) || 0;
    const cmin = Number(input.consumo_mensal_min);
    const cmax = Number(input.consumo_mensal_max);
    if (Number.isFinite(cmin) && cmin > 0 && Number.isFinite(cmax) && cmax > 0) {
      alvoGeracaoMin = Math.min(cmin, cmax);
      alvoGeracaoMax = Math.max(cmin, cmax);
    } else if (unico > 0) {
      alvoGeracaoMin = unico;
      alvoGeracaoMax = unico;
    }
    consumoRef = (alvoGeracaoMin + alvoGeracaoMax) / 2;
    auditoria_alvo.push({
      etapa: 'Faixa a partir do consumo (~cobertura)',
      formula: 'usa consumo como proxy de geração desejada (min–max)',
      valores: {
        consumo_min: alvoGeracaoMin,
        consumo_max: alvoGeracaoMax,
        consumo_mid: consumoRef,
      },
      resultado:
        alvoGeracaoMin === alvoGeracaoMax
          ? `consumo/alvo ${alvoGeracaoMin} kWh`
          : `faixa ${alvoGeracaoMin}–${alvoGeracaoMax} kWh`,
    });
  }

  let alvoGeracao = (alvoGeracaoMin + alvoGeracaoMax) / 2;
  let alvoKwp = modoPotencia
    ? alvoKwpPedido
    : kwpFromGeracao(alvoGeracao, params, false);

  if (modoPotencia) {
    if (alvoKwpPedido <= 0) {
      throw new Error('Informe a potência do sistema (kWp)');
    }
  } else if (alvoGeracaoMin <= 0) {
    throw new Error('Informe geração/consumo (valor ou faixa min–max) ou potência (kWp)');
  }

  // Faixa de trabalho = alvo ± variância
  // Modo potência: margem em kWp (ex.: 6,8 ±10% → 6,12–7,48 kWp → opções 10×680W, 11×600W…)
  // Modo geração/consumo: margem em kWh
  const { baixo: varLo, alto: varHi } = fatoresVarianciaAlvo(params.varianciaAlvoPct);
  let workMin: number;
  let workMax: number;
  let workKwpMin: number;
  let workKwpMax: number;

  // Pontos min/mid/max: em modo potência giram na faixa de kWp (±%); senão na faixa kWh pedida
  let pontoFaixaMin: number;
  let pontoFaixaMax: number;

  if (modoPotencia) {
    workKwpMin = alvoKwp * varLo;
    workKwpMax = alvoKwp * varHi;
    workMin = geracaoFromKwp(workKwpMin, params, false);
    workMax = geracaoFromKwp(workKwpMax, params, false);
    const gerRef = geracaoFromKwp(alvoKwp, params, false);
    alvoGeracao = gerRef;
    alvoGeracaoMin = gerRef;
    alvoGeracaoMax = gerRef;
    pontoFaixaMin = workMin;
    pontoFaixaMax = workMax;
    auditoria_alvo.push({
      etapa: 'Margem ±variância do alvo (kWp)',
      formula: 'workKwp = alvo×(1±v%) · kits próximos em potência (qtd×Wp)',
      valores: {
        varianciaAlvoPct: params.varianciaAlvoPct,
        alvo_kwp: Math.round(alvoKwp * 1000) / 1000,
        work_kwp_min: Math.round(workKwpMin * 1000) / 1000,
        work_kwp_max: Math.round(workKwpMax * 1000) / 1000,
        work_kwh_min: Math.round(workMin),
        work_kwh_max: Math.round(workMax),
      },
      resultado: `±${params.varianciaAlvoPct}% → elabora entre ${workKwpMin.toFixed(2)}–${workKwpMax.toFixed(2)} kWp`,
    });
  } else {
    workMin = alvoGeracaoMin * varLo;
    workMax = alvoGeracaoMax * varHi;
    workKwpMin = kwpFromGeracao(workMin, params, false);
    workKwpMax = kwpFromGeracao(workMax, params, false);
    pontoFaixaMin = alvoGeracaoMin;
    pontoFaixaMax = alvoGeracaoMax;
    auditoria_alvo.push({
      etapa: 'Margem ±variância do alvo (kWh)',
      formula: 'workMin = min×(1−v%) · workMax = max×(1+v%) — encaixa propostas',
      valores: {
        varianciaAlvoPct: params.varianciaAlvoPct,
        alvo_min: Math.round(alvoGeracaoMin),
        alvo_max: Math.round(alvoGeracaoMax),
        work_min: Math.round(workMin),
        work_max: Math.round(workMax),
      },
      resultado: `±${params.varianciaAlvoPct}% → elabora entre ${Math.round(workMin)}–${Math.round(workMax)} kWh`,
    });
  }

  const frete = input.frete ?? 0;
  const pontosFaixa: Array<'min' | 'mid' | 'max'> =
    modoPotencia && params.varianciaAlvoPct > 0
      ? ['min', 'mid', 'max']
      : pontoFaixaMin === pontoFaixaMax
        ? ['mid']
        : ['min', 'mid', 'max'];

  const optsFaixaKwp = modoPotencia
    ? { alvoKwp, faixaKwpMin: workKwpMin, faixaKwpMax: workKwpMax }
    : {};
  const limDcAc = getDcAcLimits();
  const nenhumFiltroTopo = !input.incluir_micro && !input.incluir_string;
  const wantMicro = nenhumFiltroTopo || Boolean(input.incluir_micro);
  const wantString = nenhumFiltroTopo || Boolean(input.incluir_string);
  const rede220380 = input.rede_220_380 !== false;
  const alternativas: AlternativaProposta[] = [];
  const metaPrincipal = metaCd(cdPrincipal);

  // Catálogo do CD principal — kits manuais da 3a
  const modulosPrincipal = listModulosComPreco(cdPrincipal);
  const inversoresPrincipal = listInversoresComPreco(cdPrincipal);

  auditoria_alvo.push({
    etapa: 'Filtro topologia + DC/AC + CDs',
    formula: `checkboxes micro/string/rede · híbridos excluídos · kWp/kW ∈ [${limDcAc.min}, ${limDcAc.max}] (+tol → ${limDcAc.teto})`,
    valores: {
      incluir_micro: Boolean(input.incluir_micro),
      incluir_string: Boolean(input.incluir_string),
      rede_220_380: rede220380,
      wantMicro,
      wantString,
      cd_ids: cdIds.join(','),
      cd_principal: cdPrincipal,
      dc_ac_max: limDcAc.max,
      dc_ac_teto: limDcAc.teto,
      dc_ac_min: limDcAc.min,
      dc_ac_tol_pp: limDcAc.tolPp,
    },
    resultado:
      (wantMicro && wantString ? 'micro + string' : wantMicro ? 'somente micro' : 'somente string') +
      (rede220380 ? ' · rede 220/380 (exclui tri 220)' : ' · rede 127/220 (exclui tri 380)') +
      ` · ${cdIds.length} CD(s)`,
  });

  // --- Kits manuais da 3a (sempre no CD principal / catálogo da UI) ---
  const kitsManuais = input.kits_manuais || [];
  for (let ki = 0; ki < kitsManuais.length; ki++) {
    const kit = kitsManuais[ki];
    const mod = findModulo(cdPrincipal, kit.sku_modulo, modulosPrincipal);
    const inv = findInversor(cdPrincipal, kit.sku_inversor, inversoresPrincipal);
    if (!mod || !inv) {
      avisos.push(`Kit #${ki + 1}: SKU não encontrado ou sem preço (${kit.sku_modulo}/${kit.sku_inversor})`);
      continue;
    }

    const ponto = kit.alvo || (pontosFaixa[ki % pontosFaixa.length] as 'min' | 'mid' | 'max');
    const alvoKitKwp = modoPotencia
      ? resolveFaixaAlvoTriplo(ponto, workKwpMin, alvoKwp, workKwpMax)
      : 0;
    const alvoKit = modoPotencia
      ? geracaoFromKwp(alvoKitKwp, params, false)
      : resolveFaixaAlvo(ponto, pontoFaixaMin, pontoFaixaMax);
    const isMicro = inv.categoria === 'microinversor';
    if (isMicro && !wantMicro) {
      avisos.push(`Kit #${ki + 1}: micro ignorado (filtro só string)`);
      continue;
    }
    if (!isMicro && !wantString) {
      avisos.push(`Kit #${ki + 1}: string ignorado (filtro só micro)`);
      continue;
    }

    let qtdMod = kit.qtd_modulos;
    let qtdInv = kit.qtd_inversores;

    const optsKwpKit = modoPotencia
      ? { alvoKwp: alvoKitKwp, kwpMin: workKwpMin, kwpMax: workKwpMax }
      : undefined;

    if (!qtdMod || qtdMod <= 0) {
      if (isMicro) {
        const d = dimensionarMicro(mod, inv, params, alvoKit, workMin, workMax, 0, optsKwpKit);
        qtdMod = d.qtdMod;
        qtdInv = d.nMicros;
      } else {
        const d = dimensionarString(mod, [inv], params, alvoKit, workMin, workMax, 0, optsKwpKit);
        if (!d) continue;
        qtdMod = d.qtdMod;
        qtdInv = 1;
        if (d.avisos?.length) avisos.push(...d.avisos.map((a) => `Kit #${ki + 1}: ${a}`));
      }
    } else if (!isMicro && inv.potencia_kw > 0) {
      const adj = ajustarQtdModulosAoInversor(qtdMod, mod.potencia_w, inv.potencia_kw);
      if (adj.ajustou) {
        avisos.push(
          `Kit #${ki + 1}: qtd módulos ${qtdMod}→${adj.qtdMod} (DC/AC ${adj.ratio.toFixed(2)} vs teto ${limDcAc.teto})`
        );
        qtdMod = adj.qtdMod;
      }
    }
    if (!qtdInv || qtdInv <= 0) {
      qtdInv = isMicro
        ? Math.max(1, Math.ceil(qtdMod! / placasPorMicroEfetivo(mod, inv, params)))
        : 1;
    }

    alternativas.push(
      montarAltFromKit({
        mod,
        inv,
        qtdMod: qtdMod!,
        qtdInv: qtdInv!,
        params,
        consumoRef,
        cdId: cdPrincipal,
        cdNome: metaPrincipal.nome,
        fornecedor: metaPrincipal.fornecedor,
        frete,
        comercial: input.comercial,
        titulo: kit.titulo,
        origem: 'manual_3a',
        faixa_alvo_kwh: alvoKit,
        faixaMin: workMin,
        faixaMax: workMax,
        varianciaAlvoPct: 0,
        ...optsFaixaKwp,
        passosExtras: [
          {
            etapa: 'Origem 3a (Incluir)',
            formula: 'kit forçado pelo usuário · dimensionado na faixa DC/AC',
            valores: {
              ponto_faixa: ponto,
              alvo_kwh: alvoKit,
              alvo_kwp: modoPotencia ? alvoKwp : null,
              sku_modulo: mod.sku_interno,
              sku_inversor: inv.sku_interno,
              cd_id: cdPrincipal,
            },
            resultado: modoPotencia
              ? `card manual · alvo ${alvoKwp.toFixed(2)} kWp · ${metaPrincipal.fornecedor}`
              : `card manual · alvo ${Math.round(alvoKit)} kWh · ${metaPrincipal.fornecedor}`,
          },
        ],
      })
    );
  }

  const incluirAuto = input.incluir_auto !== false;
  const maxAlt = Math.min(6, Math.max(1, params.maxAlternativas || 6));

  // --- Auto por cada CD marcado ---
  if (incluirAuto) {
    for (const cdId of cdIds) {
      const meta = metaCd(cdId);
      const modulos = listModulosComPreco(cdId);
      const inversores = listInversoresComPreco(cdId);
      if (!modulos.length) {
        avisos.push(`${meta.fornecedor} (${meta.nome}): sem módulo precificado`);
        continue;
      }
      if (!inversores.length) {
        avisos.push(`${meta.fornecedor} (${meta.nome}): sem inversor/micro precificado`);
        continue;
      }

      const micros = inversores.filter((i) => i.categoria === 'microinversor');
      const stringsAll = inversores.filter((i) => i.categoria === 'inversor');
      const stringsHibridos = stringsAll.filter((i) => isInversorHibrido(i));
      const stringsSemHibrido = stringsAll.filter((i) => !isInversorHibrido(i));
      const stringsExcluidosRede = stringsSemHibrido.filter((i) => !passaFiltroRede220380(i, rede220380));
      const strings = stringsSemHibrido.filter((i) => passaFiltroRede220380(i, rede220380));

      if (stringsHibridos.length) {
        avisos.push(
          `${meta.fornecedor}: ${stringsHibridos.length} híbrido(s) fora da lista principal`
        );
      }
      if (stringsExcluidosRede.length) {
        avisos.push(
          rede220380
            ? `${meta.fornecedor}: ${stringsExcluidosRede.length} trifásico(s) 220 V excluído(s)`
            : `${meta.fornecedor}: ${stringsExcluidosRede.length} trifásico(s) 380 V excluído(s)`
        );
      }

      auditoria_alvo.push({
        etapa: `Catálogo CD ${cdId}`,
        formula: 'módulos/inversores com preço válido no CD',
        valores: {
          cd_id: cdId,
          cd_nome: meta.nome,
          fornecedor: meta.fornecedor,
          micros: micros.length,
          strings: strings.length,
          modulos: modulos.length,
        },
        resultado: `${meta.fornecedor} · ${modulos.length} mód. · ${micros.length} micro · ${strings.length} string`,
      });

      if (wantMicro) {
        if (!micros.length) {
          avisos.push(`${meta.fornecedor}: filtro micro ativo, sem microinversor precificado`);
        } else {
          const modsMicro = modoPotencia
            ? modsProximosAoKwp(modulos, alvoKwp, workKwpMin, workKwpMax, 6)
            : [[...modulos].sort((a, b) => b.potencia_w - a.potencia_w)[0]].filter(Boolean);

          for (const mod of modsMicro) {
            const microsCand = escolherMicrosParaModulo(
              mod,
              micros,
              params,
              meta.fornecedor === 'Fortlev' ? 2 : 3
            );
            for (const micro of microsCand) {
              const mpptLabel =
                micro.mppt > 0
                  ? micro.mppt
                  : mpptDoEquipamento(micro.nome, micro.sku_interno) || 0;
              for (const ponto of pontosFaixa) {
                const alvoKitKwp = modoPotencia
                  ? resolveFaixaAlvoTriplo(ponto, workKwpMin, alvoKwp, workKwpMax)
                  : 0;
                const alvoKit = modoPotencia
                  ? geracaoFromKwp(alvoKitKwp, params, true)
                  : resolveFaixaAlvo(ponto, pontoFaixaMin, pontoFaixaMax);
                const d = dimensionarMicro(
                  mod,
                  micro,
                  params,
                  alvoKit,
                  workMin,
                  workMax,
                  0,
                  modoPotencia
                    ? { alvoKwp: alvoKitKwp, kwpMin: workKwpMin, kwpMax: workKwpMax }
                    : undefined
                );
                const key = `${cdId}|${mod.sku_interno}|${micro.sku_interno}|${d.qtdMod}`;
                if (
                  alternativas.some(
                    (a) =>
                      `${a.cd_id || 0}|${a.sku_modulo}|${a.sku_inversor}|${a.qtd_modulos}` === key
                  )
                ) {
                  continue;
                }
                const mpptTxt = mpptLabel > 0 ? ` · ${mpptLabel} MPPT` : '';
                alternativas.push(
                  montarAltFromKit({
                    mod,
                    inv: micro,
                    qtdMod: d.qtdMod,
                    qtdInv: d.nMicros,
                    params,
                    consumoRef,
                    cdId,
                    cdNome: meta.nome,
                    fornecedor: meta.fornecedor,
                    frete,
                    comercial: input.comercial,
                    titulo: `Micro ${ponto} ${d.qtdMod}×${mod.potencia_w}W${mpptTxt}`.replace(
                      /\s+/g,
                      ' '
                    ),
                    origem: 'auto',
                    faixa_alvo_kwh: alvoKit,
                    faixaMin: workMin,
                    faixaMax: workMax,
                    varianciaAlvoPct: 0,
                    ...optsFaixaKwp,
                  })
                );
                if (!modoPotencia && pontosFaixa.length === 1) break;
              }
            }
          }
        }
      }

      if (wantString) {
        if (!strings.length) {
          avisos.push(
            stringsHibridos.length
              ? `${meta.fornecedor}: só híbridos (excluídos do auto) — use kit manual na 3a se precisar`
              : `${meta.fornecedor}: sem inversor string precificado`
          );
        } else {
          const pontosString: Array<'min' | 'mid' | 'max'> = modoPotencia
            ? pontosFaixa
            : pontosFaixa.length > 1
              ? ['min', 'max']
              : ['mid'];
          const modsString = modoPotencia
            ? modsProximosAoKwp(modulos, alvoKwp, workKwpMin, workKwpMax, 6)
            : modulos.slice(0, 4);
          for (const mod of modsString) {
            for (const ponto of pontosString) {
              const alvoKitKwp = modoPotencia
                ? resolveFaixaAlvoTriplo(ponto, workKwpMin, alvoKwp, workKwpMax)
                : 0;
              const alvoKit = modoPotencia
                ? geracaoFromKwp(alvoKitKwp, params, false)
                : resolveFaixaAlvo(ponto, pontoFaixaMin, pontoFaixaMax);
              const d = dimensionarString(
                mod,
                strings,
                params,
                alvoKit,
                workMin,
                workMax,
                0,
                modoPotencia
                  ? { alvoKwp: alvoKitKwp, kwpMin: workKwpMin, kwpMax: workKwpMax }
                  : undefined,
                { porCusto: meta.fornecedor === 'Fortlev' }
              );
              if (!d) continue;
              if (d.avisos?.length) avisos.push(...d.avisos.map((a) => `${meta.fornecedor}: ${a}`));
              if (
                alternativas.some(
                  (a) =>
                    (a.cd_id || 0) === cdId &&
                    a.sku_modulo === mod.sku_interno &&
                    a.sku_inversor === d.inv.sku_interno &&
                    a.qtd_modulos === d.qtdMod &&
                    a.tipo === 'string'
                )
              ) {
                continue;
              }
              alternativas.push(
                montarAltFromKit({
                  mod,
                  inv: d.inv,
                  qtdMod: d.qtdMod,
                  qtdInv: 1,
                  params,
                  consumoRef,
                  cdId,
                  cdNome: meta.nome,
                  fornecedor: meta.fornecedor,
                  frete,
                  comercial: input.comercial,
                  titulo: `String ${ponto} ${d.qtdMod}×${mod.potencia_w}W + ${d.inv.potencia_kw}kW`,
                  origem: 'auto',
                  faixa_alvo_kwh: alvoKit,
                  faixaMin: workMin,
                  faixaMax: workMax,
                  varianciaAlvoPct: 0,
                  ...optsFaixaKwp,
                })
              );
            }
          }
        }
      }
    }
  }

  // Manuais primeiro; autos diversificados por CD + PIX
  const manuais = alternativas.filter((a) => a.origem === 'manual_3a');
  const autosAll = alternativas.filter((a) => a.origem !== 'manual_3a');
  const limited = selecionarAlternativasDiversas(manuais, autosAll, maxAlt);

  const nFora = limited.filter((a) => a.fora_faixa).length;
  if (nFora) {
    avisos.push(
      modoPotencia
        ? `${nFora} alternativa(s) fora da faixa de kWp ${workKwpMin.toFixed(2)}–${workKwpMax.toFixed(2)} (±${params.varianciaAlvoPct}% sobre ${alvoKwp.toFixed(2)} kWp)`
        : `${nFora} alternativa(s) fora da faixa de trabalho ${Math.round(workMin)}–${Math.round(workMax)} kWh (±${params.varianciaAlvoPct}% sobre o alvo)`
    );
  }
  const nDescartadas = autosAll.length - (limited.length - manuais.length);
  if (nDescartadas > 0) {
    avisos.push(
      `${nDescartadas} kit(s) auto descartado(s) (cap ${maxAlt} · diversificação por CD)`
    );
  }

  if (!limited.length) avisos.push('Não foi possível montar alternativas com o catálogo precificado');

  if (input.salvar) {
    for (const alt of limited) {
      const saved = createOrcamentoBase({
        titulo: `${input.cliente_nome || 'Cliente Premium'} · ${alt.titulo}`,
        cdId: alt.cd_id || cdPrincipal,
        cliente_nome: input.cliente_nome,
        notas: `auto 4a · ${alt.potencia_kwp} kWp · ~${alt.geracao_mensal_kwh} kWh/mês · PIX ${alt.comercial.ppix}`,
        itens: [
          { sku_interno: alt.sku_modulo, quantidade: alt.qtd_modulos },
          { sku_interno: alt.sku_inversor, quantidade: alt.qtd_inversores },
        ],
        autoComplementos: true,
      });
      alt.orcamento_base_id = saved.id;
    }
  }

  const comercialCfg = resolveComercialConfig(input.comercial);
  const gerador_payload = buildGeradorBridgePayload({
    cliente_nome: input.cliente_nome,
    consumo_mensal_kwh: consumoRef,
    hsp: params.hsp,
    tarifa: params.tarifa,
    pdespesaFixo: comercialCfg.pdespesaFixo,
    pdespesaVariavel: comercialCfg.pdespesaVariavel,
    alternativas: limited,
  });

  return {
    params,
    modo: input.modo,
    alvoKwp: Math.round(alvoKwp * 1000) / 1000,
    alvoKwpMin: Math.round(workKwpMin * 1000) / 1000,
    alvoKwpMax: Math.round(workKwpMax * 1000) / 1000,
    alvoGeracao: Math.round(alvoGeracao),
    alvoGeracaoMin: Math.round(alvoGeracaoMin),
    alvoGeracaoMax: Math.round(alvoGeracaoMax),
    consumoRef,
    alternativas: limited,
    avisos,
    auditoria_alvo,
    gerador_payload,
    comercial_config: {
      pdespesaFixo: comercialCfg.pdespesaFixo,
      pdespesaVariavel: comercialCfg.pdespesaVariavel,
      descontoFortlevCustoPct: comercialCfg.descontoFortlevCustoPct,
      fatorParcelado: comercialCfg.fatorParcelado,
      hsp: params.hsp,
      tarifa: params.tarifa,
    },
  };
}
