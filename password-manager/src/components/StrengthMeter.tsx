import { estimateStrength } from '../lib/strength';
import { cx } from './ui';

const COLORS = ['bg-danger', 'bg-danger', 'bg-warn', 'bg-ok', 'bg-ok'];
const TEXT = ['text-danger', 'text-danger', 'text-warn', 'text-ok', 'text-ok'];

export function StrengthMeter({ password, bits }: { password: string; bits?: number }) {
  const s = estimateStrength(password);
  const shownBits = bits ?? s.bits;
  return (
    <div className="flex flex-col gap-1.5" aria-live="polite">
      <div className="flex gap-1" aria-hidden>
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={cx(
              'h-1.5 flex-1 rounded-full transition-colors duration-300',
              password && i <= s.score ? COLORS[s.score] : 'bg-sunken',
            )}
          />
        ))}
      </div>
      {password && (
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-xs">
          <span className={cx('font-medium', TEXT[s.score])}>
            Надёжность: {s.label.toLowerCase()}
          </span>
          <span className="text-muted">≈ {Math.round(shownBits)} бит энтропии</span>
          {s.hint && <span className="w-full text-muted">{s.hint}</span>}
        </div>
      )}
    </div>
  );
}
