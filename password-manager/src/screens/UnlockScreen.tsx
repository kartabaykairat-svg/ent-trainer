import { useEffect, useRef, useState, type FormEvent } from 'react';
import { CloudOff, LockKeyholeOpen, LogOut } from 'lucide-react';
import { AuthShell } from '../components/AuthShell';
import { Banner, Button, Field, PasswordInput } from '../components/ui';
import { FREE_MASTER_ATTEMPTS, failedAttempts, lockRemainingMs, registerFailure, registerSuccess } from '../lib/attempts';
import { backend } from '../lib/backend';
import { humanError } from '../lib/errors';
import { fmtDuration, plural } from '../lib/format';
import { useSession } from '../state/session';

export function UnlockScreen() {
  const { unlock, signOut, user, offline } = useSession();
  const userId = user?.id ?? 'local';
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wait, setWait] = useState(() => lockRemainingMs(userId));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (wait <= 0) return;
    const t = window.setInterval(() => {
      const left = lockRemainingMs(userId);
      setWait(left);
      if (left <= 0) {
        window.clearInterval(t);
        setTimeout(() => inputRef.current?.focus(), 0);
      }
    }, 500);
    return () => window.clearInterval(t);
  }, [wait > 0, userId]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!pw || busy) return;
    const left = lockRemainingMs(userId);
    if (left > 0) return setWait(left);
    setBusy(true);
    setError(null);
    try {
      const ok = await unlock(pw);
      if (ok) {
        registerSuccess(userId);
        setPw('');
        return;
      }
      const s = registerFailure(userId);
      setPw('');
      const rest = FREE_MASTER_ATTEMPTS - s.fails;
      if (rest > 0) {
        setError(`Неверный мастер-пароль. ${rest > 2 ? '' : `Осталось ${rest} ${plural(rest, 'попытка', 'попытки', 'попыток')} до паузы.`}`.trim());
      } else {
        setError('Неверный мастер-пароль. Ввод временно заблокирован.');
        setWait(lockRemainingMs(userId));
      }
      inputRef.current?.focus();
    } catch (err) {
      setError(humanError(err));
    } finally {
      setBusy(false);
    }
  };

  const fails = failedAttempts(userId);

  return (
    <AuthShell
      title="Хранилище заблокировано"
      subtitle={user?.email ? <>Аккаунт: <span className="text-ink">{user.email}</span></> : 'Введите мастер-пароль'}
    >
      <form onSubmit={submit} className="flex flex-col gap-4">
        {offline && (
          <Banner icon={<CloudOff className="size-4" />}>
            Нет сети. Откроется сохранённая на устройстве зашифрованная копия — только для просмотра.
          </Banner>
        )}
        <Field label="Мастер-пароль" required>
          {(id) => (
            <PasswordInput
              ref={inputRef}
              id={id}
              autoComplete="current-password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              disabled={wait > 0}
              autoFocus
            />
          )}
        </Field>
        {wait > 0 ? (
          <Banner tone="warn">
            Слишком много ошибок ({fails}). Повторите через {fmtDuration(wait)}.
          </Banner>
        ) : (
          error && <Banner tone="danger">{error}</Banner>
        )}
        <Button type="submit" size="lg" loading={busy} disabled={wait > 0 || !pw} icon={<LockKeyholeOpen className="size-4" />}>
          {busy ? 'Расшифровываем…' : 'Разблокировать'}
        </Button>
        {backend.mode === 'supabase' && (
          <Button variant="ghost" icon={<LogOut className="size-4" />} onClick={() => void signOut()}>
            Выйти из аккаунта
          </Button>
        )}
      </form>
    </AuthShell>
  );
}
