import type { ReactNode } from 'react';
import { AdminThemePicker } from '@/components/AdminThemePicker';

interface AdminShellProps {
  children: ReactNode;
  /** max-w-* Tailwind class */
  maxWidth?: string;
  /** Mostra seletor de paleta no canto (default true) */
  showThemePicker?: boolean;
}

/**
 * Casca visual do Admin — usa variáveis de src/styles/admin-themes.css
 */
export function AdminShell({
  children,
  maxWidth = 'max-w-7xl',
  showThemePicker = true,
}: AdminShellProps) {
  return (
    <div className="admin-shell">
      <div className="container mx-auto px-4 py-8">
        <div className={`${maxWidth} mx-auto`}>
          {showThemePicker && (
            <div className="flex justify-end mb-4">
              <AdminThemePicker compact />
            </div>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}
