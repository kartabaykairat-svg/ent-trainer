import { useState, type FormEvent } from 'react';
import { LogIn, Mail, UserPlus } from 'lucide-react';
import { AuthShell } from '../components/AuthShell';
import { Banner, Button, Field, Input, PasswordInput, Segmented } from '../components/ui';
import { backend } from '../lib/backend';
import { humanError } from '../lib/errors';
import { useSession } from '../state/session';

type Mode = 'signin' | 'signup' | 'reset';

export function AuthScreen() {
  const { onLoggedIn } = useSession();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError('Введите корректный email.');
    if (mode !== 'reset') {
      if (password.length < 8) return setError('Пароль от аккаунта — минимум 8 символов.');
      if (mode === 'signup' && password !== password2) return setError('Пароли не совпадают.');
    }
    setBusy(true);
    try {
      if (mode === 'signin') {
        await backend.signIn(email.trim(), password);
        setPassword('');
        await onLoggedIn();
      } else if (mode === 'signup') {
        const { needsConfirmation } = await backend.signUp(email.trim(), password);
        setPassword('');
        setPassword2('');
        if (needsConfirmation) {
          setInfo('Мы отправили письмо для подтверждения. Перейдите по ссылке из письма, затем войдите.');
          setMode('signin');
        } else {
          await onLoggedIn();
        }
      } else {
        await backend.resetPassword(email.trim());
        setInfo('Если такой аккаунт есть, мы отправили письмо со ссылкой для сброса пароля.');
      }
    } catch (err) {
      setError(humanError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title="Менеджер паролей"
      subtitle="Все пароли шифруются прямо на вашем устройстве. Сервер видит только зашифрованные данные."
    >
      {mode !== 'reset' && (
        <div className="mb-5 flex justify-center">
          <Segmented
            label="Вход или регистрация"
            value={mode}
            onChange={(m) => {
              setMode(m);
              setError(null);
            }}
            options={[
              { value: 'signin', label: 'Вход' },
              { value: 'signup', label: 'Регистрация' },
            ]}
          />
        </div>
      )}
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        {info && <Banner icon={<Mail className="size-4" />}>{info}</Banner>}
        <Field label="Email" required>
          {(id) => (
            <Input
              id={id}
              type="email"
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          )}
        </Field>
        {mode !== 'reset' && (
          <Field
            label="Пароль от аккаунта"
            required
            hint={mode === 'signup' ? 'Это пароль для входа. Мастер-пароль для шифрования вы зададите на следующем шаге.' : undefined}
          >
            {(id, d) => (
              <PasswordInput
                id={id}
                aria-describedby={d}
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            )}
          </Field>
        )}
        {mode === 'signup' && (
          <Field label="Повторите пароль" required>
            {(id) => (
              <PasswordInput id={id} autoComplete="new-password" value={password2} onChange={(e) => setPassword2(e.target.value)} />
            )}
          </Field>
        )}
        {error && <Banner tone="danger">{error}</Banner>}
        <Button
          type="submit"
          size="lg"
          loading={busy}
          icon={mode === 'signup' ? <UserPlus className="size-4" /> : <LogIn className="size-4" />}
        >
          {mode === 'signin' ? 'Войти' : mode === 'signup' ? 'Создать аккаунт' : 'Отправить ссылку'}
        </Button>
        <button
          type="button"
          className="text-sm text-accent hover:underline"
          onClick={() => {
            setMode(mode === 'reset' ? 'signin' : 'reset');
            setError(null);
          }}
        >
          {mode === 'reset' ? '← Вернуться ко входу' : 'Забыли пароль от аккаунта?'}
        </button>
      </form>
    </AuthShell>
  );
}
