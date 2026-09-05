/**
 * Paletas do Admin — espelho de paletas.txt (regras 60-30-10, neutros, estados).
 * CSS: src/styles/admin-themes.css
 */

export const ADMIN_THEME_STORAGE_KEY = 'pieng-admin-theme';

export type AdminThemeId = 'corporativo' | 'tech' | 'neutro' | 'energia';

export interface AdminThemeMeta {
  id: AdminThemeId;
  label: string;
  description: string;
}

export const ADMIN_THEMES: AdminThemeMeta[] = [
  {
    id: 'corporativo',
    label: 'Corporativo',
    description: 'SaaS / dashboards — azul marinho, confiável',
  },
  {
    id: 'tech',
    label: 'Tech',
    description: 'Indigo + ciano — apps e produtos digitais',
  },
  {
    id: 'neutro',
    label: 'Neutro',
    description: 'Minimalista — conteúdo em primeiro plano',
  },
  {
    id: 'energia',
    label: 'Energia',
    description: 'Verde + sol + céu — solar / ESG',
  },
];

export const ADMIN_THEME_DEFAULT: AdminThemeId = 'corporativo';

/** Aceita ids atuais e aliases legados (tecnologia → tech, solar → energia). */
export function normalizeAdminThemeId(value: unknown): AdminThemeId | null {
  if (value === 'corporativo' || value === 'tech' || value === 'neutro' || value === 'energia') {
    return value;
  }
  if (value === 'tecnologia') return 'tech';
  if (value === 'solar') return 'energia';
  return null;
}

export function isAdminThemeId(value: unknown): value is AdminThemeId {
  return normalizeAdminThemeId(value) !== null;
}

export function readAdminTheme(): AdminThemeId {
  if (typeof window === 'undefined') return ADMIN_THEME_DEFAULT;
  try {
    const raw = window.localStorage.getItem(ADMIN_THEME_STORAGE_KEY);
    const normalized = normalizeAdminThemeId(raw);
    if (normalized) return normalized;
  } catch {
    /* ignore */
  }
  return ADMIN_THEME_DEFAULT;
}

export function writeAdminTheme(id: AdminThemeId): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(ADMIN_THEME_STORAGE_KEY, id);
  } catch {
    /* ignore */
  }
}

export function applyAdminThemeToDocument(id: AdminThemeId): void {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-admin-theme', id);
}
