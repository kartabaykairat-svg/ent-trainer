import { useMemo, useState, type ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Clock, Copy as CopyIcon, Pencil, ShieldAlert, ShieldCheck } from 'lucide-react';
import { ScreenHeader } from '../components/AppShell';
import { SiteIcon } from '../components/SiteIcon';
import { Banner, Button, Card, IconButton, cx } from '../components/ui';
import { audit, OLD_DAYS } from '../lib/audit';
import { isNetworkError } from '../lib/errors';
import { daysSince, plural } from '../lib/format';
import { pwnedCount } from '../lib/hibp';
import type { Entry } from '../lib/types';
import { useSession } from '../state/session';
import { EntryForm } from './EntryForm';

function ScoreRing({ score }: { score: number }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const color = score >= 80 ? 'var(--ok)' : score >= 50 ? 'var(--warn)' : 'var(--danger)';
  const label = score >= 80 ? 'Хорошо' : score >= 50 ? 'Есть что улучшить' : 'Требует внимания';
  return (
    <div className="flex items-center gap-5">
      <svg width="128" height="128" viewBox="0 0 128 128" role="img" aria-label={`Оценка хранилища ${score} из 100`}>
        <circle cx="64" cy="64" r={r} fill="none" stroke="var(--sunken)" strokeWidth="12" />
        <circle
          cx="64"
          cy="64"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - score / 100)}
          transform="rotate(-90 64 64)"
          style={{ transition: 'stroke-dashoffset 600ms ease' }}
        />
        <text x="64" y="70" textAnchor="middle" fontSize="30" fontWeight="700" fill="var(--ink)">
          {score}
        </text>
      </svg>
      <div>
        <div className="text-sm text-muted">Оценка хранилища</div>
        <div className="text-lg font-semibold text-ink">{label}</div>
        <div className="text-xs text-muted">из 100 возможных</div>
      </div>
    </div>
  );
}

function Section({
  icon,
  title,
  count,
  tone,
  description,
  children,
}: {
  icon: ReactNode;
  title: string;
  count: number;
  tone: 'danger' | 'warn';
  description: string;
  children: ReactNode;
}) {
  return (
    <Card>
      <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
        <span className={tone === 'danger' ? 'text-danger' : 'text-warn'}>{icon}</span>
        {title}
        <span
          className={cx(
            'ml-auto rounded-full px-2.5 py-0.5 text-xs font-semibold',
            count ? (tone === 'danger' ? 'bg-danger-soft text-danger' : 'bg-warn-soft text-warn') : 'bg-sunken text-muted',
          )}
        >
          {count}
        </span>
      </h2>
      <p className="mt-1 text-sm text-muted">{description}</p>
      {count === 0 ? (
        <p className="mt-3 flex items-center gap-2 text-sm text-ok">
          <CheckCircle2 className="size-4" aria-hidden /> Всё в порядке
        </p>
      ) : (
        <ul className="mt-3 flex flex-col gap-1">{children}</ul>
      )}
    </Card>
  );
}

function Item({ entry, extra, onFix }: { entry: Entry; extra?: string; onFix: (e: Entry) => void }) {
  return (
    <li className="flex items-center gap-3 rounded-xl px-1 py-1.5 hover:bg-sunken">
      <SiteIcon service={entry.service} url={entry.url} size={32} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-ink">{entry.service}</div>
        <div className="truncate text-xs text-muted">
          {entry.login}
          {extra && ` · ${extra}`}
        </div>
      </div>
      <IconButton label={`Сменить пароль: ${entry.service}`} onClick={() => onFix(entry)}>
        <Pencil className="size-4" aria-hidden />
      </IconButton>
    </li>
  );
}

export function AuditScreen() {
  const { entries, offline } = useSession();
  const [breaches, setBreaches] = useState<Map<string, number> | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Entry | null>(null);

  const result = useMemo(() => audit(entries, breaches), [entries, breaches]);

  const checkBreaches = async () => {
    setError(null);
    setProgress(0);
    const out = new Map<string, number>();
    const byPassword = new Map<string, number>();
    try {
      let done = 0;
      for (const e of entries) {
        let n = byPassword.get(e.password);
        if (n === undefined) {
          n = await pwnedCount(e.password);
          byPassword.set(e.password, n);
        }
        out.set(e.id, n);
        done++;
        setProgress(Math.round((done / entries.length) * 100));
      }
      setBreaches(out);
    } catch (err) {
      setError(
        isNetworkError(err)
          ? 'Нет соединения с сервисом проверки утечек. Попробуйте позже.'
          : 'Сервис проверки утечек сейчас недоступен. Попробуйте позже.',
      );
    } finally {
      setProgress(null);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto pb-8">
      <ScreenHeader title="Аудит безопасности" />
      <div className="mx-auto flex max-w-2xl flex-col gap-4 px-4 sm:px-6">
        <Card>
          <ScoreRing score={result.score} />
          <dl className="mt-5 grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
            {[
              ['Записей', entries.length],
              ['Слабых', result.weak.length],
              ['Повторов', result.reused.reduce((s, g) => s + g.length, 0)],
              ['Утечек', result.checkedBreaches ? result.breached.length : '—'],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl bg-sunken px-2 py-2.5">
                <dt className="text-xs text-muted">{label}</dt>
                <dd className="text-lg font-semibold text-ink">{value}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <Card>
          <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
            <ShieldAlert className="size-5 text-accent" aria-hidden /> Проверка утечек
          </h2>
          <p className="mt-1 text-sm text-muted">
            Сравниваем пароли с базой HaveIBeenPwned. Пароль не покидает устройство: отправляются только первые 5
            символов его SHA-1-хеша (k-anonymity).
          </p>
          {error && (
            <div className="mt-3">
              <Banner tone="danger">{error}</Banner>
            </div>
          )}
          <Button
            className="mt-4"
            onClick={checkBreaches}
            loading={progress !== null}
            disabled={!entries.length || offline}
            icon={<ShieldCheck className="size-4" />}
          >
            {progress !== null ? `Проверяем… ${progress}%` : result.checkedBreaches ? 'Проверить снова' : 'Проверить утечки'}
          </Button>
        </Card>

        {result.checkedBreaches && (
          <Section
            icon={<ShieldAlert className="size-5" aria-hidden />}
            title="Найдены в утечках"
            count={result.breached.length}
            tone="danger"
            description="Эти пароли есть в базах утёкших паролей. Смените их как можно скорее."
          >
            {result.breached.map((e) => {
              const n = breaches?.get(e.id) ?? 0;
              return (
                <Item key={e.id} entry={e} extra={`встречался ${n.toLocaleString('ru-RU')} ${plural(n, 'раз', 'раза', 'раз')}`} onFix={setEditing} />
              );
            })}
          </Section>
        )}

        <Section
          icon={<AlertTriangle className="size-5" aria-hidden />}
          title="Слабые пароли"
          count={result.weak.length}
          tone="danger"
          description="Короткие, простые или популярные пароли легко подобрать."
        >
          {result.weak.map((e) => (
            <Item key={e.id} entry={e} onFix={setEditing} />
          ))}
        </Section>

        <Section
          icon={<CopyIcon className="size-5" aria-hidden />}
          title="Повторяющиеся пароли"
          count={result.reused.length}
          tone="warn"
          description="Один пароль на нескольких сайтах: утечка с одного откроет доступ ко всем."
        >
          {result.reused.map((g, i) => (
            <li key={i} className="rounded-xl border border-line p-1.5">
              <div className="px-1 pb-1 text-xs text-muted">
                Одинаковый пароль в {g.length} {plural(g.length, 'записи', 'записях', 'записях')}
              </div>
              <ul>
                {g.map((e) => (
                  <Item key={e.id} entry={e} onFix={setEditing} />
                ))}
              </ul>
            </li>
          ))}
        </Section>

        <Section
          icon={<Clock className="size-5" aria-hidden />}
          title={`Старше ${OLD_DAYS} дней`}
          count={result.old.length}
          tone="warn"
          description="Пароли, которые давно не менялись."
        >
          {result.old.map((e) => {
            const d = daysSince(e.passwordChangedAt);
            return <Item key={e.id} entry={e} extra={`${d} ${plural(d, 'день', 'дня', 'дней')}`} onFix={setEditing} />;
          })}
        </Section>
      </div>
      <EntryForm open={Boolean(editing)} editing={editing} onClose={() => setEditing(null)} />
    </div>
  );
}
