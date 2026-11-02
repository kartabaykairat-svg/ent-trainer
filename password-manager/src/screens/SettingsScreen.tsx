import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import {
  Download,
  FolderCog,
  History,
  KeyRound,
  Lock,
  LogOut,
  Palette,
  Pencil,
  Repeat,
  ShieldCheck,
  Smartphone,
  Trash2,
  UserX,
} from 'lucide-react';
import { ScreenHeader } from '../components/AppShell';
import { Banner, Button, Card, Field, IconButton, Input, Modal, PasswordInput, Segmented, Toggle } from '../components/ui';
import { backend } from '../lib/backend';
import { humanError } from '../lib/errors';
import { canInstall, isIos, isStandalone, onInstallChange, promptInstall } from '../lib/pwa';
import type { Category } from '../lib/types';
import { useSession } from '../state/session';
import { AUTOLOCK_OPTIONS, useSettings, type Theme } from '../state/settings';
import { useToast } from '../state/toast';
import { ChangeMasterModal } from './settings/ChangeMaster';
import { ImportExport } from './settings/ImportExport';
import { LoginLog } from './settings/LoginLog';
import { TwoFactorSection } from './settings/TwoFactor';

function SectionTitle({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-ink">
      <span className="text-accent">{icon}</span>
      {children}
    </h2>
  );
}

function CategoriesManager() {
  const { meta, entries, setCustomCategories, offline } = useSession();
  const { toast } = useToast();
  const [edit, setEdit] = useState<Category | null>(null);
  const [name, setName] = useState('');
  const [del, setDel] = useState<Category | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!edit || !name.trim()) return;
    setBusy(true);
    try {
      await setCustomCategories(meta.customCategories.map((c) => (c.id === edit.id ? { ...c, name: name.trim().slice(0, 40) } : c)));
      setEdit(null);
    } catch (err) {
      toast(humanError(err), 'error');
    } finally {
      setBusy(false);
    }
  };
  const remove = async () => {
    if (!del) return;
    setBusy(true);
    try {
      await setCustomCategories(meta.customCategories.filter((c) => c.id !== del.id));
      toast('Категория удалена');
      setDel(null);
    } catch (err) {
      toast(humanError(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  if (!meta.customCategories.length)
    return <p className="text-sm text-muted">Своих категорий пока нет. Создайте их кнопкой «+ Своя» над списком паролей.</p>;
  return (
    <>
      <ul className="flex flex-col divide-y divide-line">
        {meta.customCategories.map((c) => (
          <li key={c.id} className="flex items-center gap-2 py-1.5">
            <span className="flex-1 text-sm text-ink">{c.name}</span>
            <span className="text-xs text-muted">{entries.filter((e) => e.category === c.id).length}</span>
            <IconButton
              label={`Переименовать «${c.name}»`}
              disabled={offline}
              onClick={() => {
                setEdit(c);
                setName(c.name);
              }}
            >
              <Pencil className="size-4" aria-hidden />
            </IconButton>
            <IconButton label={`Удалить «${c.name}»`} disabled={offline} onClick={() => setDel(c)} className="hover:text-danger">
              <Trash2 className="size-4" aria-hidden />
            </IconButton>
          </li>
        ))}
      </ul>
      <Modal
        open={Boolean(edit)}
        onClose={() => setEdit(null)}
        title="Переименовать категорию"
        size="sm"
        footer={
          <Button type="submit" form="cat-edit" loading={busy}>
            Сохранить
          </Button>
        }
      >
        <form id="cat-edit" onSubmit={save}>
          <Field label="Название">{(id) => <Input id={id} value={name} onChange={(e) => setName(e.target.value)} maxLength={40} />}</Field>
        </form>
      </Modal>
      <Modal
        open={Boolean(del)}
        onClose={() => setDel(null)}
        title="Удалить категорию?"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDel(null)}>
              Отмена
            </Button>
            <Button variant="danger" onClick={remove} loading={busy}>
              Удалить
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink">Записи из категории «{del?.name}» не удалятся — они перейдут в «Другое».</p>
      </Modal>
    </>
  );
}

function InstallSection() {
  const [, force] = useState(0);
  useEffect(() => onInstallChange(() => force((x) => x + 1)), []);
  if (isStandalone()) return <p className="text-sm text-ok">Приложение уже установлено на это устройство.</p>;
  return (
    <div className="flex flex-col gap-2 text-sm text-muted">
      <p>Установите приложение на главный экран: оно будет открываться как обычное и работать без интернета (только просмотр).</p>
      {canInstall() ? (
        <Button className="self-start" icon={<Download className="size-4" />} onClick={() => void promptInstall()}>
          Установить
        </Button>
      ) : isIos() ? (
        <p>
          iPhone/iPad: в Safari нажмите «Поделиться» → «На экран „Домой“».
        </p>
      ) : (
        <p>Android/Chrome: меню ⋮ → «Установить приложение». На компьютере — значок установки в адресной строке.</p>
      )}
    </div>
  );
}

function DeleteAccount() {
  const { deleteAccount, verifyMaster, offline } = useSession();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [word, setWord] = useState('');
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const local = backend.mode === 'local';

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (word.trim().toUpperCase() !== 'УДАЛИТЬ') return setError('Введите слово УДАЛИТЬ.');
    setBusy(true);
    try {
      if (!(await verifyMaster(pw))) {
        setError('Неверный мастер-пароль.');
        setBusy(false);
        return;
      }
      await deleteAccount();
      toast(local ? 'Все данные удалены с устройства' : 'Аккаунт и все данные удалены', 'info');
    } catch (err) {
      setError(humanError(err));
      setBusy(false);
    }
  };

  return (
    <>
      <Button variant="danger" icon={<UserX className="size-4" />} onClick={() => setOpen(true)} disabled={offline}>
        {local ? 'Удалить все данные' : 'Удалить аккаунт'}
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={local ? 'Удалить все данные?' : 'Удалить аккаунт?'}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Отмена
            </Button>
            <Button type="submit" form="del-acc" variant="danger" loading={busy}>
              Удалить навсегда
            </Button>
          </>
        }
      >
        <form id="del-acc" onSubmit={submit} className="flex flex-col gap-4">
          <Banner tone="danger">
            {local
              ? 'Все записи на этом устройстве будут удалены. Отменить это нельзя.'
              : 'Аккаунт, все записи, история и журнал входов будут удалены с сервера. Отменить это нельзя.'}{' '}
            Сначала сделайте экспорт, если данные ещё нужны.
          </Banner>
          <Field label="Введите слово УДАЛИТЬ" required>
            {(id) => <Input id={id} value={word} onChange={(e) => setWord(e.target.value)} autoComplete="off" />}
          </Field>
          <Field label="Мастер-пароль" required>
            {(id) => <PasswordInput id={id} value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="current-password" />}
          </Field>
          {error && <Banner tone="danger">{error}</Banner>}
        </form>
      </Modal>
    </>
  );
}

export function SettingsScreen() {
  const settings = useSettings();
  const { user, lock, signOut, offline } = useSession();
  const [changeOpen, setChangeOpen] = useState(false);
  const remote = backend.mode === 'supabase';

  return (
    <div className="flex-1 overflow-y-auto pb-8">
      <ScreenHeader title="Настройки" />
      <div className="mx-auto flex max-w-2xl flex-col gap-4 px-4 sm:px-6">
        <Card>
          <SectionTitle icon={<Lock className="size-5" aria-hidden />}>Автоблокировка</SectionTitle>
          <p className="mb-3 text-sm text-muted">
            Хранилище блокируется после бездействия и при закрытии вкладки. Ключ шифрования стирается из памяти.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Segmented
              label="Время бездействия до блокировки"
              value={String(settings.autoLockMin)}
              onChange={(v) => settings.set('autoLockMin', Number(v))}
              options={AUTOLOCK_OPTIONS.map((m) => ({ value: String(m), label: `${m} мин` }))}
            />
            <Button variant="secondary" size="sm" icon={<Lock className="size-4" />} onClick={lock}>
              Заблокировать сейчас
            </Button>
          </div>
        </Card>

        <Card>
          <SectionTitle icon={<Palette className="size-5" aria-hidden />}>Оформление</SectionTitle>
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm text-ink">Тема</span>
              <Segmented<Theme>
                label="Тема"
                value={settings.theme}
                onChange={(v) => settings.set('theme', v)}
                options={[
                  { value: 'system', label: 'Как в системе' },
                  { value: 'light', label: 'Светлая' },
                  { value: 'dark', label: 'Тёмная' },
                ]}
              />
            </div>
            <Toggle
              label="Значки сайтов"
              description="Загружаются через DuckDuckGo по домену. Логины и пароли не передаются."
              checked={settings.favicons}
              onChange={(v) => settings.set('favicons', v)}
            />
          </div>
        </Card>

        <Card>
          <SectionTitle icon={<FolderCog className="size-5" aria-hidden />}>Свои категории</SectionTitle>
          <CategoriesManager />
        </Card>

        <Card>
          <SectionTitle icon={<KeyRound className="size-5" aria-hidden />}>Мастер-пароль</SectionTitle>
          <p className="mb-3 text-sm text-muted">
            Ключ получается из мастер-пароля через PBKDF2-SHA-256 (600 000 итераций, уникальная соль). Мастер-пароль
            никуда не отправляется.
          </p>
          <Button variant="secondary" icon={<Repeat className="size-4" />} onClick={() => setChangeOpen(true)} disabled={offline}>
            Сменить мастер-пароль
          </Button>
        </Card>

        {remote && (
          <Card>
            <SectionTitle icon={<ShieldCheck className="size-5" aria-hidden />}>Двухфакторная аутентификация</SectionTitle>
            {offline ? <p className="text-sm text-muted">Недоступно без сети.</p> : <TwoFactorSection />}
          </Card>
        )}

        {remote && (
          <Card>
            <SectionTitle icon={<History className="size-5" aria-hidden />}>Журнал входов</SectionTitle>
            {offline ? <p className="text-sm text-muted">Недоступно без сети.</p> : <LoginLog />}
          </Card>
        )}

        <Card>
          <SectionTitle icon={<Download className="size-5" aria-hidden />}>Импорт и экспорт</SectionTitle>
          <ImportExport />
        </Card>

        <Card>
          <SectionTitle icon={<Smartphone className="size-5" aria-hidden />}>Установка на телефон</SectionTitle>
          <InstallSection />
        </Card>

        <Card>
          <SectionTitle icon={<UserX className="size-5" aria-hidden />}>Аккаунт</SectionTitle>
          {user?.email && (
            <p className="mb-3 text-sm text-muted">
              Вы вошли как <span className="text-ink">{user.email}</span>
            </p>
          )}
          {!remote && (
            <p className="mb-3 text-sm text-muted">
              Локальный режим: зашифрованные данные хранятся только в этом браузере. Чтобы синхронизировать устройства,
              подключите Supabase (см. README).
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {remote && (
              <Button variant="secondary" icon={<LogOut className="size-4" />} onClick={() => void signOut()}>
                Выйти
              </Button>
            )}
            <DeleteAccount />
          </div>
        </Card>
        <p className="px-1 pb-4 text-center text-xs text-muted">
          Шифрование: AES-256-GCM · PBKDF2-SHA-256 · Web Crypto API. Генерация — crypto.getRandomValues.
        </p>
      </div>
      <ChangeMasterModal open={changeOpen} onClose={() => setChangeOpen(false)} />
    </div>
  );
}
