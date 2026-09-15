/**
 * Fortlev Solar — credenciais e constantes do portal parceiro.
 * Catálogo: https://fortlevsolar.app/produto-avulso (HTMX + scroll infinito).
 */
export const FORTLEV_BASE_URL = (process.env.FORTLEV_BASE_URL || 'https://fortlevsolar.app').replace(
  /\/$/,
  ''
);
export const FORTLEV_LOGIN_URL = `${FORTLEV_BASE_URL}/login`;
export const FORTLEV_PRODUTO_AVULSO_URL = `${FORTLEV_BASE_URL}/produto-avulso`;

/** CD único no V3 (slug_portal). */
export const FORTLEV_CD_SLUG = 'fortlev';
export const FORTLEV_CD_NOME = 'Fortlev';
/** ID Mongo do CD visto nos pedidos (fallback se order API não responder). */
export const FORTLEV_DC_FALLBACK = '67ae529a5871f815738b5fc5';

export type FortlevLogLevel = 'info' | 'ok' | 'warn' | 'error' | 'data';

export interface FortlevLogLine {
  ts: string;
  level: FortlevLogLevel;
  message: string;
  data?: unknown;
}

export type FortlevLogger = (level: FortlevLogLevel, message: string, data?: unknown) => void;

export interface FortlevProduto {
  codigo: string;
  nome: string;
  preco: number;
  /** Portal avulso não expõe estoque nos cards — usamos default alto na gravação. */
  estoque: number | null;
  familia?: string | null;
}

export interface FortlevCapturaResult {
  success: boolean;
  loggedIn: boolean;
  distributionCenterId: string | null;
  items: FortlevProduto[];
  bomKit?: {
    skuRef: string;
    preco: number;
    pecas: Array<{ codigo: string; qty: number; precoUnit: number; nome: string }>;
    faltando: string[];
  };
}

export function getFortlevCredentials() {
  const user = (process.env.FORTLEV_USER || process.env.FORTLEV_EMAIL || '').trim();
  const password = (process.env.FORTLEV_PASSWORD || '').trim();
  return {
    user,
    password,
    configured: Boolean(user && password),
    baseUrl: FORTLEV_BASE_URL,
    loginUrl: FORTLEV_LOGIN_URL,
    catalogUrl: FORTLEV_PRODUTO_AVULSO_URL,
    cdSlug: FORTLEV_CD_SLUG,
    cdNome: FORTLEV_CD_NOME,
  };
}

export function createFortlevLogger(onLine?: (line: FortlevLogLine) => void): FortlevLogger {
  return (level, message, data) => {
    const line: FortlevLogLine = {
      ts: new Date().toISOString(),
      level,
      message,
      data,
    };
    const prefix = `[FORTLEV ${level.toUpperCase()}]`;
    if (data !== undefined) console.log(prefix, message, data);
    else console.log(prefix, message);
    onLine?.(line);
  };
}
