import { create } from 'zustand';

export type ThemeMode = 'dark' | 'light' | 'system';

interface ThemeStore {
  mode: ThemeMode;
  resolvedTheme: 'dark' | 'light';
  setMode: (mode: ThemeMode) => void;
  initTheme: () => void;
}

export const useThemeStore = create<ThemeStore>((set, get) => ({
  mode: 'system',
  resolvedTheme: 'dark',
  setMode: mode => {
    localStorage.setItem('cless-theme', mode);
    let resolved: 'dark' | 'light' = 'dark';
    if (mode === 'system') {
      const isLight = window.matchMedia('(prefers-color-scheme: light)').matches;
      resolved = isLight ? 'light' : 'dark';
    } else {
      resolved = mode;
    }

    if (resolved === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }

    set({ mode, resolvedTheme: resolved });
  },
  initTheme: () => {
    const saved = (localStorage.getItem('cless-theme') as ThemeMode) || 'system';
    get().setMode(saved);

    const mediaQuery = window.matchMedia('(prefers-color-scheme: light)');
    mediaQuery.addEventListener('change', e => {
      if (get().mode === 'system') {
        const resolved = e.matches ? 'light' : 'dark';
        if (resolved === 'light') {
          document.documentElement.setAttribute('data-theme', 'light');
        } else {
          document.documentElement.removeAttribute('data-theme');
        }
        set({ resolvedTheme: resolved });
      }
    });
  },
}));

