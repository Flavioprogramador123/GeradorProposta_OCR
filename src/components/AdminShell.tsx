import type { ReactNode } from 'react';

interface AdminShellProps {
  children: ReactNode;
  /** max-w-* Tailwind class */
  maxWidth?: string;
}

/**
 * Casca visual do Admin — usa variáveis de src/styles/admin-themes.css
 * Paleta visual: apenas em /admin/configuracoes (AdminThemePicker).
 */
export function AdminShell({ children, maxWidth = 'max-w-7xl' }: AdminShellProps) {
  return (
    <div className="admin-shell">
      <div className="container mx-auto px-4 py-8">
        <div className={`${maxWidth} mx-auto`}>{children}</div>
      </div>
    </div>
  );
}
