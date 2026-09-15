/**
 * Reconstrói cards V3 (auto/kits) a partir dos sistemas da proposta salva.
 * Usado quando Editar → gerador → Voltar e o rascunho/localStorage está vazio.
 */

export type AltRestore = {
  titulo: string;
  tipo: string;
  sku_modulo: string;
  sku_inversor: string;
  nome_modulo?: string;
  nome_inversor?: string;
  marca_modulo?: string | null;
  marca_inversor?: string | null;
  potencia_modulo_w?: number;
  potencia_inversor_kw?: number;
  qtd_modulos: number;
  qtd_inversores: number;
  potencia_kwp: number;
  geracao_mensal_kwh: number;
  cobertura_pct: number | null;
  custo_total: number;
  precos: { custo: number; despesa: number; aVista: number; pix: number };
  comercial?: {
    pcusto: number;
    pdespesa_fixo: number;
    pdespesa_variavel_percent: number;
    pdespesa_variavel_valor: number;
    pdespesa_total: number;
    total_final: number;
    ppix: number;
    pavista: number;
    p12x: number;
    p12x_total: number;
    p18x_parcela: number;
    formula: string;
  };
  frete?: number;
  origem?: 'manual_3a' | 'auto';
  breakdown: Record<string, number>;
};

export type KitRestore = {
  id: string;
  titulo: string;
  cdId: number;
  sku_modulo: string;
  sku_inversor: string;
  nome_modulo: string;
  nome_inversor: string;
  categoria_inv: string;
  qtd_modulos: number;
  qtd_inversores: number;
  custo_total: number | null;
};

function num(v: unknown, fallback = 0): number {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? '').replace(',', '.'));
  return Number.isFinite(n) ? n : fallback;
}

function guessMicro(s: Record<string, unknown>): boolean {
  const potInv = num(s.pot_inv);
  const qtdInv = num(s.inversores, 1);
  const titulo = String(s.titulo || s.nome || '').toLowerCase();
  if (/micro/.test(titulo)) return true;
  if (potInv > 0 && potInv <= 2.5 && qtdInv >= 2) return true;
  return false;
}

/** Alternativas da proposta automática a partir de `sistemas[]`. */
export function altsFromPropostaSistemas(sistemas: unknown[]): AltRestore[] {
  if (!Array.isArray(sistemas) || !sistemas.length) return [];
  return sistemas.map((raw, i) => {
    const s = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
    const qtdMod = Math.max(0, Math.round(num(s.modulos)));
    const qtdInv = Math.max(1, Math.round(num(s.inversores, 1)));
    const potW = num(s.pot_modulo);
    const potKwInv = num(s.pot_inv);
    const pcusto = num(s.pcusto ?? s.precoCusto ?? s.valorTotal);
    const ppix = num(s.ppix ?? s.precoPixDecimal ?? s.precoAtual);
    const pavista = num(s.pavista ?? s.priscado ?? ppix);
    const pdespesaFixo = num(s.pdespesa_fixo ?? s.pdespesaFixo);
    const pdespesaVar = num(s.pdespesa_variavel_percent ?? s.pdespesaVariavel);
    const pdespesaTotal = num(s.pdespesa_total ?? s.pdespesaTotal);
    const geracao = num(s.geracaoMensal ?? String(s.geracao || '').replace(/[^\d.,]/g, ''));
    const coberturaRaw = s.cobertura;
    const cobertura =
      typeof coberturaRaw === 'number'
        ? coberturaRaw
        : num(String(coberturaRaw || '').replace('%', ''), NaN);
    const isMicro = guessMicro(s);
    const marcaM = s.marca_modulo != null ? String(s.marca_modulo) : null;
    const marcaI = s.marca_inversor != null ? String(s.marca_inversor) : null;
    const kwp =
      potW > 0 && qtdMod > 0
        ? Math.round(((qtdMod * potW) / 1000) * 100) / 100
        : num(s.potTotal);

    return {
      titulo: String(s.titulo || s.nome || `Sistema ${i + 1}`),
      tipo: isMicro ? 'micro' : 'string',
      sku_modulo: String(s.sku_modulo || ''),
      sku_inversor: String(s.sku_inversor || ''),
      nome_modulo: marcaM || undefined,
      nome_inversor: marcaI || undefined,
      marca_modulo: marcaM,
      marca_inversor: marcaI,
      potencia_modulo_w: potW || undefined,
      potencia_inversor_kw: potKwInv || undefined,
      qtd_modulos: qtdMod,
      qtd_inversores: qtdInv,
      potencia_kwp: kwp,
      geracao_mensal_kwh: geracao,
      cobertura_pct: Number.isFinite(cobertura) ? cobertura : null,
      custo_total: pcusto,
      precos: {
        custo: pcusto,
        despesa: pdespesaTotal,
        aVista: pavista,
        pix: ppix,
      },
      comercial: {
        pcusto,
        pdespesa_fixo: pdespesaFixo,
        pdespesa_variavel_percent: pdespesaVar,
        pdespesa_variavel_valor: Math.max(0, pdespesaTotal - pdespesaFixo),
        pdespesa_total: pdespesaTotal,
        total_final: ppix || pavista || pcusto,
        ppix,
        pavista,
        p12x: num(s.p12x),
        p12x_total: num(s.p12x_total),
        p18x_parcela: num(s.p18x_parcela),
        formula: 'restaurado da proposta',
      },
      frete: num(s.frete),
      origem: 'auto' as const,
      breakdown: {},
    };
  });
}

/** Cards da tela de kits a partir de `sistemas[]`. */
export function kitsFromPropostaSistemas(sistemas: unknown[], cdId = 3): KitRestore[] {
  if (!Array.isArray(sistemas) || !sistemas.length) return [];
  return sistemas.map((raw, i) => {
    const s = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
    const qtdMod = Math.max(0, Math.round(num(s.modulos)));
    const qtdInv = Math.max(1, Math.round(num(s.inversores, 1)));
    const potW = num(s.pot_modulo);
    const isMicro = guessMicro(s);
    const marcaM = String(s.marca_modulo || 'Módulo');
    const marcaI = String(s.marca_inversor || 'Inversor');
    const pcusto = num(s.pcusto ?? s.precoCusto);
    const tipo = isMicro ? 'Micro' : 'String';
    return {
      id: `restore-${i}-${qtdMod}x${qtdInv}`,
      titulo: `${String(s.titulo || `Kit ${i + 1}`)} · ${tipo} ${qtdMod}×${potW || '?'}W`,
      cdId,
      sku_modulo: String(s.sku_modulo || ''),
      sku_inversor: String(s.sku_inversor || ''),
      nome_modulo: marcaM,
      nome_inversor: marcaI,
      categoria_inv: isMicro ? 'microinversor' : 'inversor',
      qtd_modulos: qtdMod,
      qtd_inversores: qtdInv,
      custo_total: pcusto || null,
    };
  });
}
