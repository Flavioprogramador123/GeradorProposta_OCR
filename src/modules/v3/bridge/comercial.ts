/**
 * Camada comercial 5a — mesma lógica do Gerador Rápido / propostaOrcamentoProcessor.
 * Não usa o markup simplificado da 4a (custo×30% − PIX%).
 */
import {
  calcularPdespesaProposta,
  calcularPrecosProposta,
  normalizePropostaConfig,
  type PropostaConfigInput,
} from '@/lib/propostaOrcamentoProcessor';

export type ComercialConfig = ReturnType<typeof normalizePropostaConfig>;

export interface PrecificacaoComercial {
  /** Custo do kit (BOM) sem frete */
  pcusto_kit: number;
  /** Custo do kit após desconto Fortlev (se aplicável) */
  pcusto_kit_liquido: number;
  /** % desconto Fortlev aplicado no kit */
  desconto_fortlev_pct: number;
  /** Frete digitado pelo usuário (transportadora) — soma no pcusto */
  frete: number;
  /** Base comercial = kit líquido + frete */
  pcusto: number;
  pdespesa_fixo: number;
  pdespesa_variavel_percent: number;
  pdespesa_variavel_valor: number;
  pdespesa_total: number;
  /** No Gerador, total_final = PIX (base do card) */
  total_final: number;
  ppix: number;
  pavista: number;
  priscado: number;
  p12x: number;
  p12x_total: number;
  p18x_parcela: number;
  p18x_total: number;
  fatorParcelado: number;
  formula: string;
  fonte: 'v2-propostaOrcamentoProcessor';
}

export function resolveComercialConfig(overrides: PropostaConfigInput = {}): ComercialConfig {
  return normalizePropostaConfig(overrides);
}

/**
 * @param pcustoKit custo BOM (preços avulsos)
 * @param opts.aplicarDescontoFortlev se true, aplica descontoFortlevCustoPct no kit
 */
export function precificarComercialV2(
  pcustoKit: number,
  overrides: PropostaConfigInput = {},
  frete = 0,
  opts?: { aplicarDescontoFortlev?: boolean }
): PrecificacaoComercial {
  const config = resolveComercialConfig(overrides);
  const kitBruto = Math.max(0, Number(pcustoKit) || 0);
  const descPct =
    opts?.aplicarDescontoFortlev && config.descontoFortlevCustoPct > 0
      ? config.descontoFortlevCustoPct
      : 0;
  const kit = Math.round(kitBruto * (1 - descPct / 100) * 100) / 100;
  const freteN = Math.max(0, Number(frete) || 0);
  const custo = kit + freteN;
  const pdespesa_total = calcularPdespesaProposta(custo, config);
  const pdespesa_variavel_valor =
    config.pdespesaVariavel === 0 ? 0 : custo * (config.pdespesaVariavel / 100);
  const total_final = Math.round((custo + pdespesa_total) * 100) / 100;
  const precos = calcularPrecosProposta(total_final, config);

  return {
    pcusto_kit: Math.round(kitBruto * 100) / 100,
    pcusto_kit_liquido: kit,
    desconto_fortlev_pct: descPct,
    frete: Math.round(freteN * 100) / 100,
    pcusto: Math.round(custo * 100) / 100,
    pdespesa_fixo: config.pdespesaFixo,
    pdespesa_variavel_percent: config.pdespesaVariavel,
    pdespesa_variavel_valor: Math.round(pdespesa_variavel_valor * 100) / 100,
    pdespesa_total: Math.round(pdespesa_total * 100) / 100,
    total_final,
    ppix: precos.ppix,
    pavista: precos.pavista,
    priscado: precos.priscado,
    p12x: precos.p12x,
    p12x_total: precos.p12x_total,
    p18x_parcela: precos.p18x_parcela,
    p18x_total: precos.p18x_total,
    fatorParcelado: config.fatorParcelado,
    formula:
      descPct > 0
        ? `pcusto = kit×(1−${descPct}% Fortlev) + frete; pdespesa = fixo + pcusto×(var%/100); PIX = pcusto + pdespesa`
        : 'pcusto = kit + frete; pdespesa = fixo + pcusto×(var%/100); PIX = pcusto + pdespesa',
    fonte: 'v2-propostaOrcamentoProcessor',
  };
}
