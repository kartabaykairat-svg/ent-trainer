import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

type Kind = 'success' | 'error' | 'info';
interface Toast {
  id: number;
  kind: Kind;
  text: string;
}

interface Ctx {
  toast(text: string, kind?: Kind): void;
}

const ToastContext = createContext<Ctx | null>(null);
let seq = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => setItems((l) => l.filter((t) => t.id !== id)), []);

  const toast = useCallback(
    (text: string, kind: Kind = 'success') => {
      const id = ++seq;
      setItems((l) => [...l.slice(-2), { id, kind, text }]);
      window.setTimeout(() => dismiss(id), kind === 'error' ? 6000 : 3500);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 md:bottom-6 md:left-auto md:right-6 md:items-end"
        aria-live="polite"
        role="status"
      >
        {items.map((t) => {
          const Icon = t.kind === 'success' ? CheckCircle2 : t.kind === 'error' ? AlertCircle : Info;
          return (
            <div
              key={t.id}
              className="animate-toast pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border border-line bg-raised px-4 py-3 text-sm text-ink shadow-lg"
            >
              <Icon
                className={`mt-0.5 size-4 shrink-0 ${t.kind === 'error' ? 'text-danger' : t.kind === 'success' ? 'text-ok' : 'text-accent'}`}
                aria-hidden
              />
              <span className="flex-1">{t.text}</span>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                className="-m-1 rounded p-1 text-muted hover:text-ink"
                aria-label="Закрыть уведомление"
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): Ctx {
  const c = useContext(ToastContext);
  if (!c) throw new Error('ToastProvider missing');
  return c;
}
