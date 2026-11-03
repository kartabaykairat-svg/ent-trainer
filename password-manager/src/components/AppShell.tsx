import type { ReactNode } from 'react';
import { CloudOff, KeyRound, Lock, Settings, ShieldCheck, Sparkles, Vault } from 'lucide-react';
import { useSession } from '../state/session';
import { backend } from '../lib/backend';
import { cx, IconButton } from './ui';

export type Tab = 'vault' | 'generator' | 'audit' | 'settings';

const TABS: { id: Tab; label: string; icon: typeof Vault }[] = [
  { id: 'vault', label: 'Пароли', icon: KeyRound },
  { id: 'generator', label: 'Генератор', icon: Sparkles },
  { id: 'audit', label: 'Аудит', icon: ShieldCheck },
  { id: 'settings', label: 'Настройки', icon: Settings },
];

export function AppShell({ tab, onTab, children }: { tab: Tab; onTab: (t: Tab) => void; children: ReactNode }) {
  const { lock, offline } = useSession();
  return (
    <div className="flex h-full min-h-0">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[70] focus:rounded-lg focus:bg-accent focus:px-3 focus:py-2 focus:text-on-accent"
      >
        Перейти к содержимому
      </a>
      {/* Боковая панель (планшет и десктоп) */}
      <nav
        aria-label="Разделы"
        className="hidden w-20 shrink-0 flex-col items-center gap-1 border-r border-line bg-surface py-4 md:flex lg:w-56 lg:items-stretch lg:px-3"
      >
        <div className="mb-5 flex items-center gap-2.5 px-2 text-ink">
          <span className="flex size-9 items-center justify-center rounded-xl bg-accent-soft text-accent">
            <ShieldCheck className="size-5" aria-hidden />
          </span>
          <span className="hidden font-semibold lg:inline">Пароли</span>
        </div>
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => onTab(id)}
            aria-current={tab === id ? 'page' : undefined}
            title={label}
            className={cx(
              'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors',
              tab === id ? 'bg-accent-soft font-medium text-accent' : 'text-muted hover:bg-sunken hover:text-ink',
            )}
          >
            <Icon className="size-5 shrink-0" aria-hidden />
            <span className="hidden lg:inline">{label}</span>
            <span className="sr-only lg:hidden">{label}</span>
          </button>
        ))}
        <div className="flex-1" />
        {backend.mode === 'local' && (
          <p className="hidden px-3 pb-2 text-xs text-muted lg:block">Локальный режим: данные только на этом устройстве.</p>
        )}
        <button
          type="button"
          onClick={lock}
          title="Заблокировать (Ctrl+Shift+L)"
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted transition-colors hover:bg-sunken hover:text-ink"
        >
          <Lock className="size-5 shrink-0" aria-hidden />
          <span className="hidden lg:inline">Заблокировать</span>
          <span className="sr-only lg:hidden">Заблокировать</span>
        </button>
      </nav>

      <div className="flex min-w-0 flex-1 flex-col">
        {offline && (
          <div className="flex items-center justify-center gap-2 bg-warn-soft px-4 py-1.5 text-xs text-ink" role="status">
            <CloudOff className="size-3.5 text-warn" aria-hidden /> Офлайн: показана сохранённая копия, изменения недоступны
          </div>
        )}
        <main id="main" className="flex min-h-0 flex-1 flex-col pb-16 md:pb-0">
          {children}
        </main>
      </div>

      {/* Нижняя панель (телефон) */}
      <nav
        aria-label="Разделы"
        className="fixed inset-x-0 bottom-0 z-40 flex border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => onTab(id)}
            aria-current={tab === id ? 'page' : undefined}
            className={cx(
              'flex h-16 flex-1 flex-col items-center justify-center gap-1 text-[11px] transition-colors',
              tab === id ? 'font-medium text-accent' : 'text-muted',
            )}
          >
            <Icon className="size-5" aria-hidden />
            {label}
          </button>
        ))}
      </nav>
    </div>
  );
}

export function ScreenHeader({ title, children }: { title: string; children?: ReactNode }) {
  const { lock } = useSession();
  return (
    <header className="flex items-center gap-2 px-4 pb-2 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6">
      <h1 className="flex-1 truncate text-xl font-semibold tracking-tight text-ink">{title}</h1>
      {children}
      <IconButton label="Заблокировать" onClick={lock} className="md:hidden">
        <Lock className="size-5" aria-hidden />
      </IconButton>
    </header>
  );
}
