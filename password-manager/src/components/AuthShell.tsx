import type { ReactNode } from 'react';
import { ShieldCheck } from 'lucide-react';

export function AuthShell({ title, subtitle, children }: { title: string; subtitle?: ReactNode; children: ReactNode }) {
  return (
    <main className="flex min-h-full items-center justify-center px-4 py-10">
      <div className="animate-up w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-accent-soft text-accent">
            <ShieldCheck className="size-7" aria-hidden />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">{title}</h1>
          {subtitle && <p className="mt-2 text-sm text-muted">{subtitle}</p>}
        </div>
        <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm sm:p-6">{children}</div>
      </div>
    </main>
  );
}
