/**
 * SKUs canônicos do motor 3a/4a → equipamentos reais (captura SOOLLAR *-AUTO-*).
 */
import { getV3Db } from '../db/sqlite';

export type EquipRow = {
  id: number;
  sku_interno: string;
  nome: string;
  categoria: string;
  potencia_w: number | null;
  potencia_kw: number | null;
};

/** Ordem de preferência: default comercial = fibro inox madeira + perfil fibro */
export const SKU_CANONICO_CANDIDATOS: Record<string, string[]> = {
  'KIT-ESTRUTURA-4MOD': [
    'KIT-ESTRUTURA-4MOD',
    'EST-AUTO-391003', // fibro + parafuso inox madeira · 4 mód (default preço)
    'EST-AUTO-391004', // fibro inox metal
    'EST-AUTO-361048',
    'EST-AUTO-391005', // metal mini-trilho (alternativa)
    'EST-AUTO-474800', // fibro galvanizado madeira
  ],
  // Default preço: perfil fibro/cerâmica (composição); qtd final no fechamento
  'TRILHO-236': ['TRILHO-236', 'EST-AUTO-52835', 'EST-AUTO-525714'],
  'TRILHO-250': ['TRILHO-250', 'EST-AUTO-52835', 'EST-AUTO-525714'],
  'CABO-4MM-25-V': ['CABO-4MM-25-V', 'CAB-AUTO-97082'],
  'CABO-4MM-25-P': ['CABO-4MM-25-P', 'CAB-AUTO-97081'],
  'MC4-PAR': ['MC4-PAR', 'MC4-AUTO-440111'],
};

const SKU_CANONICO_PADRAO: Record<
  string,
  { categoria: string; like: string[]; notLike?: string[] }
> = {
  'KIT-ESTRUTURA-4MOD': {
    categoria: 'estrutura',
    // Preferir fibro + inox + madeira (default preço)
    like: ['%FIBRO%INOX%MADEIRA%4%', '%FIBROCIMENTO%INOX%MADEIRA%'],
    notLike: ['%MICROINVERSOR%', '%GRAMPO%', '%JUNÇÃO%', '%JUNCAO%', '%PARAFUSO%100%', '%METALICA%', '%GALVANIZ%'],
  },
  'TRILHO-236': {
    categoria: 'estrutura',
    like: ['%PERFIL%FIBRO%', '%2,40MT%FIBRO%', '%2.40MT%FIBRO%', '%2,36%', '%2.36%'],
  },
  'TRILHO-250': {
    categoria: 'estrutura',
    like: ['%PERFIL%FIBRO%', '%2,40MT%FIBRO%', '%2.70%', '%2,50%', '%2.50%'],
  },
  'CABO-4MM-25-V': {
    categoria: 'cabo',
    like: ['%CABO SOLAR%4MM%VERMELHO%25%'],
  },
  'CABO-4MM-25-P': {
    categoria: 'cabo',
    like: ['%CABO SOLAR%4MM%PRETO%25%'],
  },
  'MC4-PAR': {
    categoria: 'conector',
    like: ['%MC4%'],
  },
};

function pickBySku(sku: string, onlyAtivo: boolean): EquipRow | undefined {
  const db = getV3Db();
  if (onlyAtivo) {
    return db
      .prepare(
        `SELECT id, sku_interno, nome, categoria, potencia_w, potencia_kw
         FROM equipamentos WHERE sku_interno = ? AND ativo = 1`
      )
      .get(sku) as EquipRow | undefined;
  }
  return db
    .prepare(
      `SELECT id, sku_interno, nome, categoria, potencia_w, potencia_kw
       FROM equipamentos WHERE sku_interno = ?`
    )
    .get(sku) as EquipRow | undefined;
}

function pickByAlias(sku: string): EquipRow | undefined {
  const db = getV3Db();
  return db
    .prepare(
      `SELECT e.id, e.sku_interno, e.nome, e.categoria, e.potencia_w, e.potencia_kw
       FROM equipamentos e
       JOIN equipamento_aliases a ON a.equipamento_id = e.id
       WHERE e.ativo = 1 AND LOWER(TRIM(a.texto_match)) = LOWER(TRIM(?))
       LIMIT 1`
    )
    .get(sku) as EquipRow | undefined;
}

function pickByPattern(sku: string): EquipRow | undefined {
  const rule = SKU_CANONICO_PADRAO[sku];
  if (!rule) return undefined;
  const db = getV3Db();
  const rows = db
    .prepare(
      `SELECT id, sku_interno, nome, categoria, potencia_w, potencia_kw, prioridade_kit
       FROM equipamentos WHERE ativo = 1 AND categoria = ?`
    )
    .all(rule.categoria) as Array<EquipRow & { prioridade_kit: number }>;

  const u = (s: string) => s.toUpperCase();
  const scored = rows
    .map((r) => {
      const nome = u(r.nome);
      if (rule.notLike?.some((n) => nome.includes(u(n.replace(/%/g, ''))))) {
        return null;
      }
      const ok = rule.like.some((pat) => {
        const parts = pat.split('%').filter(Boolean).map(u);
        let idx = 0;
        for (const p of parts) {
          const found = nome.indexOf(p, idx);
          if (found < 0) return false;
          idx = found + p.length;
        }
        return true;
      });
      if (!ok) return null;
      return r;
    })
    .filter(Boolean) as Array<EquipRow & { prioridade_kit: number }>;

  scored.sort((a, b) => (a.prioridade_kit || 100) - (b.prioridade_kit || 100));
  return scored[0];
}

/** Resolve SKU canônico ou direto para equipamento ativo (fallback inativo). */
export function resolveEquipPorSkuCanonico(sku: string): EquipRow | undefined {
  const key = (sku || '').trim();
  if (!key) return undefined;

  const direct = pickBySku(key, true);
  if (direct) return direct;

  const candidates = SKU_CANONICO_CANDIDATOS[key] || [key];
  for (const c of candidates) {
    const row = pickBySku(c, true);
    if (row) return row;
  }

  const viaAlias = pickByAlias(key);
  if (viaAlias) return viaAlias;

  const viaPattern = pickByPattern(key);
  if (viaPattern) return viaPattern;

  for (const c of candidates) {
    const row = pickBySku(c, false);
    if (row) return row;
  }

  return undefined;
}

/**
 * Garante aliases canônicos → equipamentos SOOLLAR e ativa trilho perfil se existir.
 * Idempotente — pode rodar no boot / seed.
 */
export function ensureSkuCanonicoLinks(): { linked: string[]; activated: string[] } {
  const db = getV3Db();
  const linked: string[] = [];
  const activated: string[] = [];

  const insAlias = db.prepare(
    'INSERT OR IGNORE INTO equipamento_aliases (equipamento_id, texto_match) VALUES (?, ?)'
  );

  // Ativa defaults comerciais (fibro inox madeira + perfis) antes do vínculo
  const ativarDefault = ['EST-AUTO-391003', 'EST-AUTO-52835', 'EST-AUTO-525714'];
  for (const sku of ativarDefault) {
    const row = pickBySku(sku, false);
    if (!row) continue;
    const st = db.prepare('SELECT ativo FROM equipamentos WHERE id = ?').get(row.id) as {
      ativo: number;
    };
    const prioridade = sku === 'EST-AUTO-391003' || sku === 'EST-AUTO-52835' ? 35 : null;
    if (st.ativo !== 1) {
      if (prioridade != null) {
        db.prepare(
          `UPDATE equipamentos SET ativo = 1, prioridade_kit = ?, updated_at = datetime('now') WHERE id = ?`
        ).run(prioridade, row.id);
      } else {
        db.prepare(
          `UPDATE equipamentos SET ativo = 1, updated_at = datetime('now') WHERE id = ?`
        ).run(row.id);
      }
      activated.push(row.sku_interno);
    } else if (prioridade != null) {
      db.prepare(
        `UPDATE equipamentos SET prioridade_kit = ?, updated_at = datetime('now') WHERE id = ?`
      ).run(prioridade, row.id);
    }
  }

  for (const [canonico, candidatos] of Object.entries(SKU_CANONICO_CANDIDATOS)) {
    let eq: EquipRow | undefined;
    for (const c of candidatos) {
      if (c === canonico) continue;
      const row = pickBySku(c, true);
      if (row) {
        eq = row;
        break;
      }
    }
    if (!eq) {
      for (const c of candidatos) {
        if (c === canonico) continue;
        const row = pickBySku(c, false);
        if (row) {
          eq = row;
          break;
        }
      }
    }
    if (!eq) eq = pickByPattern(canonico);
    if (!eq) continue;

    insAlias.run(eq.id, canonico);
    insAlias.run(eq.id, eq.nome.slice(0, 120));
    linked.push(`${canonico}→${eq.sku_interno}`);
  }

  return { linked, activated };
}
