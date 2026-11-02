import { useEffect, useState } from 'react';
import { Monitor, Smartphone } from 'lucide-react';
import { Banner, Button, Spinner } from '../../components/ui';
import { backend } from '../../lib/backend';
import { humanError } from '../../lib/errors';
import { deviceLabel, fmtDateTime } from '../../lib/format';
import type { LoginEvent } from '../../lib/types';

export function LoginLog() {
  const [items, setItems] = useState<LoginEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [all, setAll] = useState(false);

  useEffect(() => {
    backend
      .listLogins()
      .then(setItems)
      .catch((e) => setError(humanError(e)));
  }, []);

  if (error) return <Banner tone="danger">{error}</Banner>;
  if (!items) return <Spinner className="size-5" />;
  if (!items.length) return <p className="text-sm text-muted">Пока нет записей о входах.</p>;
  const current = deviceLabel();
  const shown = all ? items : items.slice(0, 5);
  return (
    <div>
      <ul className="flex flex-col divide-y divide-line">
        {shown.map((e, i) => {
          const phone = /телефон|Android|iOS/.test(e.device);
          const Icon = phone ? Smartphone : Monitor;
          return (
            <li key={e.id} className="flex items-center gap-3 py-2.5">
              <Icon className="size-5 shrink-0 text-muted" aria-hidden />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm text-ink">
                  {e.device || 'Неизвестное устройство'}
                  {i === 0 && e.device === current && <span className="ml-2 text-xs text-ok">это устройство</span>}
                </div>
                <div className="text-xs text-muted">
                  {fmtDateTime(e.created_at)}
                  {e.ip && ` · IP ${e.ip}`}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      {items.length > 5 && (
        <Button variant="ghost" size="sm" onClick={() => setAll((a) => !a)} className="mt-1">
          {all ? 'Свернуть' : `Показать все (${items.length})`}
        </Button>
      )}
      <p className="mt-2 text-xs text-muted">Если видите незнакомый вход — смените пароль от аккаунта и включите 2FA.</p>
    </div>
  );
}
