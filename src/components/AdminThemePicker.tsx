import { useAdminTheme } from '@/components/AdminThemeProvider';
import type { AdminThemeId } from '@/lib/adminTheme';

interface AdminThemePickerProps {
  compact?: boolean;
}

export function AdminThemePicker({ compact = false }: AdminThemePickerProps) {
  const { theme, setTheme, themes } = useAdminTheme();

  return (
    <div
      className={
        compact
          ? 'flex items-center gap-1'
          : 'admin-surface p-4'
      }
      role="group"
      aria-label="Paleta visual do Admin"
    >
      {!compact && (
        <div className="mb-3">
          <h3 className="admin-title text-sm font-semibold">Paleta visual</h3>
          <p className="admin-subtitle text-xs mt-0.5">
            4 paletas (paletas.txt) · regra 60-30-10 · salva neste navegador
          </p>
        </div>
      )}
      <div className={`flex ${compact ? 'gap-1' : 'flex-wrap gap-2'}`}>
        {themes.map((t) => {
          const active = theme === t.id;
          return (
            <button
              key={t.id}
              type="button"
              title={`${t.label}: ${t.description}`}
              onClick={() => setTheme(t.id as AdminThemeId)}
              className={
                compact
                  ? `admin-btn-ghost !px-2 !py-1.5 ${active ? 'ring-2 ring-[var(--admin-secondary)]' : ''}`
                  : `admin-btn-ghost flex items-center gap-2 ${active ? 'ring-2 ring-[var(--admin-secondary)]' : ''}`
              }
            >
              <span className={`admin-theme-swatch admin-theme-swatch--${t.id}`} aria-hidden />
              {!compact && (
                <span className="text-left">
                  <span className="block text-xs font-semibold">{t.label}</span>
                  <span className="block text-[10px] opacity-70 max-w-[140px] leading-tight">
                    {t.description}
                  </span>
                </span>
              )}
              {compact && <span className="sr-only">{t.label}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
