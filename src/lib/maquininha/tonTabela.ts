/**
 * Tabela de taxas da maquininha (Ton) — `tontaxa.json` na raiz do projeto.
 *
 * Estrutura do arquivo (export da planilha da Ton):
 * - `Modalidade`: "Débito" | "Crédito à vista" | "Parcelado em Nx"
 * - Colunas de taxa, uma por prazo de recebimento × faixa de faturamento mensal:
 *   - `Todas as faixas Na Hora`                       → recebimento no mesmo dia
 *   - `Até R$20mil 1 dia útil`                        → faixa 0
 *   - `R$20mil até R$40mil 1 dia útil`                → faixa 1
 *   - `R$40mil até R$80mil 1 dia útil`                → faixa 2
 *   - `Acima de R$80mil 1 dia útil`                   → faixa 3
 *
 * Regra de negócio (PIENG): a taxa vigente é a do **prazo de recebimento** escolhido
 * (`naHora` ou `1 dia útil`) na **faixa de faturamento** atual. Hoje a faixa é a
 * primeira (até R$ 20 mil); se o faturamento subir, troca-se `faixaEfetiva` nas
 * configs — sem alterar código.
 *
 * ⚠️ O prazo de recebimento (`naHora` vs `1 dia útil`) muda a taxa, então **não** é
 * possível usar a coluna "Na Hora" para reproduzir o repasse de 1 dia útil.
 *
 * Juros por parcela N (N ≥ 2): `jurosParcela(N) = 1 − (1 + jurosTotal(N))^(−1/N)`.
 */

/** Arquivo lido do filesystem (também usado no browser, vindo da API de config). */
export const TON_TABELA_FILENAME = 'tontaxa.json';

/** Prazos de recebimento disponíveis nas colunas da tabela. */
export const PRAZOS_RECEBIMENTO = {
  naHora: 'Todas as faixas Na Hora',
  umDiaUtil: '1 dia útil',
} as const;

export type PrazoRecebimento = keyof typeof PRAZOS_RECEBIMENTO;

export const PRAZO_RECEBIMENTO_PADRAO: PrazoRecebimento = 'umDiaUtil';

/** Faixas de faturamento mensal (índice 0 = até R$ 20 mil). */
export const FAIXAS_TON = [
  { indice: 0, label: 'Até R$20 mil', coluna: 'Até R$20mil 1 dia útil' },
  { indice: 1, label: 'R$20 mil a R$40 mil', coluna: 'R$20mil até R$40mil 1 dia útil' },
  { indice: 2, label: 'R$40 mil a R$80 mil', coluna: 'R$40mil até R$80mil 1 dia útil' },
  { indice: 3, label: 'Acima de R$80 mil', coluna: 'Acima de R$80mil 1 dia útil' },
] as const;

/**
 * Faixa vigente. Negócio: começamos na primeira faixa (até R$ 20 mil) e
 * subimos quando as vendas passarem de R$ 20 mil/mês.
 */
export const FAIXA_TON_PADRAO = 0;

/** Linha `Modalidade` → total de parcelas (Total = valor financiado × multiplicador). */
export type LinhasTon = Record<number, number>;

/**
 * Converte `"1,36%"` → `1.36`.
 * Aceita também `0.0136` (fração) e strings já limpas (`"1.36"`).
 */
export function parseTaxaTon(raw: unknown): number | null {
  if (typeof raw === 'number') {
    if (!Number.isFinite(raw) || raw < 0) return null;
    // Fração (ex.: 0,0136) → percentual
    return raw > 0 && raw <= 1 ? raw * 100 : raw;
  }
  if (raw == null) return null;
  const texto = String(raw).trim();
  if (!texto) return null;
  const semSimbolos = texto.replace(/[%\s]/g, '');
  if (!semSimbolos) return null;
  // pt-BR: ponto = milhar, vírgula = decimal
  const normalized = semSimbolos.includes(',')
    ? semSimbolos.replace(/\./g, '').replace(',', '.')
    : semSimbolos;
  const n = parseFloat(normalized);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

/** `"Parcelado em 18x"` → 18 · `"Crédito à vista"` → 1 · `"Débito"` → null */
export function parcelasDaModalidade(modalidade: string): number | null {
  const texto = String(modalidade || '').toLowerCase();
  const match = texto.match(/parcelado\s+em\s+(\d+)/);
  if (match) {
    const n = parseInt(match[1], 10);
    return Number.isFinite(n) && n >= 2 ? n : null;
  }
  if (texto.includes('à vista') || texto.includes('a vista')) return 1;
  return null;
}

/** Nome da coluna de taxa para um prazo × faixa. */
export function nomeColunaTaxa(
  prazo: PrazoRecebimento,
  faixa: number = FAIXA_TON_PADRAO
): string {
  if (prazo === 'naHora') return PRAZOS_RECEBIMENTO.naHora;
  const alvo = FAIXAS_TON[Math.min(Math.max(0, Math.trunc(faixa)), FAIXAS_TON.length - 1)];
  return alvo.coluna;
}

/**
 * Lê o JSON da Ton (string ou objeto já parseado) e devolve os **totais %** por parcela.
 * Cobre automaticamente até 21x (qualquer N presente no arquivo).
 */
export function parseTabelaTon(
  conteudo: string | unknown,
  prazo: PrazoRecebimento = PRAZO_RECEBIMENTO_PADRAO,
  faixa: number = FAIXA_TON_PADRAO
): LinhasTon {
  let rows: unknown = conteudo;
  if (typeof conteudo === 'string') {
    try {
      rows = JSON.parse(conteudo);
    } catch {
      throw new Error(`${TON_TABELA_FILENAME}: JSON inválido`);
    }
  }
  if (!Array.isArray(rows)) {
    throw new Error(`${TON_TABELA_FILENAME}: esperado um array de modalidades`);
  }

  const coluna = nomeColunaTaxa(prazo, faixa);
  const out: LinhasTon = {};

  for (const row of rows) {
    if (!row || typeof row !== 'object') continue;
    const rec = row as Record<string, unknown>;
    const parcelas = parcelasDaModalidade(String(rec.Modalidade ?? ''));
    if (parcelas == null) continue;
    const taxa = parseTaxaTon(rec[coluna]);
    if (taxa == null) continue;
    out[parcelas] = taxa;
  }

  if (!out[1]) {
    throw new Error(`${TON_TABELA_FILENAME}: modalidade "Crédito à vista" não encontrada`);
  }

  const parcelasDisponiveis = Object.keys(out)
    .map(Number)
    .sort((a, b) => a - b);
  const maior = parcelasDisponiveis[parcelasDisponiveis.length - 1] || 1;

  // Garante monotonicidade (tabela digitada à mão pode ter degrau para baixo)
  for (let n = 2; n <= maior; n++) {
    if (out[n] == null) continue;
    if (out[n] < out[n - 1]) out[n] = out[n - 1];
  }

  return out;
}

/** Maior número de parcelas presente na tabela (ex.: 21). */
export function maxParcelasTon(totais: LinhasTon): number {
  return Object.keys(totais).reduce((acc, k) => Math.max(acc, Number(k)), 1);
}

/**
 * Juros **por parcela** (a.m.) a partir do total %: `1 − (1 + total)^(−1/N)`.
 * Para N = 1 devolve o próprio total (MDR à vista, não é "taxa mensal").
 */
export function jurosParcelaMensal(totalPercent: number, parcelas: number): number {
  const total = Number(totalPercent) / 100;
  const n = Math.round(Number(parcelas));
  if (!Number.isFinite(total) || total <= 0) return 0;
  if (!Number.isFinite(n) || n <= 1) return Number(totalPercent) || 0;
  const juros = (1 - Math.pow(1 + total, -1 / n)) * 100;
  return Math.round(juros * 1e6) / 1e6;
}

/**
 * Multiplicador comercial = (1 + total%). É o número aplicado sobre o PIX
 * (à vista = multiplicador em 12×, conforme regra do card).
 */
export function multiplicadorFromTotal(totalPercent: number): number {
  const m = 1 + Number(totalPercent) / 100;
  return Math.round((Number.isFinite(m) && m > 0 ? m : 1) * 1e6) / 1e6;
}

/** `{ 1: 11.92, ... 21: 20.64 }` → `{ 1: 1.1192, ... 21: 1.2064 }` */
export function multiplicadoresFromTotais(totais: LinhasTon): Record<number, number> {
  const out: Record<number, number> = {};
  for (const [k, total] of Object.entries(totais)) {
    out[Number(k)] = multiplicadorFromTotal(total);
  }
  return out;
}
