/**
 * Configurações Rápidas compartilhadas entre:
 * - /gerador-rapido (Configurações Rápidas)
 * - /admin/v3/proposta-auto (4a)
 * - /admin/v3/orcamento-base (5a)
 *
 * Prioridade ao carregar:
 *   defaults → /admin/configuracoes (semente) → sessão localStorage
 * Assim a 1ª visita pega HSP/pdespesa/frete do admin; ajustes na 4a/gerador
 * (sessão) não são apagados ao abrir a Proposta manual.
 */

export const CONFIG_RAPIDA_STORAGE_KEY = 'pieng-config-rapida';

export interface ConfigRapidaShared {
  nomeCliente: string;
  cidadeCliente: string;
  consumoMensal: number;
  tipoImovel: string;
  hsp: number;
  tarifa: number;
  pdespesaFixo: number;
  pdespesaVariavel: number;
  fretePadrao: number;
  performanceRate: number;
  bonusMicroPercent: number;
  /** Faixa 4a (persistida para não divergir ao voltar) */
  geracaoMin?: number;
  geracaoMax?: number;
  updatedAt?: string;
}

export const CONFIG_RAPIDA_DEFAULTS: ConfigRapidaShared = {
  nomeCliente: 'Cliente Padrão',
  cidadeCliente: 'Anápolis/GO',
  consumoMensal: 600,
  tipoImovel: 'Residencial',
  hsp: 5.45,
  tarifa: 1.17,
  pdespesaFixo: 3000,
  pdespesaVariavel: 22,
  fretePadrao: 0,
  performanceRate: 0.75,
  bonusMicroPercent: 5,
  geracaoMin: 800,
  geracaoMax: 1200,
};

/** Placeholder genérico — não deve ganhar de um nome digitado na tela. */
export function isNomeClienteGenerico(nome?: string | null): boolean {
  const t = (nome || '').trim().toLowerCase();
  if (!t) return true;
  return (
    t === 'cliente padrão' ||
    t === 'cliente padrao' ||
    t === 'cliente premium' ||
    t === 'cliente'
  );
}

/** Primeiro nome real (não genérico); senão o primeiro preenchido; senão default. */
export function preferNomeCliente(
  ...candidatos: Array<string | null | undefined>
): string {
  for (const c of candidatos) {
    const t = (c || '').trim();
    if (t && !isNomeClienteGenerico(t)) return t;
  }
  for (const c of candidatos) {
    const t = (c || '').trim();
    if (t) return t;
  }
  return CONFIG_RAPIDA_DEFAULTS.nomeCliente;
}

function num(v: unknown, fallback: number): number {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? '').replace(',', '.'));
  return Number.isFinite(n) ? n : fallback;
}

/** Extrai campos comerciais/técnicos a partir do flat /api/admin/config (só se a chave existir). */
export function configRapidaFromAdmin(admin: Record<string, unknown> | null | undefined): Partial<ConfigRapidaShared> {
  if (!admin || typeof admin !== 'object') return {};
  const out: Partial<ConfigRapidaShared> = {};

  if (admin.hspPadrao != null) out.hsp = num(admin.hspPadrao, CONFIG_RAPIDA_DEFAULTS.hsp);

  const tarifaRaw =
    admin.tarifaPadrao != null
      ? admin.tarifaPadrao
      : admin.tarifaEnergia != null
        ? admin.tarifaEnergia
        : null;
  if (tarifaRaw != null) out.tarifa = num(tarifaRaw, CONFIG_RAPIDA_DEFAULTS.tarifa);

  if (admin.pdespesaFixo != null) out.pdespesaFixo = num(admin.pdespesaFixo, CONFIG_RAPIDA_DEFAULTS.pdespesaFixo);
  if (admin.pdespesaVariavel != null)
    out.pdespesaVariavel = num(admin.pdespesaVariavel, CONFIG_RAPIDA_DEFAULTS.pdespesaVariavel);
  if (admin.fretePadrao != null) out.fretePadrao = num(admin.fretePadrao, 0);
  if (admin.performanceRate != null)
    out.performanceRate = num(admin.performanceRate, CONFIG_RAPIDA_DEFAULTS.performanceRate);
  if (admin.bonusMicroPercent != null)
    out.bonusMicroPercent = num(admin.bonusMicroPercent, CONFIG_RAPIDA_DEFAULTS.bonusMicroPercent);

  return out;
}

export function loadConfigRapida(): ConfigRapidaShared | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CONFIG_RAPIDA_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ConfigRapidaShared>;
    if (!parsed || typeof parsed !== 'object') return null;
    return {
      ...CONFIG_RAPIDA_DEFAULTS,
      ...parsed,
      hsp: num(parsed.hsp, CONFIG_RAPIDA_DEFAULTS.hsp),
      tarifa: num(parsed.tarifa, CONFIG_RAPIDA_DEFAULTS.tarifa),
      consumoMensal: num(parsed.consumoMensal, CONFIG_RAPIDA_DEFAULTS.consumoMensal),
      pdespesaFixo: num(parsed.pdespesaFixo, CONFIG_RAPIDA_DEFAULTS.pdespesaFixo),
      pdespesaVariavel: num(parsed.pdespesaVariavel, CONFIG_RAPIDA_DEFAULTS.pdespesaVariavel),
      fretePadrao: num(parsed.fretePadrao, 0),
      performanceRate: num(parsed.performanceRate, CONFIG_RAPIDA_DEFAULTS.performanceRate),
      bonusMicroPercent: num(parsed.bonusMicroPercent, CONFIG_RAPIDA_DEFAULTS.bonusMicroPercent),
      geracaoMin: parsed.geracaoMin != null ? num(parsed.geracaoMin, 800) : CONFIG_RAPIDA_DEFAULTS.geracaoMin,
      geracaoMax: parsed.geracaoMax != null ? num(parsed.geracaoMax, 1200) : CONFIG_RAPIDA_DEFAULTS.geracaoMax,
    };
  } catch {
    return null;
  }
}

export function saveConfigRapida(partial: Partial<ConfigRapidaShared>): ConfigRapidaShared {
  const current = loadConfigRapida() || { ...CONFIG_RAPIDA_DEFAULTS };
  const next: ConfigRapidaShared = {
    ...current,
    ...partial,
    updatedAt: new Date().toISOString(),
  };
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(CONFIG_RAPIDA_STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* quota / private mode */
    }
  }
  return next;
}

/**
 * Merge: defaults ← admin (semente) ← sessão.
 * Edits da 4a / gerador / bridge V3 prevalecem sobre /admin/configuracoes.
 */
export function resolveConfigRapida(admin?: Record<string, unknown> | null): ConfigRapidaShared {
  const fromAdmin = configRapidaFromAdmin(admin);
  const fromStore = loadConfigRapida();
  return {
    ...CONFIG_RAPIDA_DEFAULTS,
    ...fromAdmin,
    ...(fromStore || {}),
  };
}

/** Campos do gerador-rapido que entram no compartilhamento */
export function pickFromGeradorConfig(config: {
  nomeCliente?: string;
  cidadeCliente?: string;
  consumoMensal?: number;
  tipoImovel?: string;
  hsp?: number;
  tarifa?: number;
  pdespesaFixo?: number;
  pdespesaVariavel?: number;
  fretePadrao?: number;
  performanceRate?: number;
  bonusMicroPercent?: number;
}): Partial<ConfigRapidaShared> {
  return {
    nomeCliente: config.nomeCliente,
    cidadeCliente: config.cidadeCliente,
    consumoMensal: config.consumoMensal,
    tipoImovel: config.tipoImovel,
    hsp: config.hsp,
    tarifa: config.tarifa,
    pdespesaFixo: config.pdespesaFixo,
    pdespesaVariavel: config.pdespesaVariavel,
    fretePadrao: config.fretePadrao,
    performanceRate: config.performanceRate,
    bonusMicroPercent: config.bonusMicroPercent,
  };
}

/**
 * Só grava chaves presentes (evita bridge gravar performanceRate/bonus do state inicial).
 */
export function pickDefinedConfigRapida(
  partial: Partial<ConfigRapidaShared>
): Partial<ConfigRapidaShared> {
  const out: Partial<ConfigRapidaShared> = {};
  (Object.keys(partial) as (keyof ConfigRapidaShared)[]).forEach((k) => {
    const v = partial[k];
    if (v !== undefined && v !== null) {
      (out as Record<string, unknown>)[k] = v;
    }
  });
  return out;
}

export function applyConfigRapidaToGerador<T extends Record<string, any>>(
  prev: T,
  shared: ConfigRapidaShared
): T {
  return {
    ...prev,
    // Nome digitado na tela / bridge não deve perder para "Cliente Padrão" da sessão
    nomeCliente: preferNomeCliente(shared.nomeCliente, prev.nomeCliente),
    cidadeCliente: shared.cidadeCliente || prev.cidadeCliente,
    consumoMensal: shared.consumoMensal ?? prev.consumoMensal,
    tipoImovel: shared.tipoImovel || prev.tipoImovel,
    hsp: shared.hsp ?? prev.hsp,
    tarifa: shared.tarifa ?? prev.tarifa,
    pdespesaFixo: shared.pdespesaFixo ?? prev.pdespesaFixo,
    pdespesaVariavel: shared.pdespesaVariavel ?? prev.pdespesaVariavel,
    fretePadrao: shared.fretePadrao ?? prev.fretePadrao,
    performanceRate: shared.performanceRate ?? prev.performanceRate,
    bonusMicroPercent: shared.bonusMicroPercent ?? prev.bonusMicroPercent,
  };
}
