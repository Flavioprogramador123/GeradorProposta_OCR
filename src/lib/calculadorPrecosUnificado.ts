/**
 * 📊 PIENG - Calculadora Unificada de Preços v2.1
 *
 * PIX = P.Custo + despesas (menor valor).
 * À vista / 12× / 18× = tabela maquininha (`tabelaJurosCartao`).
 */

import {
  MULTIPLICADOR_CARTAO,
  calcularPrecosDePix,
} from '@/lib/tabelaJurosCartao';

export interface ParametrosCalculo {
  pCusto: number;
  despesaFixa: number;
  despesaVariavelPercent: number;
  /** @deprecated Ignorado — à vista vem da tabela 12× */
  descontoPix?: number;
  /** @deprecated Ignorado — usa MULTIPLICADOR_CARTAO[12] */
  taxaCartao12x?: number;
  /** @deprecated Ignorado — usa MULTIPLICADOR_CARTAO[18] */
  taxaCartao18x?: number;
  fatorParcelado?: number;
}

export interface ResultadoCalculo {
  pCusto: number;
  despesas: number;
  despesaFixa: number;
  despesaVariavel: number;
  totalBase: number;
  ppix: number;
  pavista: number;
  priscado: number;
  p12x: number;
  p12x_total: number;
  p18x_parcela: number;
  p18x_total: number;
  margemBruta: number;
  margemSobreCusto: number;
  precoKwp: number;
  /** Espelho legado = 1 / MULT_12 */
  fator12x: number;
  fator18x: number;
  fatorDescontoPix: number;
}

export function calcularPrecos(
  params: ParametrosCalculo,
  potenciaKwp?: number
): ResultadoCalculo {
  const {
    pCusto,
    despesaFixa,
    despesaVariavelPercent,
    fatorParcelado = 1.2,
  } = params;

  if (pCusto < 0) throw new Error('P.Custo não pode ser negativo');
  if (despesaFixa < 0) throw new Error('Despesa fixa não pode ser negativa');
  if (despesaVariavelPercent < 0) throw new Error('Despesa variável não pode ser negativa');

  const despesaVariavel = pCusto * (despesaVariavelPercent / 100);
  const despesas = despesaFixa + despesaVariavel;
  const ppixBase = pCusto + despesas;
  const precos = calcularPrecosDePix(ppixBase, fatorParcelado);

  const margemBruta = precos.ppix > 0 ? (despesas / precos.ppix) * 100 : 0;
  const margemSobreCusto = pCusto > 0 ? (despesas / pCusto) * 100 : 0;
  const precoKwp = potenciaKwp && potenciaKwp > 0 ? precos.ppix / potenciaKwp : 0;
  const fator12x = 1 / MULTIPLICADOR_CARTAO[12];
  const fator18x = 1 / MULTIPLICADOR_CARTAO[18];
  const fatorDescontoPix =
    precos.ppix > 0 ? (precos.pavista - precos.ppix) / precos.ppix : 0;

  return {
    pCusto: Math.round(pCusto * 100) / 100,
    despesas: Math.round(despesas * 100) / 100,
    despesaFixa: Math.round(despesaFixa * 100) / 100,
    despesaVariavel: Math.round(despesaVariavel * 100) / 100,
    totalBase: precos.ppix,
    ppix: precos.ppix,
    pavista: precos.pavista,
    priscado: precos.priscado,
    p12x: precos.p12x,
    p12x_total: precos.p12x_total,
    p18x_parcela: precos.p18x_parcela,
    p18x_total: precos.p18x_total,
    margemBruta: Math.round(margemBruta * 100) / 100,
    margemSobreCusto: Math.round(margemSobreCusto * 100) / 100,
    precoKwp: Math.round(precoKwp * 100) / 100,
    fator12x: Math.round(fator12x * 10000) / 10000,
    fator18x: Math.round(fator18x * 10000) / 10000,
    fatorDescontoPix: Math.round(fatorDescontoPix * 10000) / 10000,
  };
}

export function calcularPrecosMultiplos(
  orcamentos: Array<{ pCusto: number; potenciaKwp: number }>,
  paramsBase: Omit<ParametrosCalculo, 'pCusto'>
): ResultadoCalculo[] {
  return orcamentos.map((orc) =>
    calcularPrecos({ ...paramsBase, pCusto: orc.pCusto }, orc.potenciaKwp)
  );
}
