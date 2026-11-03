import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { SortMode } from '../lib/search';

// Несекретные настройки интерфейса — localStorage.
export type Theme = 'system' | 'light' | 'dark';
export const AUTOLOCK_OPTIONS = [1, 5, 15, 30] as const;

interface Settings {
  theme: Theme;
  autoLockMin: number;
  favicons: boolean;
  sort: SortMode;
}

const DEFAULTS: Settings = { theme: 'system', autoLockMin: 5, favicons: true, sort: 'alpha' };

function load(): Settings {
  try {
    const s = JSON.parse(localStorage.getItem('pm-settings') ?? '{}');
    return {
      ...DEFAULTS,
      ...s,
      theme: (localStorage.getItem('pm-theme') as Theme) || DEFAULTS.theme,
    };
  } catch {
    return DEFAULTS;
  }
}

interface Ctx extends Settings {
  set<K extends keyof Settings>(key: K, value: Settings[K]): void;
}

const SettingsContext = createContext<Ctx | null>(null);

function applyTheme(theme: Theme) {
  const dark = theme === 'dark' || (theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', dark);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0b1530' : '#f4f7fb');
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(load);

  useEffect(() => {
    applyTheme(settings.theme);
    if (settings.theme !== 'system') return;
    const mq = matchMedia('(prefers-color-scheme: dark)');
    const on = () => applyTheme('system');
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [settings.theme]);

  const set = useCallback<Ctx['set']>((key, value) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      try {
        const { theme, ...rest } = next;
        localStorage.setItem('pm-settings', JSON.stringify(rest));
        localStorage.setItem('pm-theme', theme);
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const value = useMemo(() => ({ ...settings, set }), [settings, set]);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): Ctx {
  const c = useContext(SettingsContext);
  if (!c) throw new Error('SettingsProvider missing');
  return c;
}
