import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  History,
  Pencil,
  Star,
  Trash2,
} from 'lucide-react';
import { SiteIcon } from '../components/SiteIcon';
import { useCopy } from '../components/EntryActions';
import { StrengthMeter } from '../components/StrengthMeter';
import { Button, IconButton, Modal, cx } from '../components/ui';
import { categoryName } from '../lib/categories';
import { humanError } from '../lib/errors';
import { daysSince, fmtDate, fmtDateTime, plural, safeHref } from '../lib/format';
import type { Entry } from '../lib/types';
import { useSession } from '../state/session';
import { useToast } from '../state/toast';

const MASK = '••••••••••••';

function Row({ label, children, actions }: { label: string; children: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 border-b border-line py-3 last:border-0">
      <div className="min-w-0 flex-1">
        <div className="text-xs text-muted">{label}</div>
        <div className="mt-0.5 break-all text-[15px] text-ink">{children}</div>
      </div>
      {actions && <div className="flex shrink-0 items-center">{actions}</div>}
    </div>
  );
}

export function EntryDetail({
  entry,
  onBack,
  onEdit,
  onDeleted,
  showBack,
}: {
  entry: Entry;
  onBack: () => void;
  onEdit: () => void;
  onDeleted: () => void;
  showBack: boolean;
}) {
  const { meta, deleteEntry, toggleFavorite, offline } = useSession();
  const { toast } = useToast();
  const copy = useCopy();
  const [show, setShow] = useState(false);
  const [shownOld, setShownOld] = useState<number | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setShow(false);
    setShownOld(null);
  }, [entry.id]);

  const href = safeHref(entry.url);
  const age = daysSince(entry.passwordChangedAt);

  const remove = async () => {
    setBusy(true);
    try {
      await deleteEntry(entry.id);
      toast(`«${entry.service}» удалён`);
      setConfirm(false);
      onDeleted();
    } catch (e) {
      toast(humanError(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  const fav = async () => {
    try {
      await toggleFavorite(entry.id);
    } catch (e) {
      toast(humanError(e), 'error');
    }
  };

  return (
    <div className="animate-fade flex h-full flex-col">
      <div className="flex items-center gap-1 px-2 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-4 lg:pt-4">
        {showBack && (
          <IconButton label="Назад к списку" onClick={onBack}>
            <ArrowLeft className="size-5" aria-hidden />
          </IconButton>
        )}
        <div className="flex-1" />
        <IconButton
          label={entry.favorite ? 'Убрать из избранного' : 'В избранное'}
          onClick={fav}
          aria-pressed={entry.favorite}
          disabled={offline}
        >
          <Star className={cx('size-5', entry.favorite && 'fill-warn text-warn')} aria-hidden />
        </IconButton>
        <IconButton label="Редактировать" onClick={onEdit} disabled={offline}>
          <Pencil className="size-5" aria-hidden />
        </IconButton>
        <IconButton label="Удалить" onClick={() => setConfirm(true)} disabled={offline} className="hover:text-danger">
          <Trash2 className="size-5" aria-hidden />
        </IconButton>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-8 sm:px-6">
        <div className="mb-5 flex items-center gap-4">
          <SiteIcon service={entry.service} url={entry.url} size={56} />
          <div className="min-w-0">
            <h2 className="truncate text-xl font-semibold text-ink">{entry.service}</h2>
            <span className="mt-1 inline-block rounded-full bg-sunken px-2.5 py-0.5 text-xs text-muted">
              {categoryName(entry.category, meta.customCategories)}
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-line bg-surface px-4">
          <Row
            label="Логин"
            actions={
              <IconButton label="Копировать логин" onClick={() => copy(entry, entry.login, 'login')}>
                <Copy className="size-4" aria-hidden />
              </IconButton>
            }
          >
            {entry.login}
          </Row>
          <Row
            label="Пароль"
            actions={
              <>
                <IconButton label={show ? 'Скрыть пароль' : 'Показать пароль'} onClick={() => setShow((s) => !s)} aria-pressed={show}>
                  {show ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
                </IconButton>
                <IconButton label="Копировать пароль" onClick={() => copy(entry, entry.password, 'password')}>
                  <Copy className="size-4" aria-hidden />
                </IconButton>
              </>
            }
          >
            <span className="font-mono">{show ? entry.password : MASK}</span>
          </Row>
          {entry.url && (
            <Row
              label="Сайт"
              actions={
                <>
                  {href && (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Открыть сайт в новой вкладке"
                      title="Открыть сайт"
                      className="inline-flex size-10 items-center justify-center rounded-xl text-muted hover:bg-sunken hover:text-ink"
                    >
                      <ExternalLink className="size-4" aria-hidden />
                    </a>
                  )}
                  <IconButton label="Копировать ссылку" onClick={() => copy(entry, entry.url, 'url')}>
                    <Copy className="size-4" aria-hidden />
                  </IconButton>
                </>
              }
            >
              {entry.url}
            </Row>
          )}
          {entry.note && (
            <Row label="Заметка">
              <span className="whitespace-pre-wrap break-words">{entry.note}</span>
            </Row>
          )}
        </div>

        <div className="mt-4">
          <StrengthMeter password={entry.password} />
        </div>

        <dl className="mt-5 grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-muted">Создана</dt>
            <dd className="text-ink">{fmtDateTime(entry.createdAt)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Изменена</dt>
            <dd className="text-ink">{fmtDateTime(entry.updatedAt)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Пароль менялся</dt>
            <dd className={cx(age > 180 ? 'text-warn' : 'text-ink')}>
              {age === 0 ? 'сегодня' : `${age} ${plural(age, 'день', 'дня', 'дней')} назад`}
            </dd>
          </div>
          {entry.lastUsedAt && (
            <div>
              <dt className="text-xs text-muted">Последнее использование</dt>
              <dd className="text-ink">{fmtDateTime(entry.lastUsedAt)}</dd>
            </div>
          )}
        </dl>

        {entry.history.length > 0 && (
          <section className="mt-6" aria-labelledby="hist-title">
            <h3 id="hist-title" className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink">
              <History className="size-4 text-muted" aria-hidden /> История паролей
            </h3>
            <ul className="rounded-2xl border border-line bg-surface px-4">
              {entry.history.map((h, i) => (
                <li key={h.changedAt + i} className="flex items-center gap-2 border-b border-line py-2.5 last:border-0">
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-mono text-sm text-ink">{shownOld === i ? h.password : MASK}</div>
                    <div className="text-xs text-muted">заменён {fmtDate(h.changedAt)}</div>
                  </div>
                  <IconButton
                    label={shownOld === i ? 'Скрыть старый пароль' : 'Показать старый пароль'}
                    onClick={() => setShownOld(shownOld === i ? null : i)}
                  >
                    {shownOld === i ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
                  </IconButton>
                  <IconButton label="Копировать старый пароль" onClick={() => copy(null, h.password, 'old')}>
                    <Copy className="size-4" aria-hidden />
                  </IconButton>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <Modal
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Удалить запись?"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirm(false)}>
              Отмена
            </Button>
            <Button variant="danger" onClick={remove} loading={busy} icon={<Trash2 className="size-4" />}>
              Удалить
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink">
          Запись <strong>«{entry.service}»</strong> ({entry.login}) будет удалена без возможности восстановления.
        </p>
      </Modal>
    </div>
  );
}
