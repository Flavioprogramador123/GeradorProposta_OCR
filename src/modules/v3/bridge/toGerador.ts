/**
 * Payload para /gerador-rapido?modo=v3 (localStorage key: v3-gerador-bridge)
 */
import type { AlternativaProposta } from '../calc/propostaAuto';
import type { PrecificacaoComercial } from './comercial';
import { marcaCurtaEquipamento } from '@/lib/equipamentoLabel';

export const V3_GERADOR_STORAGE_KEY = 'v3-gerador-bridge';

export interface GeradorBridgeOrcamento {
  fornecedor: string;
  precoCusto: number;
  valorTotal: number;
  modulos: number;
  pot_modulo: number;
  marca_modulo: string;
  inversores: number;
  pot_inv: number;
  marca_inversor: string;
  bonusMicroAtivo?: boolean;
  titulo_v3?: string;
  sku_modulo?: string;
  sku_inversor?: string;
}

export interface GeradorBridgePayload {
  origem: string;
  quantidadeTotal: number;
  cliente: {
    nomeCliente: string;
    cidadeCliente: string;
    consumoMensal: number;
    tipoImovel: string;
    hsp: number;
    tarifa: number;
  };
  pdespesa: {
    pdespesaFixo: number;
    pdespesaVariavel: number;
  };
  orcamentos: GeradorBridgeOrcamento[];
}

function marcaFromNome(
  marcaTag?: string | null,
  nome?: string,
  sku?: string
): string {
  // 1) Tag explícita do catálogo/scraping (preferida)
  const tag = String(marcaTag || '')
    .trim()
    .replace(/\s+/g, '');
  if (tag && !/^(GEN|PADR[AÃ]O|N\/?A|MODULO|INVERSOR)$/i.test(tag)) {
    return tag.toUpperCase();
  }
  // 2) Parse do nome completo
  const curta = marcaCurtaEquipamento(nome);
  if (curta) return curta;
  // 3) Fallback SKU (ex.: MOD-AUTO-RENEPV-680)
  if (sku) {
    const parts = String(sku)
      .split(/[-_]/)
      .filter((p) => p && !/^(MOD|INV|MIC|AUTO|SKU)$/i.test(p) && !/^\d/.test(p));
    const candidate = parts.find((p) => /^[A-Za-z]{2,}$/.test(p));
    if (candidate) return candidate.toUpperCase();
  }
  return 'Padrão';
}

export function alternativaToGeradorOrc(
  alt: AlternativaProposta & { comercial?: PrecificacaoComercial }
): GeradorBridgeOrcamento {
  const pcusto = alt.comercial?.pcusto ?? alt.custo_total;
  return {
    fornecedor: `V3/${alt.tipo}`,
    precoCusto: pcusto,
    valorTotal: pcusto,
    modulos: alt.qtd_modulos,
    pot_modulo: alt.potencia_modulo_w || Math.round((alt.potencia_kwp * 1000) / Math.max(1, alt.qtd_modulos)),
    marca_modulo: marcaFromNome(alt.marca_modulo, alt.nome_modulo, alt.sku_modulo),
    inversores: alt.qtd_inversores,
    pot_inv: alt.potencia_inversor_kw || 0,
    marca_inversor: marcaFromNome(alt.marca_inversor, alt.nome_inversor, alt.sku_inversor),
    bonusMicroAtivo: alt.tipo === 'micro',
    titulo_v3: alt.titulo,
    sku_modulo: alt.sku_modulo,
    sku_inversor: alt.sku_inversor,
  };
}

export function buildGeradorBridgePayload(opts: {
  cliente_nome?: string;
  cidade?: string;
  consumo_mensal_kwh?: number | null;
  tipo_imovel?: string;
  hsp: number;
  tarifa: number;
  pdespesaFixo: number;
  pdespesaVariavel: number;
  alternativas: Array<AlternativaProposta & { comercial?: PrecificacaoComercial }>;
}): GeradorBridgePayload {
  const orcamentos = opts.alternativas.map(alternativaToGeradorOrc);
  return {
    origem: `V3 proposta-auto · ${orcamentos.length} alternativa(s)`,
    quantidadeTotal: orcamentos.length,
    cliente: {
      nomeCliente: opts.cliente_nome || 'Cliente Premium',
      cidadeCliente: opts.cidade || 'Anápolis/GO',
      consumoMensal: opts.consumo_mensal_kwh && opts.consumo_mensal_kwh > 0 ? opts.consumo_mensal_kwh : 600,
      tipoImovel: opts.tipo_imovel || 'Residencial',
      hsp: opts.hsp,
      tarifa: opts.tarifa,
    },
    pdespesa: {
      pdespesaFixo: opts.pdespesaFixo,
      pdespesaVariavel: opts.pdespesaVariavel,
    },
    orcamentos,
  };
}
