/**
 * Seed de equipamentos a partir de temp/orcamento_executados.yaml
 * Extrai módulos e inversores únicos usados nos orçamentos reais.
 */
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { upsertBySkuInterno } from './repository';
import type { EquipamentoCategoria, EquipamentoInput } from './types';

function slugify(parts: Array<string | number | null | undefined>): string {
  return parts
    .filter(Boolean)
    .join('-')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toUpperCase();
}

function parsePotenciaW(raw: string | number | undefined | null): number | null {
  if (raw == null) return null;
  const s = String(raw).toUpperCase().replace(',', '.');
  const m = s.match(/(\d+(?:\.\d+)?)\s*W/);
  if (m) return parseFloat(m[1]);
  const only = s.match(/^(\d+(?:\.\d+)?)$/);
  if (only) {
    const n = parseFloat(only[1]);
    return n > 100 ? n : null;
  }
  return null;
}

function parsePotenciaKw(raw: string | number | undefined | null): number | null {
  if (raw == null) return null;
  const s = String(raw).toUpperCase().replace(',', '.');
  // 2.25K-G4, 3KW-R5, 6KW, 2.25K
  const m = s.match(/(\d+(?:\.\d+)?)\s*K/);
  if (m) return parseFloat(m[1]);
  return null;
}

function isMicro(potencia: string, marca: string): boolean {
  const p = potencia.toUpperCase();
  const m = marca.toUpperCase();
  return /2\.25|G4|MICRO/.test(p) || (m.includes('DEYE') && /2\.25/.test(p));
}

interface YamlModulo {
  quantidade?: number;
  marca?: string;
  potencia_unitaria?: string;
}

interface YamlInversor {
  quantidade?: number;
  marca?: string;
  potencia_unitaria?: string;
}

interface YamlOrcamento {
  orcamento?: {
    inversores?: YamlInversor[];
    modulos?: YamlModulo[];
  };
}

function extractBlocks(raw: string): unknown[] {
  // Arquivo tem vários documentos YAML concatenados (às vezes com lixo no topo)
  const chunks = raw
    .split(/\n(?=cliente:\s*\n)/)
    .map((c) => c.trim())
    .filter((c) => c.startsWith('cliente:'));

  const docs: unknown[] = [];
  for (const chunk of chunks) {
    try {
      const doc = yaml.load(chunk);
      if (doc && typeof doc === 'object') docs.push(doc);
    } catch {
      // ignora bloco inválido
    }
  }
  return docs;
}

export function resolveYamlSeedPath(): string {
  const custom = (process.env.V3_SEED_YAML || '').trim();
  if (custom) return path.isAbsolute(custom) ? custom : path.join(process.cwd(), custom);
  return path.join(process.cwd(), 'temp', 'orcamento_executados.yaml');
}

export function seedEquipamentosFromYaml(yamlPath?: string): {
  path: string;
  created: number;
  updated: number;
  skus: string[];
  errors: string[];
} {
  const filePath = yamlPath || resolveYamlSeedPath();
  if (!fs.existsSync(filePath)) {
    return { path: filePath, created: 0, updated: 0, skus: [], errors: [`Arquivo não encontrado: ${filePath}`] };
  }

  const raw = fs.readFileSync(filePath, 'utf8');
  const docs = extractBlocks(raw);
  const map = new Map<string, EquipamentoInput>();
  const errors: string[] = [];

  for (const doc of docs) {
    const d = doc as {
      consolidado_orcamentos_distribuidores?: {
        soollar_distribuidora?: YamlOrcamento[];
      };
    };
    const lista = d.consolidado_orcamentos_distribuidores?.soollar_distribuidora || [];
    for (const item of lista) {
      const orc = item.orcamento;
      if (!orc) continue;

      for (const mod of orc.modulos || []) {
        const marca = (mod.marca || 'GEN').trim();
        const pot = (mod.potencia_unitaria || '').trim();
        const w = parsePotenciaW(pot);
        const sku = slugify(['MOD', marca, pot || w]);
        if (!sku) continue;
        const nome = `MODULO ${pot || `${w}W`} ${marca}`.replace(/\s+/g, ' ').trim();
        map.set(sku, {
          sku_interno: sku,
          nome,
          marca,
          categoria: 'modulo' as EquipamentoCategoria,
          potencia_w: w,
          prioridade_kit: 10,
          aliases: [nome, `${marca} ${pot}`, pot].filter(Boolean) as string[],
        });
      }

      for (const inv of orc.inversores || []) {
        const marca = (inv.marca || 'GEN').trim();
        const pot = (inv.potencia_unitaria || '').trim();
        const kw = parsePotenciaKw(pot);
        const micro = isMicro(pot, marca);
        const categoria: EquipamentoCategoria = micro ? 'microinversor' : 'inversor';
        const sku = slugify([micro ? 'MICRO' : 'INV', marca, pot || kw]);
        if (!sku) continue;
        const nome = `${micro ? 'MICRO-INVERSOR' : 'INVERSOR'} ${marca} ${pot}`.replace(/\s+/g, ' ').trim();
        map.set(sku, {
          sku_interno: sku,
          nome,
          marca,
          categoria,
          potencia_kw: kw,
          prioridade_kit: micro ? 20 : 30,
          aliases: [nome, `${marca} ${pot}`, pot].filter(Boolean) as string[],
        });
      }
    }
  }

  // Itens auxiliares padrão (ainda sem preço — fase 2a)
  const auxiliares: EquipamentoInput[] = [
    {
      sku_interno: 'KIT-ESTRUTURA-4MOD',
      nome: 'KIT FIXAÇÃO FIBROCIMENTO INOX MADEIRA PARA 4 MODULOS (padrão preço)',
      categoria: 'estrutura',
      prioridade_kit: 35,
      aliases: [
        'kit estrutura 4 modulos',
        'kit fixação 4 módulos',
        'KIT FIXAÇÃO TELHA FIBROCIMENTO PARAFUSO INOX MADEIRA PARA 4 MODULOS',
      ],
    },
    {
      sku_interno: 'TRILHO-236',
      nome: 'PERFIL FIXAÇÃO MODULO FIBROCIMENTO/CERAMICA ~2,40MT (padrão preço)',
      categoria: 'estrutura',
      prioridade_kit: 35,
      aliases: [
        'trilho 2,36',
        'trilho inox',
        'PERFIL FIXAÇÃO MODULO 2,40MT FIBROCIMENTO/CERAMICA',
        'perfil 2,36',
      ],
    },
    {
      sku_interno: 'TRILHO-250',
      nome: 'PERFIL FIXAÇÃO MODULO FIBROCIMENTO/CERAMICA (módulos maiores)',
      categoria: 'estrutura',
      prioridade_kit: 36,
      aliases: ['trilho 2,50', 'PERFIL FIXAÇÃO MODULO 2,40MT FIBROCIMENTO/CERAMICA'],
    },
    {
      sku_interno: 'CABO-4MM-25-V',
      nome: 'CABO SOLAR 4MM VERMELHO - 25MT',
      categoria: 'cabo',
      prioridade_kit: 50,
      aliases: ['CABO SOLAR 4MM VERMELHO - 25MT'],
    },
    {
      sku_interno: 'CABO-4MM-25-P',
      nome: 'CABO SOLAR 4MM PRETO - 25MT',
      categoria: 'cabo',
      prioridade_kit: 51,
      aliases: ['CABO SOLAR 4MM PRETO - 25MT'],
    },
    {
      sku_interno: 'MC4-PAR',
      nome: 'CONECTOR SOLAR MC4 MACHO E FEMEA COM 2 PARES',
      categoria: 'conector',
      prioridade_kit: 60,
      aliases: ['CONECTOR SOLAR MC4 MACHO E FEMEA COM 2 PARES'],
    },
  ];
  for (const a of auxiliares) map.set(a.sku_interno, a);

  let created = 0;
  let updated = 0;
  const skus: string[] = [];

  for (const input of map.values()) {
    try {
      const r = upsertBySkuInterno(input);
      skus.push(input.sku_interno);
      if (r.created) created++;
      else updated++;
    } catch (e) {
      errors.push(`${input.sku_interno}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return { path: filePath, created, updated, skus: skus.sort(), errors };
}
