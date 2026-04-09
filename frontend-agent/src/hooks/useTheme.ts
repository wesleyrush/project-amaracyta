import { useState, useEffect } from 'react';

export type Theme = 'system' | 'dark' | 'light';

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', theme);
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() =>
    (localStorage.getItem('theme') as Theme) || 'dark'
  );

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const setTheme = (t: Theme) => setThemeState(t);
  return { theme, setTheme };
}
