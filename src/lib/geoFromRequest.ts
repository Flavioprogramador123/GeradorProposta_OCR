import type { NextApiRequest } from 'next';

export type GeoVisitante = {
  cidade: string | null;
  regiao: string | null;
  pais: string | null;
  isp: string | null;
  fonte: 'vercel' | 'cloudflare' | 'ip-api' | 'unknown';
  local: string | null;
};

function header(req: NextApiRequest, name: string): string | null {
  const raw = req.headers[name];
  if (!raw) return null;
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (!v || typeof v !== 'string') return null;
  const trimmed = v.trim();
  if (!trimmed || trimmed === '-') return null;
  try {
    return decodeURIComponent(trimmed.replace(/\+/g, ' '));
  } catch {
    return trimmed;
  }
}

function montarLocal(cidade: string | null, regiao: string | null, pais: string | null): string | null {
  const left = [cidade, regiao].filter(Boolean).join(', ');
  if (!left && !pais) return null;
  if (!left) return pais;
  return pais ? `${left} · ${pais}` : left;
}

/** Geolocalização aproximada pelos headers da edge (Vercel/Cloudflare) — sem lat/long precisos. */
export function geoFromEdgeHeaders(req: NextApiRequest): GeoVisitante | null {
  const cidade =
    header(req, 'x-vercel-ip-city') ||
    header(req, 'cf-ipcity') ||
    header(req, 'x-city');
  const regiao =
    header(req, 'x-vercel-ip-country-region') ||
    header(req, 'cf-region') ||
    header(req, 'x-region');
  const pais =
    header(req, 'x-vercel-ip-country') ||
    header(req, 'cf-ipcountry') ||
    header(req, 'x-country');

  if (!cidade && !regiao && !pais) return null;

  const fonte: GeoVisitante['fonte'] =
    header(req, 'x-vercel-ip-city') || header(req, 'x-vercel-ip-country')
      ? 'vercel'
      : header(req, 'cf-ipcity') || header(req, 'cf-ipcountry')
        ? 'cloudflare'
        : 'unknown';

  return {
    cidade,
    regiao,
    pais,
    isp: null,
    fonte,
    local: montarLocal(cidade, regiao, pais),
  };
}

function isIpPrivadoOuLocal(ip: string): boolean {
  if (!ip || ip === 'unknown') return true;
  if (ip === '::1' || ip === '127.0.0.1') return true;
  if (ip.startsWith('10.') || ip.startsWith('192.168.') || ip.startsWith('127.')) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(ip)) return true;
  if (ip.startsWith('::ffff:127.') || ip.startsWith('::ffff:10.')) return true;
  return false;
}

/**
 * Fallback leve (dev / sem headers edge). ip-api.com free, sem chave.
 * Não usar em loop de heartbeat — só em insert ou IP novo.
 */
export async function geoFromIpLookup(ip: string): Promise<GeoVisitante | null> {
  if (isIpPrivadoOuLocal(ip)) return null;

  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 2500);
    const url = `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,countryCode,regionName,city,isp,org`;
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) return null;
    const data = (await res.json()) as {
      status?: string;
      countryCode?: string;
      regionName?: string;
      city?: string;
      isp?: string;
      org?: string;
    };
    if (data.status !== 'success') return null;
    const cidade = data.city || null;
    const regiao = data.regionName || null;
    const pais = data.countryCode || null;
    const isp = data.isp || data.org || null;
    return {
      cidade,
      regiao,
      pais,
      isp,
      fonte: 'ip-api',
      local: montarLocal(cidade, regiao, pais),
    };
  } catch {
    return null;
  }
}

export async function resolveGeoVisitante(
  req: NextApiRequest,
  ip: string
): Promise<GeoVisitante> {
  const fromEdge = geoFromEdgeHeaders(req);
  if (fromEdge?.cidade || fromEdge?.regiao) {
    return fromEdge;
  }
  const fromIp = await geoFromIpLookup(ip);
  if (fromIp) return fromIp;
  return {
    cidade: fromEdge?.cidade ?? null,
    regiao: fromEdge?.regiao ?? null,
    pais: fromEdge?.pais ?? null,
    isp: null,
    fonte: fromEdge?.fonte ?? 'unknown',
    local: fromEdge?.local ?? null,
  };
}

export function geoPayload(g: GeoVisitante) {
  return {
    geo_cidade: g.cidade,
    geo_regiao: g.regiao,
    geo_pais: g.pais,
    geo_isp: g.isp,
    geo_fonte: g.fonte,
    geo_local: g.local,
  };
}

/** Compara cidade do cliente com a do visitante (aprox.) */
export function locaisDiferentes(
  cidadeCliente?: string | null,
  cidadeVisitante?: string | null
): boolean {
  if (!cidadeCliente || !cidadeVisitante) return false;
  const a = cidadeCliente
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim();
  const b = cidadeVisitante
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim();
  if (!a || !b) return false;
  return a !== b && !a.includes(b) && !b.includes(a);
}
