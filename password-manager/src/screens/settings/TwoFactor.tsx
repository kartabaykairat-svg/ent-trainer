import { useEffect, useState, type FormEvent } from 'react';
import { ShieldCheck, ShieldOff, Smartphone } from 'lucide-react';
import { Banner, Button, Field, Input, Modal, Spinner } from '../../components/ui';
import { backend, type MfaEnrollment, type MfaFactor } from '../../lib/backend';
import { humanError } from '../../lib/errors';
import { fmtDate } from '../../lib/format';
import { useToast } from '../../state/toast';

export function TwoFactorSection() {
  const { toast } = useToast();
  const [factors, setFactors] = useState<MfaFactor[] | null>(null);
  const [enroll, setEnroll] = useState<MfaEnrollment | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOff, setConfirmOff] = useState<MfaFactor | null>(null);

  const load = () =>
    backend
      .mfaFactors()
      .then((f) => setFactors(f.filter((x) => x.status === 'verified')))
      .catch((e) => setError(humanError(e)));

  useEffect(() => {
    void load();
  }, []);

  const start = async () => {
    setBusy(true);
    setError(null);
    try {
      setEnroll(await backend.mfaEnroll());
      setCode('');
    } catch (e) {
      setError(humanError(e));
    } finally {
      setBusy(false);
    }
  };

  const verify = async (e: FormEvent) => {
    e.preventDefault();
    if (!enroll) return;
    const clean = code.replace(/\s/g, '');
    if (!/^\d{6}$/.test(clean)) return setError('Введите 6 цифр из приложения.');
    setBusy(true);
    setError(null);
    try {
      await backend.mfaVerify(enroll.factorId, clean);
      setEnroll(null);
      toast('Двухфакторная аутентификация включена');
      await load();
    } catch (err) {
      setError(humanError(err));
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    if (!confirmOff) return;
    setBusy(true);
    try {
      await backend.mfaUnenroll(confirmOff.id);
      toast('Двухфакторная аутентификация отключена', 'info');
      setConfirmOff(null);
      await load();
    } catch (e) {
      toast(humanError(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  if (!factors && !error) return <Spinner className="size-5" />;
  const enabled = Boolean(factors?.length);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted">
        При входе в аккаунт, кроме пароля, нужен код из приложения (Google Authenticator, Яндекс Ключ, Aegis и др.).
        Пока код не введён, сервер не отдаёт даже зашифрованные данные.
      </p>
      {enabled ? (
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1 text-sm text-ok">
            <ShieldCheck className="size-4" aria-hidden /> Включена с {fmtDate(factors![0].createdAt)}
          </span>
          <Button variant="secondary" size="sm" icon={<ShieldOff className="size-4" />} onClick={() => setConfirmOff(factors![0])}>
            Отключить
          </Button>
        </div>
      ) : (
        <Button variant="secondary" onClick={start} loading={busy && !enroll} icon={<Smartphone className="size-4" />} className="self-start">
          Включить 2FA
        </Button>
      )}
      {error && !enroll && <Banner tone="danger">{error}</Banner>}

      <Modal open={Boolean(enroll)} onClose={() => setEnroll(null)} title="Подключение аутентификатора" size="sm">
        {enroll && (
          <form onSubmit={verify} className="flex flex-col gap-4">
            <ol className="list-decimal space-y-1 pl-5 text-sm text-ink">
              <li>Откройте приложение-аутентификатор и отсканируйте QR-код.</li>
              <li>Введите 6-значный код, который покажет приложение.</li>
            </ol>
            <div className="flex justify-center rounded-xl bg-white p-3">
              <img src={enroll.qr} alt="QR-код для приложения-аутентификатора" width={200} height={200} />
            </div>
            <details className="text-sm">
              <summary className="cursor-pointer text-accent">Не получается отсканировать?</summary>
              <p className="mt-2 text-muted">Введите ключ вручную:</p>
              <code className="mt-1 block break-all rounded-lg bg-sunken px-3 py-2 font-mono text-ink">{enroll.secret}</code>
            </details>
            <Field label="Код из приложения" required>
              {(id) => (
                <Input
                  id={id}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/[^\d\s]/g, '').slice(0, 7))}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  className="text-center font-mono text-lg tracking-[0.3em]"
                />
              )}
            </Field>
            {error && <Banner tone="danger">{error}</Banner>}
            <Button type="submit" loading={busy}>
              Подтвердить и включить
            </Button>
          </form>
        )}
      </Modal>

      <Modal
        open={Boolean(confirmOff)}
        onClose={() => setConfirmOff(null)}
        title="Отключить 2FA?"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmOff(null)}>
              Отмена
            </Button>
            <Button variant="danger" onClick={disable} loading={busy}>
              Отключить
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink">Для входа снова будет достаточно только пароля от аккаунта. Это снижает защиту.</p>
      </Modal>
    </div>
  );
}
