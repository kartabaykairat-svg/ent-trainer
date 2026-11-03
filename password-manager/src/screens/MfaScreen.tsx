import { useEffect, useState, type FormEvent } from 'react';
import { KeyRound, LogOut } from 'lucide-react';
import { AuthShell } from '../components/AuthShell';
import { Banner, Button, Field, Input, Spinner } from '../components/ui';
import { backend, type MfaFactor } from '../lib/backend';
import { humanError } from '../lib/errors';
import { useSession } from '../state/session';

export function MfaScreen() {
  const { onLoggedIn, signOut } = useSession();
  const [factors, setFactors] = useState<MfaFactor[] | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    backend
      .mfaFactors()
      .then((f) => setFactors(f.filter((x) => x.status === 'verified')))
      .catch((e) => setError(humanError(e)));
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!factors?.length) return;
    const clean = code.replace(/\s/g, '');
    if (!/^\d{6}$/.test(clean)) return setError('Код состоит из 6 цифр.');
    setBusy(true);
    setError(null);
    try {
      await backend.mfaVerify(factors[0].id, clean);
      await onLoggedIn();
    } catch (err) {
      setError(humanError(err));
      setCode('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title="Двухфакторная проверка" subtitle="Введите 6-значный код из приложения-аутентификатора.">
      {!factors && !error ? (
        <div className="flex justify-center py-6">
          <Spinner />
        </div>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-4">
          <Field label="Код из приложения" required>
            {(id) => (
              <Input
                id={id}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/[^\d\s]/g, '').slice(0, 7))}
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="123 456"
                className="text-center font-mono text-xl tracking-[0.4em]"
                autoFocus
              />
            )}
          </Field>
          {error && <Banner tone="danger">{error}</Banner>}
          <Button type="submit" size="lg" loading={busy} icon={<KeyRound className="size-4" />}>
            Подтвердить
          </Button>
          <Button variant="ghost" icon={<LogOut className="size-4" />} onClick={() => void signOut()}>
            Выйти из аккаунта
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
