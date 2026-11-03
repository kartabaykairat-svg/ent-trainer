import { useState, type FormEvent } from 'react';
import { AlertTriangle, LockKeyhole, LogOut } from 'lucide-react';
import { AuthShell } from '../components/AuthShell';
import { StrengthMeter } from '../components/StrengthMeter';
import { Banner, Button, Field, PasswordInput } from '../components/ui';
import { backend } from '../lib/backend';
import { humanError } from '../lib/errors';
import { estimateStrength } from '../lib/strength';
import { useSession } from '../state/session';

export function SetupMasterScreen() {
  const { createVault, signOut } = useSession();
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [ack, setAck] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const strength = estimateStrength(pw);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (pw.length < 10) return setError('Мастер-пароль — минимум 10 символов.');
    if (strength.score < 2) return setError('Мастер-пароль слишком слабый. Сделайте его длиннее или используйте фразу из нескольких слов.');
    if (pw !== pw2) return setError('Пароли не совпадают.');
    if (!ack) return setError('Подтвердите, что поняли предупреждение.');
    setBusy(true);
    try {
      await createVault(pw);
    } catch (err) {
      setError(humanError(err));
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title="Создайте мастер-пароль"
      subtitle="Он шифрует все ваши пароли. Это единственный пароль, который нужно помнить. Он должен отличаться от пароля входа."
    >
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <Field label="Мастер-пароль" required>
          {(id) => (
            <PasswordInput id={id} autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} autoFocus />
          )}
        </Field>
        <StrengthMeter password={pw} />
        <Field label="Повторите мастер-пароль" required error={pw2 && pw !== pw2 ? 'Пароли не совпадают' : null}>
          {(id, d) => (
            <PasswordInput
              id={id}
              aria-describedby={d}
              aria-invalid={Boolean(pw2 && pw !== pw2)}
              autoComplete="new-password"
              value={pw2}
              onChange={(e) => setPw2(e.target.value)}
            />
          )}
        </Field>
        <Banner tone="warn" icon={<AlertTriangle className="size-4" />}>
          <strong className="font-semibold">Если забудете мастер-пароль, восстановить данные невозможно.</strong>{' '}
          Мы не храним его и не можем его сбросить — так работает шифрование «zero-knowledge».
          <label className="mt-3 flex cursor-pointer items-start gap-2.5">
            <input
              type="checkbox"
              checked={ack}
              onChange={(e) => setAck(e.target.checked)}
              className="mt-0.5 size-4 shrink-0 accent-[var(--accent)]"
            />
            <span>Я понимаю и запомню (или запишу и спрячу) мастер-пароль</span>
          </label>
        </Banner>
        {error && <Banner tone="danger">{error}</Banner>}
        <Button type="submit" size="lg" loading={busy} icon={<LockKeyhole className="size-4" />}>
          {busy ? 'Создаём ключ шифрования…' : 'Создать хранилище'}
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
