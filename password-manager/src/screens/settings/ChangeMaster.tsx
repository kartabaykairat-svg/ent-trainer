import { useState, type FormEvent } from 'react';
import { AlertTriangle, KeyRound } from 'lucide-react';
import { StrengthMeter } from '../../components/StrengthMeter';
import { Banner, Button, Field, Modal, PasswordInput } from '../../components/ui';
import { humanError } from '../../lib/errors';
import { estimateStrength } from '../../lib/strength';
import { useSession } from '../../state/session';
import { useToast } from '../../state/toast';

export function ChangeMasterModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { changeMaster, entries } = useSession();
  const { toast } = useToast();
  const [oldPw, setOldPw] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    if (busy) return;
    setOldPw('');
    setPw('');
    setPw2('');
    setError(null);
    onClose();
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (pw.length < 10) return setError('Новый мастер-пароль — минимум 10 символов.');
    if (estimateStrength(pw).score < 2) return setError('Новый мастер-пароль слишком слабый.');
    if (pw !== pw2) return setError('Новые пароли не совпадают.');
    if (pw === oldPw) return setError('Новый пароль совпадает с текущим.');
    setBusy(true);
    try {
      await changeMaster(oldPw, pw);
      toast(`Мастер-пароль изменён, перешифровано записей: ${entries.length}`);
      setBusy(false);
      close();
    } catch (err) {
      setError(humanError(err));
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="Смена мастер-пароля"
      footer={
        <>
          <Button variant="secondary" onClick={close} disabled={busy}>
            Отмена
          </Button>
          <Button type="submit" form="change-master" loading={busy} icon={<KeyRound className="size-4" />}>
            {busy ? 'Перешифровываем…' : 'Сменить'}
          </Button>
        </>
      }
    >
      <form id="change-master" onSubmit={submit} className="flex flex-col gap-4">
        <p className="text-sm text-muted">
          Все записи будут расшифрованы и заново зашифрованы новым ключом одной транзакцией. Если что-то пойдёт не так,
          изменения не применятся.
        </p>
        <Field label="Текущий мастер-пароль" required>
          {(id) => <PasswordInput id={id} autoComplete="current-password" value={oldPw} onChange={(e) => setOldPw(e.target.value)} />}
        </Field>
        <Field label="Новый мастер-пароль" required>
          {(id) => <PasswordInput id={id} autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} />}
        </Field>
        <StrengthMeter password={pw} />
        <Field label="Повторите новый мастер-пароль" required>
          {(id) => <PasswordInput id={id} autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} />}
        </Field>
        <Banner tone="warn" icon={<AlertTriangle className="size-4" />}>
          Если забудете мастер-пароль, восстановить данные невозможно.
        </Banner>
        {error && <Banner tone="danger">{error}</Banner>}
      </form>
    </Modal>
  );
}
