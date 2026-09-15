/**
 * Navegação V3 (kit / automático) ↔ Proposta manual.
 * MVP: só metadados leves — não altera cálculo nem HTML do cliente.
 */

export type OrigemUiV3 = 'orcamento-base' | 'proposta-auto' | 'manual';

export const V3_SLUG_SESSION_KEY = 'v3-proposta-slug';
export const V3_PROPOSTA_AUTO_DRAFT_KEY = 'v3-proposta-auto-draft';

export type V3NavegacaoMeta = {
  origemUi: OrigemUiV3;
  returnTo: string;
};

export function returnToFromOrigem(origem?: string | null): string | null {
  if (origem === 'orcamento-base') return '/admin/v3/orcamento-base';
  if (origem === 'proposta-auto') return '/admin/v3/proposta-auto';
  return null;
}

export function labelVoltarV3(origem?: string | null): string {
  if (origem === 'orcamento-base') return '← Ajustar kits';
  if (origem === 'proposta-auto') return '← Ajustar proposta automática';
  return '← Ajustar proposta';
}

export function sanitizeOrigemUi(raw: unknown): OrigemUiV3 | null {
  if (raw === 'orcamento-base' || raw === 'proposta-auto' || raw === 'manual') return raw;
  return null;
}

/** Grava slug na sessão ao voltar para kit/auto (reabrir gerador sem mudar o link). */
export function rememberSlugForV3(slug: string | null | undefined) {
  if (typeof window === 'undefined') return;
  const s = (slug || '').trim();
  if (s) sessionStorage.setItem(V3_SLUG_SESSION_KEY, s);
  else sessionStorage.removeItem(V3_SLUG_SESSION_KEY);
}

export function peekSlugForV3(): string | null {
  if (typeof window === 'undefined') return null;
  const s = (sessionStorage.getItem(V3_SLUG_SESSION_KEY) || '').trim();
  return s || null;
}

export function buildV3Navegacao(origem: OrigemUiV3): V3NavegacaoMeta | null {
  if (origem !== 'orcamento-base' && origem !== 'proposta-auto') return null;
  const returnTo = returnToFromOrigem(origem);
  if (!returnTo) return null;
  return { origemUi: origem, returnTo };
}

/** Rascunho da 4a (margem, modo, cards) para Editar/Voltar reabrir a proposta automática. */
export function savePropostaAutoDraft(draft: Record<string, unknown>) {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(
      V3_PROPOSTA_AUTO_DRAFT_KEY,
      JSON.stringify({ ...draft, savedAt: Date.now() })
    );
  } catch {
    /* quota / private mode */
  }
}

export function loadPropostaAutoDraft(): Record<string, unknown> | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(V3_PROPOSTA_AUTO_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export function clearPropostaAutoDraft() {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(V3_PROPOSTA_AUTO_DRAFT_KEY);
}

/** Destino do botão Editar no admin conforme origem V3 da proposta. */
export function editHrefFromOrigemUi(
  slug: string,
  origemUi?: string | null
): string {
  const s = encodeURIComponent(slug);
  if (origemUi === 'proposta-auto') return `/admin/v3/proposta-auto?slug=${s}`;
  if (origemUi === 'orcamento-base') return `/admin/v3/orcamento-base?slug=${s}`;
  return `/gerador-rapido?cliente=${s}`;
}
