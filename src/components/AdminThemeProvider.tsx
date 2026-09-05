import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  ADMIN_THEME_DEFAULT,
  ADMIN_THEMES,
  applyAdminThemeToDocument,
  readAdminTheme,
  writeAdminTheme,
  type AdminThemeId,
} from '@/lib/adminTheme';

interface AdminThemeContextValue {
  theme: AdminThemeId;
  setTheme: (id: AdminThemeId) => void;
  themes: typeof ADMIN_THEMES;
}

const AdminThemeContext = createContext<AdminThemeContextValue | null>(null);

export function AdminThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<AdminThemeId>(ADMIN_THEME_DEFAULT);

  useEffect(() => {
    const initial = readAdminTheme();
    setThemeState(initial);
    applyAdminThemeToDocument(initial);
  }, []);

  const setTheme = useCallback((id: AdminThemeId) => {
    setThemeState(id);
    writeAdminTheme(id);
    applyAdminThemeToDocument(id);
  }, []);

  const value = useMemo(
    () => ({ theme, setTheme, themes: ADMIN_THEMES }),
    [theme, setTheme]
  );

  return (
    <AdminThemeContext.Provider value={value}>{children}</AdminThemeContext.Provider>
  );
}

export function useAdminTheme(): AdminThemeContextValue {
  const ctx = useContext(AdminThemeContext);
  if (!ctx) {
    return {
      theme: ADMIN_THEME_DEFAULT,
      setTheme: () => undefined,
      themes: ADMIN_THEMES,
    };
  }
  return ctx;
}
