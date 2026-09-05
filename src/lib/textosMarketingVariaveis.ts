/**
 * Biblioteca de variações — Textos de Marketing Variáveis (copy + PNL).
 * Fonte: textos-marketing-variaveis-pnl.md
 * Tokens: somente os já usados pelo ERP.
 */

import { processarTextoMarketing } from '@/utils/configuracoes';

export type CampoMarketing =
  | 'textoEconomiaAnual'
  | 'textoPayback'
  | 'textoTIR'
  | 'textoValorizacaoImovel'
  | 'textoSustentabilidade';

export interface VariacaoMarketing {
  id: number;
  label: string;
  texto: string;
  tecnica: string;
  /** Variações com comparação/equivalência que pedem lastro */
  ressalva?: boolean;
}

export interface CampoMarketingMeta {
  campo: CampoMarketing;
  titulo: string;
  token: string;
  variacoes: VariacaoMarketing[];
}

export interface TextosMarketingTemplates {
  textoEconomiaAnual: string;
  textoPayback: string;
  textoTIR: string;
  textoValorizacaoImovel: string;
  textoSustentabilidade: string;
}

export interface TextosMarketingTokens {
  valorEconomia: string | number;
  mesesPayback: string | number;
  percentualTIR: string | number;
  percentualValorizacao: string | number;
  tonelaCO2: string | number;
}

/** Textos já processados (prontos para HTML / React) */
export interface TextosMarketingResolvidos {
  economiaAnual: string;
  payback: string;
  tir: string;
  valorizacaoImovel: string;
  sustentabilidade: string;
}

export const CAMPOS_MARKETING_VARIAVEIS: CampoMarketingMeta[] = [
  {
    campo: 'textoEconomiaAnual',
    titulo: 'Texto Economia Anual',
    token: '{valorEconomia}',
    variacoes: [
      {
        id: 1,
        label: 'Original',
        texto: 'Economia anual de R$ {valorEconomia} na conta de energia',
        tecnica: 'Direta/informativa',
      },
      {
        id: 2,
        label: 'Contraste',
        texto:
          'Você vai economizar R$ {valorEconomia} por ano — dinheiro que hoje vai direto pro bolso da distribuidora',
        tecnica: 'Contraste emocional',
      },
      {
        id: 3,
        label: 'Ancoragem',
        texto:
          'R$ {valorEconomia} de economia todo ano. Multiplicado por 25 anos de garantia do sistema.',
        tecnica: 'Ancoragem + projeção temporal',
      },
      {
        id: 4,
        label: 'Presuposição',
        texto: 'A partir de agora, R$ {valorEconomia} por ano deixam de sair da sua conta',
        tecnica: 'Presuposição (decisão assumida)',
      },
      {
        id: 5,
        label: 'Ganho',
        texto:
          'Imagina ter R$ {valorEconomia} a mais todo ano — sem aumentar o consumo, só mudando de onde vem a energia',
        tecnica: 'Pergunta retórica + enquadramento de ganho',
      },
    ],
  },
  {
    campo: 'textoPayback',
    titulo: 'Texto Payback',
    token: '{mesesPayback}',
    variacoes: [
      {
        id: 1,
        label: 'Original',
        texto: 'Investimento se paga em apenas {mesesPayback} meses',
        tecnica: 'Direta/informativa',
      },
      {
        id: 2,
        label: 'Recompensa',
        texto:
          'Em {mesesPayback} meses o sistema já pagou a si mesmo — o resto é lucro puro',
        tecnica: 'Reforço de recompensa',
      },
      {
        id: 3,
        label: 'Comparação',
        texto:
          'Você recupera cada centavo investido em só {mesesPayback} meses — mais rápido que a maioria dos investimentos do mercado',
        tecnica: 'Comparação implícita',
        ressalva: true,
      },
      {
        id: 4,
        label: 'Urgência',
        texto:
          '{mesesPayback} meses. É esse o tempo que falta pra parar de pagar luz e começar a economizar de verdade.',
        tecnica: 'Urgência temporal',
      },
      {
        id: 5,
        label: 'Reenquadramento',
        texto:
          'Em {mesesPayback} meses a conta de luz deixa de ser despesa e vira o retorno do seu investimento',
        tecnica: 'Reenquadramento (despesa → retorno)',
      },
    ],
  },
  {
    campo: 'textoTIR',
    titulo: 'Texto TIR',
    token: '{percentualTIR}',
    variacoes: [
      {
        id: 1,
        label: 'Original',
        texto: 'Taxa Interna de Retorno de {percentualTIR}% ao ano',
        tecnica: 'Direta/técnica',
      },
      {
        id: 2,
        label: 'Comparação',
        texto:
          'Retorno de {percentualTIR}% ao ano — muito acima da poupança e da maioria dos investimentos tradicionais',
        tecnica: 'Comparação concreta',
        ressalva: true,
      },
      {
        id: 3,
        label: 'Objeções',
        texto:
          'Seu dinheiro rende {percentualTIR}% ao ano com o sol — sem taxa de administração, sem imposto de renda',
        tecnica: 'Remoção de objeções',
        ressalva: true,
      },
      {
        id: 4,
        label: 'Contraste',
        texto:
          '{percentualTIR}% ao ano de retorno — o tipo de rendimento que nenhum banco oferece',
        tecnica: 'Contraste com bancos',
        ressalva: true,
      },
      {
        id: 5,
        label: 'Ganho passivo',
        texto:
          '{percentualTIR}% ao ano: o sol trabalhando pro seu bolso enquanto você vive a sua rotina',
        tecnica: 'Personificação + ganho passivo',
      },
    ],
  },
  {
    campo: 'textoValorizacaoImovel',
    titulo: 'Texto Valorização do Imóvel',
    token: '{percentualValorizacao}',
    variacoes: [
      {
        id: 1,
        label: 'Original',
        texto: 'Valorização do imóvel em até {percentualValorizacao}%',
        tecnica: 'Direta/informativa',
      },
      {
        id: 2,
        label: 'Concreto',
        texto:
          'Seu imóvel vale até {percentualValorizacao}% mais com energia solar instalada — um ativo que aparece na hora de vender ou alugar',
        tecnica: 'Concretização do benefício',
        ressalva: true,
      },
      {
        id: 3,
        label: 'Duplo benefício',
        texto:
          'Além de economizar, você aumenta o valor do seu patrimônio em até {percentualValorizacao}%',
        tecnica: 'Economia + patrimônio',
        ressalva: true,
      },
      {
        id: 4,
        label: 'Contraste',
        texto:
          '{percentualValorizacao}% a mais no valor do seu imóvel — um investimento que você não usa, mas carrega no bolso',
        tecnica: 'Contraste de uso',
        ressalva: true,
      },
      {
        id: 5,
        label: 'Prova social',
        texto:
          'Compradores e locatários notam: imóvel com solar tende a valer até {percentualValorizacao}% mais',
        tecnica: 'Prova social implícita',
        ressalva: true,
      },
    ],
  },
  {
    campo: 'textoSustentabilidade',
    titulo: 'Texto Sustentabilidade',
    token: '{tonelaCO2}',
    variacoes: [
      {
        id: 1,
        label: 'Original',
        texto: 'Evita emissão de {tonelaCO2} toneladas de CO₂ em 25 anos (vida útil do sistema)',
        tecnica: 'Direta/informativa',
      },
      {
        id: 2,
        label: 'Ancoragem',
        texto:
          'O equivalente a plantar centenas de árvores: {tonelaCO2} toneladas de CO₂ que deixam de ir pro ar em 25 anos',
        tecnica: 'Ancoragem visual',
        ressalva: true,
      },
      {
        id: 3,
        label: 'Família',
        texto:
          'Você e sua família fazendo parte da solução: {tonelaCO2} toneladas de CO₂ a menos na atmosfera',
        tecnica: 'Pertencimento / valores',
      },
      {
        id: 4,
        label: 'Saúde',
        texto:
          '{tonelaCO2} toneladas de CO₂ que o planeta agradece — e que ficam fora do ar que sua família respira',
        tecnica: 'Ambiental + saúde',
      },
      {
        id: 5,
        label: 'Legado',
        texto:
          'Em 25 anos: {tonelaCO2} toneladas de CO₂ a menos — um legado limpo pra quem vem depois de você',
        tecnica: 'Projeção geracional + legado',
      },
    ],
  },
];

/** Índice 1–5 da variação cujo texto bate com o valor salvo (ou 0 se custom). */
export function encontrarVariacaoAtiva(
  campo: CampoMarketing,
  textoAtual: string
): number {
  const meta = CAMPOS_MARKETING_VARIAVEIS.find((c) => c.campo === campo);
  if (!meta) return 0;
  const t = (textoAtual || '').trim();
  const hit = meta.variacoes.find((v) => v.texto.trim() === t);
  return hit?.id ?? 0;
}

function fmtToken(v: string | number): string {
  if (typeof v === 'number' && Number.isFinite(v)) {
    return v.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
  }
  return String(v ?? '');
}

/** Substitui tokens dos templates ativos da config pelos valores da proposta. */
export function resolverTextosMarketing(
  templates: Partial<TextosMarketingTemplates> | null | undefined,
  tokens: TextosMarketingTokens
): TextosMarketingResolvidos {
  const t = templates || {};
  const vars = {
    valorEconomia: fmtToken(tokens.valorEconomia),
    mesesPayback: fmtToken(tokens.mesesPayback),
    percentualTIR: fmtToken(tokens.percentualTIR),
    percentualValorizacao: fmtToken(tokens.percentualValorizacao),
    tonelaCO2: fmtToken(tokens.tonelaCO2),
  };

  const economiaTpl =
    t.textoEconomiaAnual ||
    CAMPOS_MARKETING_VARIAVEIS[0].variacoes[0].texto;
  const paybackTpl =
    t.textoPayback || CAMPOS_MARKETING_VARIAVEIS[1].variacoes[0].texto;
  const tirTpl = t.textoTIR || CAMPOS_MARKETING_VARIAVEIS[2].variacoes[0].texto;
  const valorizTpl =
    t.textoValorizacaoImovel || CAMPOS_MARKETING_VARIAVEIS[3].variacoes[0].texto;
  const sustTpl =
    t.textoSustentabilidade || CAMPOS_MARKETING_VARIAVEIS[4].variacoes[0].texto;

  return {
    economiaAnual: processarTextoMarketing(economiaTpl, vars),
    payback: processarTextoMarketing(paybackTpl, vars),
    tir: processarTextoMarketing(tirTpl, vars),
    valorizacaoImovel: processarTextoMarketing(valorizTpl, vars),
    sustentabilidade: processarTextoMarketing(sustTpl, vars),
  };
}

/** HTML de lista para o template estático */
export function textosMarketingParaHtml(m: TextosMarketingResolvidos): string {
  const itens = [
    m.economiaAnual,
    m.payback,
    m.tir,
    m.valorizacaoImovel,
    m.sustentabilidade,
  ].filter(Boolean);
  return itens.map((txt) => `<li>${txt}</li>`).join('\n');
}
