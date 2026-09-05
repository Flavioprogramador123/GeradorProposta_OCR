import { getV3Db } from '../db/sqlite';
import {
  getCalcParams,
  geracaoFromKwp,
  kwpFromGeracao,
  precificarCusto,
  type CalcParams,
} from './params';
import { calcularOrcamentoBase } from '../orcamentos/kitEngine';
import { createOrcamentoBase } from '../orcamentos/repository';
import { precificarComercialV2, resolveComercialConfig, type PrecificacaoComercial } from '../bridge/comercial';
import { buildGeradorBridgePayload, type GeradorBridgePayload } from '../bridge/toGerador';
import type { PropostaConfigInput } from '@/lib/propostaOrcamentoProcessor';

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
  cdId: number;
  cliente_nome?: string;
  hsp?: number;
  tarifa?: number;
  performanceRate?: number;
  maxAlternativas?: number;
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
  potencia_modulo_w?: number;
  potencia_inversor_kw?: number;
  preco_unit_modulo?: number;
  preco_unit_inversor?: number;
  custo_rs_kwp_modulo?: number | null;
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

function listModulosComPreco(cdId: number): ModRow[] {
  const db = getV3Db();
  const rows = db
    .prepare(
      `SELECT e.id, e.sku_interno, e.nome, e.marca, e.potencia_w, p.preco_custo, p.estoque
       FROM equipamentos e
       JOIN precos_cd p ON p.equipamento_id = e.id AND p.cd_id = ? AND p.valido_estoque = 1
       WHERE e.ativo = 1 AND e.categoria = 'modulo' AND e.potencia_w IS NOT NULL AND e.potencia_w > 0`
    )
    .all(cdId) as ModRow[];

  return rows
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
  const rows = db
    .prepare(
      `SELECT e.id, e.sku_interno, e.nome, e.marca, e.categoria, e.potencia_kw, p.preco_custo, p.estoque
       FROM equipamentos e
       JOIN precos_cd p ON p.equipamento_id = e.id AND p.cd_id = ? AND p.valido_estoque = 1
       WHERE e.ativo = 1 AND e.categoria IN ('inversor','microinversor') AND e.potencia_kw IS NOT NULL`
    )
    .all(cdId) as InvRow[];
  return rows.sort(sortInversoresPreferencia);
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
  return row || fallback.find((i) => i.sku_interno === sku) || null;
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

function montarAltFromKit(opts: {
  mod: ModRow;
  inv: InvRow;
  qtdMod: number;
  qtdInv: number;
  params: CalcParams;
  consumoRef: number | null;
  cdId: number;
  frete: number;
  comercial?: PropostaConfigInput;
  titulo?: string;
  origem: 'manual_3a' | 'auto';
  faixa_alvo_kwh: number;
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
  const precos = precificarCusto(calc.custo_total, params);
  const comercial = precificarComercialV2(calc.custo_total, opts.comercial, opts.frete);
  const cob = consumoRef && consumoRef > 0 ? Math.round((ger / consumoRef) * 100) : null;
  const titulo =
    opts.titulo ||
    `${isMicro ? 'Micro' : 'String'} ${inv.marca || ''} ${qtdMod}×${mod.potencia_w}W`.replace(/\s+/g, ' ').trim();

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
        bonus_micro: isMicro,
        origem: opts.origem,
      },
      resultado: `${Math.round(ger)} kWh/mês · PIX ${comercial.ppix}`,
    },
  ];

  return {
    titulo,
    tipo: isMicro ? 'micro' : 'string',
    sku_modulo: mod.sku_interno,
    sku_inversor: inv.sku_interno,
    nome_modulo: mod.nome,
    nome_inversor: inv.nome,
    potencia_modulo_w: mod.potencia_w,
    potencia_inversor_kw: inv.potencia_kw,
    preco_unit_modulo: mod.preco_custo,
    preco_unit_inversor: inv.preco_custo,
    custo_rs_kwp_modulo: Math.round((mod.preco_custo / (mod.potencia_w / 1000)) * 100) / 100,
    qtd_modulos: qtdMod,
    qtd_inversores: qtdInv,
    potencia_kwp: Math.round(pot * 1000) / 1000,
    geracao_mensal_kwh: Math.round(ger),
    cobertura_pct: cob,
    custo_total: calc.custo_total,
    frete: opts.frete,
    precos,
    precos_simplificado_4a: precos,
    comercial,
    orcamento_itens: calc.itens,
    breakdown: calc.breakdown,
    avisos: calc.avisos,
    origem: opts.origem,
    faixa_alvo_kwh: Math.round(opts.faixa_alvo_kwh),
    auditoria: {
      passos,
      economia_mensal_estimada: economiaMensal(ger, consumoRef, params.tarifa),
    },
  };
}

/** Dimensiona qtd para atingir alvoGeracao dentro da faixa [min, max] */
function dimensionarMicro(
  mod: ModRow,
  micro: InvRow,
  params: CalcParams,
  alvoGeracao: number,
  geracaoMax: number
): { qtdMod: number; nMicros: number; pot: number; ger: number } {
  const placasPorMicro = params.placasPorMicro;
  const kwpPorMicro = (mod.potencia_w * placasPorMicro) / 1000;
  const alvoKwp = kwpFromGeracao(alvoGeracao, params, true);
  let nMicros = Math.max(1, Math.ceil(alvoKwp / kwpPorMicro));
  let qtdMod = nMicros * placasPorMicro;
  let pot = (qtdMod * mod.potencia_w) / 1000;
  let ger = geracaoFromKwp(pot, params, true);

  while (ger < alvoGeracao * 0.95 && nMicros < 40) {
    const next = nMicros + 1;
    const nextGer = geracaoFromKwp((next * placasPorMicro * mod.potencia_w) / 1000, params, true);
    if (nextGer > geracaoMax * 1.08 && ger >= alvoGeracao * 0.9) break;
    nMicros = next;
    qtdMod = nMicros * placasPorMicro;
    pot = (qtdMod * mod.potencia_w) / 1000;
    ger = nextGer;
  }
  return { qtdMod, nMicros, pot, ger };
}

function dimensionarString(
  mod: ModRow,
  strings: InvRow[],
  params: CalcParams,
  alvoGeracao: number,
  geracaoMax: number
): { qtdMod: number; inv: InvRow; pot: number; ger: number } | null {
  if (!strings.length) return null;
  const alvoKwp = kwpFromGeracao(alvoGeracao, params, false);
  const qtdBruta = (alvoKwp * 1000) / mod.potencia_w;
  let qtdMod = roundUpModulos(qtdBruta, 2);
  if (qtdMod < 4) qtdMod = 4;
  let pot = (qtdMod * mod.potencia_w) / 1000;
  let ger = geracaoFromKwp(pot, params, false);

  while (ger < alvoGeracao * 0.98 && qtdMod < 80) {
    const next = qtdMod + 2;
    const nextGer = geracaoFromKwp((next * mod.potencia_w) / 1000, params, false);
    if (nextGer > geracaoMax * 1.08 && ger >= alvoGeracao * 0.9) break;
    qtdMod = next;
    pot = (qtdMod * mod.potencia_w) / 1000;
    ger = nextGer;
  }

  const limiarInv = pot * 0.75;
  // Preferência SAJ → DEye → demais; entre iguais, menor kW que cubra o limiar
  const candidatos = [...strings].sort(sortInversoresPreferencia);
  const inv =
    candidatos.find((i) => i.potencia_kw >= limiarInv) ||
    candidatos[candidatos.length - 1] ||
    candidatos[0];
  if (!inv) return null;
  return { qtdMod, inv, pot, ger };
}

export function montarPropostaAuto(input: PropostaAutoInput): {
  params: CalcParams;
  alvoKwp: number;
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
  };

  const avisos: string[] = [];
  const auditoria_alvo: PassoAuditoria[] = [];
  let alvoGeracaoMin = 0;
  let alvoGeracaoMax = 0;
  let consumoRef: number | null = null;

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
      cdId: input.cdId,
    },
    resultado: `fator string = ${(params.hsp * params.diasMes * params.performanceRate).toFixed(4)} kWh/kWp·mês`,
  });

  if (input.modo === 'potencia_kwp') {
    const kwp = Number(input.potencia_kwp) || 0;
    const ger = geracaoFromKwp(kwp, params, false);
    alvoGeracaoMin = ger;
    alvoGeracaoMax = ger;
    auditoria_alvo.push({
      etapa: 'Alvo a partir de kWp',
      formula: 'geração = kWp × HSP × diasMes × PR',
      valores: { potencia_kwp: kwp },
      resultado: `${ger.toFixed(2)} kWh/mês`,
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

  const alvoGeracao = (alvoGeracaoMin + alvoGeracaoMax) / 2;
  const alvoKwp = kwpFromGeracao(alvoGeracao, params, false);

  if (alvoGeracaoMin <= 0) {
    throw new Error('Informe geração/consumo (valor ou faixa min–max) ou potência (kWp)');
  }

  const modulos = listModulosComPreco(input.cdId);
  const inversores = listInversoresComPreco(input.cdId);
  if (!modulos.length) throw new Error('Nenhum módulo com preço válido neste CD');
  if (!inversores.length) throw new Error('Nenhum inversor/micro com preço válido neste CD');

  const micros = inversores.filter((i) => i.categoria === 'microinversor');
  const strings = inversores.filter((i) => i.categoria === 'inversor');
  const nenhumFiltroTopo = !input.incluir_micro && !input.incluir_string;
  const wantMicro = nenhumFiltroTopo || Boolean(input.incluir_micro);
  const wantString = nenhumFiltroTopo || Boolean(input.incluir_string);
  const alternativas: AlternativaProposta[] = [];
  const frete = input.frete ?? 0;
  const pontosFaixa: Array<'min' | 'mid' | 'max'> =
    alvoGeracaoMin === alvoGeracaoMax ? ['mid'] : ['min', 'mid', 'max'];

  auditoria_alvo.push({
    etapa: 'Filtro topologia',
    formula: 'checkboxes micro/string · nenhum = ambos',
    valores: {
      incluir_micro: Boolean(input.incluir_micro),
      incluir_string: Boolean(input.incluir_string),
      wantMicro,
      wantString,
      micros_cd: micros.length,
      strings_cd: strings.length,
    },
    resultado: wantMicro && wantString ? 'micro + string' : wantMicro ? 'somente micro' : 'somente string',
  });

  // --- Kits manuais da 3a ---
  const kitsManuais = input.kits_manuais || [];
  for (let ki = 0; ki < kitsManuais.length; ki++) {
    const kit = kitsManuais[ki];
    const mod = findModulo(input.cdId, kit.sku_modulo, modulos);
    const inv = findInversor(input.cdId, kit.sku_inversor, inversores);
    if (!mod || !inv) {
      avisos.push(`Kit #${ki + 1}: SKU não encontrado ou sem preço (${kit.sku_modulo}/${kit.sku_inversor})`);
      continue;
    }

    const ponto = kit.alvo || (pontosFaixa[ki % pontosFaixa.length] as 'min' | 'mid' | 'max');
    const alvoKit = resolveFaixaAlvo(ponto, alvoGeracaoMin, alvoGeracaoMax);
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

    if (!qtdMod || qtdMod <= 0) {
      if (isMicro) {
        const d = dimensionarMicro(mod, inv, params, alvoKit, alvoGeracaoMax);
        qtdMod = d.qtdMod;
        qtdInv = d.nMicros;
      } else {
        const d = dimensionarString(mod, [inv, ...strings.filter((s) => s.sku_interno !== inv.sku_interno)], params, alvoKit, alvoGeracaoMax);
        if (!d) continue;
        // força o inversor escolhido na 3a
        qtdMod = d.qtdMod;
        qtdInv = 1;
      }
    }
    if (!qtdInv || qtdInv <= 0) {
      qtdInv = isMicro ? Math.max(1, Math.ceil(qtdMod! / params.placasPorMicro)) : 1;
    }

    alternativas.push(
      montarAltFromKit({
        mod,
        inv,
        qtdMod: qtdMod!,
        qtdInv: qtdInv!,
        params,
        consumoRef,
        cdId: input.cdId,
        frete,
        comercial: input.comercial,
        titulo: kit.titulo,
        origem: 'manual_3a',
        faixa_alvo_kwh: alvoKit,
        passosExtras: [
          {
            etapa: 'Origem 3a (Incluir)',
            formula: 'kit forçado pelo usuário · dimensionado na faixa',
            valores: {
              ponto_faixa: ponto,
              alvo_kwh: alvoKit,
              sku_modulo: mod.sku_interno,
              sku_inversor: inv.sku_interno,
            },
            resultado: `card manual · alvo ${Math.round(alvoKit)} kWh`,
          },
        ],
      })
    );
  }

  const incluirAuto = input.incluir_auto !== false;
  const maxAlt = params.maxAlternativas;

  // --- Auto: micro (maior Wp) e/ou strings conforme filtro ---
  if (incluirAuto && alternativas.length < maxAlt) {
    if (wantMicro) {
      if (!micros.length) {
        avisos.push('Filtro micro ativo, mas não há microinversor com preço neste CD');
      } else if (!modulos.length) {
        avisos.push('Sem módulos precificados para montar kits micro');
      } else {
        // Micro sempre com a maior potência de placa disponível no CD
        const modMaiorWp = [...modulos].sort((a, b) => b.potencia_w - a.potencia_w)[0];
        const micro = [...micros].sort((a, b) => a.potencia_kw - b.potencia_kw)[0];
        auditoria_alvo.push({
          etapa: 'Módulo para micro',
          formula: 'maior potencia_w do CD',
          valores: {
            sku: modMaiorWp.sku_interno,
            potencia_w: modMaiorWp.potencia_w,
            micro_sku: micro.sku_interno,
            micro_kw: micro.potencia_kw,
          },
          resultado: `${modMaiorWp.potencia_w}W · ${micro.nome || micro.sku_interno}`,
        });
        for (const ponto of pontosFaixa) {
          if (alternativas.length >= maxAlt) break;
          const alvoKit = resolveFaixaAlvo(ponto, alvoGeracaoMin, alvoGeracaoMax);
          const d = dimensionarMicro(modMaiorWp, micro, params, alvoKit, alvoGeracaoMax);
          const key = `${modMaiorWp.sku_interno}|${micro.sku_interno}|${d.qtdMod}`;
          if (alternativas.some((a) => `${a.sku_modulo}|${a.sku_inversor}|${a.qtd_modulos}` === key)) continue;
          alternativas.push(
            montarAltFromKit({
              mod: modMaiorWp,
              inv: micro,
              qtdMod: d.qtdMod,
              qtdInv: d.nMicros,
              params,
              consumoRef,
              cdId: input.cdId,
              frete,
              comercial: input.comercial,
              titulo: `Micro ${ponto} ${d.qtdMod}×${modMaiorWp.potencia_w}W`.replace(/\s+/g, ' '),
              origem: 'auto',
              faixa_alvo_kwh: alvoKit,
            })
          );
          if (pontosFaixa.length === 1) break;
        }
      }
    }

    if (wantString) {
      if (!strings.length) {
        avisos.push('Filtro string ativo, mas não há inversor string com preço neste CD');
      } else {
        for (const mod of modulos.slice(0, 4)) {
          if (alternativas.length >= maxAlt) break;
          for (const ponto of pontosFaixa.length > 1 ? (['min', 'max'] as const) : (['mid'] as const)) {
            if (alternativas.length >= maxAlt) break;
            const alvoKit = resolveFaixaAlvo(ponto, alvoGeracaoMin, alvoGeracaoMax);
            const d = dimensionarString(mod, strings, params, alvoKit, alvoGeracaoMax);
            if (!d) continue;
            if (
              alternativas.some(
                (a) =>
                  a.sku_modulo === mod.sku_interno &&
                  a.sku_inversor === d.inv.sku_interno &&
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
                cdId: input.cdId,
                frete,
                comercial: input.comercial,
                titulo: `String ${ponto} ${d.qtdMod}×${mod.potencia_w}W + ${d.inv.potencia_kw}kW`,
                origem: 'auto',
                faixa_alvo_kwh: alvoKit,
              })
            );
          }
        }
      }
    }
  }

  // Manuais primeiro; depois PIX
  const manuais = alternativas.filter((a) => a.origem === 'manual_3a');
  const autos = alternativas
    .filter((a) => a.origem !== 'manual_3a')
    .sort((a, b) => a.comercial.ppix - b.comercial.ppix);
  const limited = [...manuais, ...autos].slice(0, Math.max(maxAlt, manuais.length));

  if (!limited.length) avisos.push('Não foi possível montar alternativas com o catálogo precificado');

  if (input.salvar) {
    for (const alt of limited) {
      const saved = createOrcamentoBase({
        titulo: `${input.cliente_nome || 'Cliente Premium'} · ${alt.titulo}`,
        cdId: input.cdId,
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
    alvoKwp: Math.round(alvoKwp * 1000) / 1000,
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
      fatorParcelado: comercialCfg.fatorParcelado,
      hsp: params.hsp,
      tarifa: params.tarifa,
    },
  };
}
