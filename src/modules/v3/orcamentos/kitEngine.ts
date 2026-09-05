import { getV3Db } from '../db/sqlite';
import { getEstoqueMinimoPreco, resolverPrecoEquipamento } from '../precos/repository';
import { resolveEquipPorSkuCanonico, ensureSkuCanonicoLinks } from './skuCanonico';

export interface KitItemInput {
  sku_interno: string;
  quantidade: number;
  /** se true, não será sobrescrito pela sugestão automática */
  editado_manual?: boolean;
}

export interface KitItemCalculado {
  equipamento_id: number;
  sku_interno: string;
  nome: string;
  categoria: string;
  quantidade: number;
  preco_unitario: number | null;
  estoque: number | null;
  subtotal: number;
  valido_preco: boolean;
  sugerido: boolean;
  editado_manual: boolean;
  aviso?: string;
  /** Preço veio de outro CD */
  preco_fallback?: boolean;
  preco_origem_cd_id?: number;
  preco_origem_cd_nome?: string;
}

export interface KitCalculoResult {
  cd_id: number;
  cd_nome: string;
  itens: KitItemCalculado[];
  custo_total: number;
  breakdown: Record<string, number>;
  avisos: string[];
  regras: Record<string, number | string>;
}

function regraNum(chave: string, fallback: number): number {
  const db = getV3Db();
  const row = db.prepare('SELECT valor_json FROM kits_regras WHERE chave = ?').get(chave) as
    | { valor_json: string }
    | undefined;
  const n = Number(row?.valor_json);
  return Number.isFinite(n) ? n : fallback;
}

function findEquipBySku(sku: string) {
  try {
    ensureSkuCanonicoLinks();
  } catch {
    /* ignore */
  }
  return resolveEquipPorSkuCanonico(sku);
}

function montarItemPreco(
  eq: { id: number; sku_interno: string; nome: string; categoria: string },
  qtd: number,
  cdId: number,
  opts: { sugerido: boolean; editado_manual: boolean; permitirFallback?: boolean }
): KitItemCalculado {
  const minEstoque = getEstoqueMinimoPreco();
  const permitirFallback =
    opts.permitirFallback !== false &&
    !['modulo', 'inversor', 'microinversor'].includes(eq.categoria);

  const resolved = resolverPrecoEquipamento(eq.id, cdId, {
    permitirFallback,
    // Sempre tenta CD local válido primeiro; fallback se faltar
    exigirValidoEstoque: true,
  });

  const preco = resolved?.preco_custo ?? null;
  const estoque = resolved?.estoque ?? null;
  const valido = Boolean(resolved?.valido && preco != null && preco > 0);
  const fallback = Boolean(resolved?.fallback);

  let aviso: string | undefined;
  if (!valido) {
    aviso = `Sem preço válido em nenhum CD (estoque>${minEstoque})`;
  } else if (fallback && resolved) {
    aviso = `Preço do CD ${resolved.cd_origem_nome} (fallback)`;
  } else if (estoque != null && qtd > estoque) {
    aviso = `Qtd ${qtd} > estoque ${estoque}${fallback && resolved ? ` @ ${resolved.cd_origem_nome}` : ''}`;
  }

  return {
    equipamento_id: eq.id,
    sku_interno: eq.sku_interno,
    nome: eq.nome,
    categoria: eq.categoria,
    quantidade: qtd,
    preco_unitario: preco,
    estoque,
    subtotal: preco != null ? qtd * preco : 0,
    valido_preco: valido,
    sugerido: opts.sugerido,
    editado_manual: opts.editado_manual,
    aviso,
    preco_fallback: fallback || undefined,
    preco_origem_cd_id: resolved?.cd_origem_id,
    preco_origem_cd_nome: resolved?.cd_origem_nome,
  };
}

function pushItem(map: Map<string, KitItemCalculado>, item: KitItemCalculado, mergeQty = false) {
  const prev = map.get(item.sku_interno);
  if (prev && mergeQty) {
    prev.quantidade += item.quantidade;
    prev.subtotal = prev.preco_unitario != null ? prev.quantidade * prev.preco_unitario : 0;
    map.set(item.sku_interno, prev);
  } else if (!prev || item.editado_manual) {
    map.set(item.sku_interno, item);
  }
}

/**
 * Premissas MC4 / cabos (3a semi-auto + 4a auto) — ver README V3 + VERSION.md.
 *
 * Strings por potência CA (orçamento aproximado — despreza modelo/MPPT):
 * | Potência CA     | Total strings |
 * | ≤3,5 kW         | 1  |
 * | 6–8 kW          | 2  |  ← atalho comercial
 * | demais ≤25 kW   | 4  |
 * | ≤36 kW          | 6  |
 * | ≤49 kW          | 8  |
 * | ≤55 kW (~50)    | 12 |
 * | ≤65 kW (~60)    | 18 |
 * | >65 kW (70+)    | 24 |
 *
 * Cabo 25 m: 1 bola preta + 1 bola vermelha **por string** (`cabo_25m_por_string` = 1).
 */
export function estimarStringsInversor(potKw?: number | null): number {
  if (potKw == null || !Number.isFinite(potKw) || potKw <= 0) return 1;
  if (potKw <= 3.5) return 1;
  // Atalho: 6–8 kW → 2 strings (+/−)
  if (potKw >= 6 && potKw <= 8) return 2;
  if (potKw <= 25) return 4;
  if (potKw <= 36) return 6;
  if (potKw <= 49) return 8;
  if (potKw <= 55) return 12;
  if (potKw <= 65) return 18;
  return 24;
}

/** Sugere estrutura/cabos/conectores a partir de módulos + inversor (editável depois). */
export function sugerirComplementos(opts: {
  cdId: number;
  qtdModulos: number;
  qtdInversores?: number;
  potenciaModuloW?: number | null;
  potenciaInversorKw?: number | null;
  isMicro?: boolean;
}): KitItemInput[] {
  const modsPorKit = regraNum('estrutura_modulos_por_kit', 4);
  const caboPorString = regraNum('cabo_25m_por_string', 1);
  const trilhoAte = regraNum('trilho_236_ate_wp', 690);
  const paresPorKitMc4 = regraNum('mc4_pares_por_kit', 2);

  const out: KitItemInput[] = [];
  const qtdInv = Math.max(1, opts.qtdInversores || 1);

  if (opts.qtdModulos > 0) {
    const kitsEstrutura = Math.ceil(opts.qtdModulos / modsPorKit);
    out.push({ sku_interno: 'KIT-ESTRUTURA-4MOD', quantidade: kitsEstrutura });

    // Premissa: 1 trilho/perfil por módulo (sempre)
    const wp = opts.potenciaModuloW || 0;
    if (wp > 0 && wp <= trilhoAte) {
      out.push({ sku_interno: 'TRILHO-236', quantidade: opts.qtdModulos });
    } else if (wp > trilhoAte) {
      out.push({ sku_interno: 'TRILHO-250', quantidade: opts.qtdModulos });
    } else {
      out.push({ sku_interno: 'TRILHO-236', quantidade: opts.qtdModulos });
    }
  }

  if (opts.isMicro) {
    // 1 módulo ≈ 1 string no micro; desconta 1 par por micro (módulo perto da placa)
    const strings = Math.max(0, opts.qtdModulos);
    const paresNecessarios = Math.max(0, strings - qtdInv);
    const kitsMc4 =
      paresNecessarios > 0 ? Math.ceil(paresNecessarios / paresPorKitMc4) : 0;
    if (kitsMc4 > 0) {
      out.push({ sku_interno: 'MC4-PAR', quantidade: kitsMc4 });
    }
    // Extensão quase sempre cabo preto: vermelho = 0; pretos = max(0, nMicros - 1)
    const bolasPretas = Math.max(0, qtdInv - 1);
    if (bolasPretas > 0) {
      out.push({ sku_interno: 'CABO-4MM-25-P', quantidade: bolasPretas });
    }
    // CABO-4MM-25-V omitido (qtd 0) no micro
  } else {
    const strings = estimarStringsInversor(opts.potenciaInversorKw) * qtdInv;
    // MC4 kits = nº de strings (1 string → 1 kit MC4)
    if (strings > 0) {
      out.push({ sku_interno: 'MC4-PAR', quantidade: strings });
    }
    // Bola 25 m: par (V + P) = nº de strings
    const paresCabo = strings * caboPorString;
    if (paresCabo > 0) {
      out.push({ sku_interno: 'CABO-4MM-25-V', quantidade: paresCabo });
      out.push({ sku_interno: 'CABO-4MM-25-P', quantidade: paresCabo });
    }
  }

  return out;
}

export function calcularOrcamentoBase(opts: {
  cdId: number;
  itens: KitItemInput[];
  autoComplementos?: boolean;
}): KitCalculoResult {
  const db = getV3Db();
  const cd = db.prepare('SELECT id, nome FROM cds WHERE id = ?').get(opts.cdId) as
    | { id: number; nome: string }
    | undefined;
  if (!cd) throw new Error(`CD id=${opts.cdId} não encontrado`);

  const avisos: string[] = [];
  const map = new Map<string, KitItemCalculado>();

  const manualSkus = new Set(
    opts.itens.filter((i) => i.editado_manual).map((i) => i.sku_interno)
  );

  for (const raw of opts.itens) {
    const eq = findEquipBySku(raw.sku_interno);
    if (!eq) {
      avisos.push(`SKU não cadastrado: ${raw.sku_interno}`);
      continue;
    }
    const qtd = Number(raw.quantidade) || 0;
    if (qtd <= 0) continue;
    pushItem(
      map,
      montarItemPreco(eq, qtd, opts.cdId, {
        sugerido: false,
        editado_manual: Boolean(raw.editado_manual),
        permitirFallback: true,
      })
    );
  }

  if (opts.autoComplementos !== false) {
    const mods = [...map.values()].filter((i) => i.categoria === 'modulo');
    const invs = [...map.values()].filter(
      (i) => i.categoria === 'inversor' || i.categoria === 'microinversor'
    );
    const qtdModulos = mods.reduce((s, i) => s + i.quantidade, 0);
    const qtdInversores = invs.reduce((s, i) => s + i.quantidade, 0);
    const mod = mods[0];
    const inv = invs[0];
    const eqMod = mod ? findEquipBySku(mod.sku_interno) : undefined;
    const eqInv = inv ? findEquipBySku(inv.sku_interno) : undefined;

    if (qtdModulos > 0) {
      const sugestoes = sugerirComplementos({
        cdId: opts.cdId,
        qtdModulos,
        qtdInversores: qtdInversores || 1,
        potenciaModuloW: eqMod?.potencia_w,
        potenciaInversorKw: eqInv?.potencia_kw,
        isMicro: eqInv?.categoria === 'microinversor',
      });
      for (const s of sugestoes) {
        const eq = findEquipBySku(s.sku_interno);
        if (!eq) {
          avisos.push(`Complemento sem cadastro: ${s.sku_interno}`);
          continue;
        }
        if (
          manualSkus.has(s.sku_interno) ||
          manualSkus.has(eq.sku_interno) ||
          map.has(eq.sku_interno) ||
          map.has(s.sku_interno)
        ) {
          continue;
        }
        pushItem(
          map,
          montarItemPreco(eq, s.quantidade, opts.cdId, {
            sugerido: true,
            editado_manual: false,
            permitirFallback: true,
          })
        );
      }
    }
  }

  const itens = [...map.values()].sort(
    (a, b) => a.categoria.localeCompare(b.categoria) || a.nome.localeCompare(b.nome)
  );
  const breakdown: Record<string, number> = {};
  let custo_total = 0;
  for (const it of itens) {
    custo_total += it.subtotal;
    breakdown[it.categoria] = (breakdown[it.categoria] || 0) + it.subtotal;
    if (it.aviso) avisos.push(`${it.sku_interno}: ${it.aviso}`);
  }

  return {
    cd_id: cd.id,
    cd_nome: cd.nome,
    itens,
    custo_total: Math.round(custo_total * 100) / 100,
    breakdown,
    avisos,
    regras: {
      estrutura_modulos_por_kit: regraNum('estrutura_modulos_por_kit', 4),
      cabo_25m_por_string: regraNum('cabo_25m_por_string', 1),
      mc4_pares_por_kit: regraNum('mc4_pares_por_kit', 2),
      estoque_minimo_preco: getEstoqueMinimoPreco(),
    },
  };
}

export function listCatalogoComPreco(cdId: number) {
  const db = getV3Db();
  return db
    .prepare(
      `SELECT e.id, e.sku_interno, e.nome, e.marca, e.categoria, e.potencia_w, e.potencia_kw,
              p.preco_custo, p.estoque, p.valido_estoque
       FROM equipamentos e
       LEFT JOIN precos_cd p ON p.equipamento_id = e.id AND p.cd_id = ?
       WHERE e.ativo = 1
       ORDER BY e.categoria, e.prioridade_kit, e.nome`
    )
    .all(cdId) as Array<{
    id: number;
    sku_interno: string;
    nome: string;
    marca: string | null;
    categoria: string;
    potencia_w: number | null;
    potencia_kw: number | null;
    preco_custo: number | null;
    estoque: number | null;
    valido_estoque: number | null;
  }>;
}
