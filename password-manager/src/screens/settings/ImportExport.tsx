import { useRef, useState, type FormEvent } from 'react';
import { AlertTriangle, Download, FileDown, FileLock2, Upload } from 'lucide-react';
import { StrengthMeter } from '../../components/StrengthMeter';
import { Banner, Button, Field, Modal, PasswordInput, Toggle } from '../../components/ui';
import { humanError } from '../../lib/errors';
import { plural } from '../../lib/format';
import { isDuplicate } from '../../lib/search';
import { estimateStrength } from '../../lib/strength';
import {
  FORMAT_NAMES,
  downloadFile,
  exportCsv,
  exportEncrypted,
  importEncrypted,
  isEncryptedExport,
  parseImportCsv,
  type ImportDraft,
} from '../../lib/transfer';
import type { Category } from '../../lib/types';
import { useSession } from '../../state/session';
import { useToast } from '../../state/toast';

const today = () => new Date().toISOString().slice(0, 10);

interface Pending {
  source: string;
  drafts: ImportDraft[];
  skipped: number;
  categories: Category[];
}

export function ImportExport() {
  const { entries, meta, importDrafts, setCustomCategories, verifyMaster, offline } = useSession();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [skipDup, setSkipDup] = useState(true);
  const [encFile, setEncFile] = useState<string | null>(null);
  const [filePw, setFilePw] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exportMode, setExportMode] = useState<'json' | 'csv' | null>(null);
  const [expPw, setExpPw] = useState('');
  const [expPw2, setExpPw2] = useState('');
  const [ack, setAck] = useState(false);

  const onFile = async (file: File) => {
    setError(null);
    if (file.size > 20 * 1024 * 1024) return toast('Файл слишком большой', 'error');
    const text = await file.text();
    try {
      if (isEncryptedExport(text)) {
        setEncFile(text);
        setFilePw('');
      } else {
        const { format, drafts, skipped } = parseImportCsv(text);
        if (!drafts.length) throw new Error('Не найдено ни одной записи с паролем.');
        setPending({ source: FORMAT_NAMES[format], drafts, skipped, categories: [] });
      }
    } catch (e) {
      toast(e instanceof Error && !/^[A-Z]/.test(e.message) ? e.message : humanError(e), 'error');
    }
  };

  const decryptFile = async (e: FormEvent) => {
    e.preventDefault();
    if (!encFile) return;
    setBusy(true);
    setError(null);
    try {
      const { drafts, categories } = await importEncrypted(encFile, filePw);
      setEncFile(null);
      setFilePw('');
      setPending({ source: 'зашифрованный файл', drafts, skipped: 0, categories });
    } catch (err) {
      setError(humanError(err));
    } finally {
      setBusy(false);
    }
  };

  const dupCount = pending ? pending.drafts.filter((d) => entries.some((x) => isDuplicate(x, d))).length : 0;

  const doImport = async () => {
    if (!pending) return;
    setBusy(true);
    try {
      // категории из файла: добавляем отсутствующие
      const known = new Set(meta.customCategories.map((c) => c.id));
      const newCats = pending.categories.filter((c) => !known.has(c.id));
      if (newCats.length) await setCustomCategories([...meta.customCategories, ...newCats]);
      const list = skipDup ? pending.drafts.filter((d) => !entries.some((x) => isDuplicate(x, d))) : pending.drafts;
      const n = await importDrafts(list);
      toast(`Импортировано ${n} ${plural(n, 'запись', 'записи', 'записей')}`);
      setPending(null);
    } catch (e) {
      toast(humanError(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  const closeExport = () => {
    setExportMode(null);
    setExpPw('');
    setExpPw2('');
    setAck(false);
    setError(null);
  };

  const doExport = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (exportMode === 'json') {
      if (expPw.length < 10) return setError('Пароль файла — минимум 10 символов.');
      if (estimateStrength(expPw).score < 2) return setError('Пароль файла слишком слабый.');
      if (expPw !== expPw2) return setError('Пароли не совпадают.');
      setBusy(true);
      try {
        const json = await exportEncrypted(entries, meta.customCategories, expPw);
        downloadFile(`passwords-${today()}.pmvault.json`, json, 'application/json');
        toast('Зашифрованный файл сохранён');
        closeExport();
      } catch (err) {
        setError(humanError(err));
      } finally {
        setBusy(false);
      }
    } else {
      if (!ack) return setError('Подтвердите, что понимаете риск.');
      setBusy(true);
      try {
        if (!(await verifyMaster(expPw))) {
          setError('Неверный мастер-пароль.');
          return;
        }
        downloadFile(`passwords-${today()}-НЕЗАШИФРОВАНО.csv`, exportCsv(entries, meta.customCategories), 'text/csv;charset=utf-8');
        toast('CSV сохранён. Удалите файл, как только он станет не нужен', 'info');
        closeExport();
      } catch (err) {
        setError(humanError(err));
      } finally {
        setBusy(false);
      }
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="text-sm font-semibold text-ink">Импорт</h3>
        <p className="mt-1 text-sm text-muted">
          CSV из Chrome (и Edge, Яндекс Браузера), Bitwarden, LastPass или зашифрованный файл экспорта этого приложения.
        </p>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.json,text/csv,application/json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onFile(f);
            e.target.value = '';
          }}
        />
        <Button
          variant="secondary"
          className="mt-3"
          icon={<Upload className="size-4" />}
          onClick={() => fileRef.current?.click()}
          disabled={offline}
        >
          Выбрать файл
        </Button>
      </div>
      <div>
        <h3 className="text-sm font-semibold text-ink">Экспорт</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="secondary" icon={<FileLock2 className="size-4" />} onClick={() => setExportMode('json')} disabled={!entries.length}>
            Зашифрованный JSON
          </Button>
          <Button variant="secondary" icon={<FileDown className="size-4" />} onClick={() => setExportMode('csv')} disabled={!entries.length}>
            CSV (без шифрования)
          </Button>
        </div>
      </div>

      <Modal
        open={Boolean(encFile)}
        onClose={() => setEncFile(null)}
        title="Файл зашифрован"
        size="sm"
        footer={
          <Button type="submit" form="dec-form" loading={busy}>
            Расшифровать
          </Button>
        }
      >
        <form id="dec-form" onSubmit={decryptFile} className="flex flex-col gap-4">
          <Field label="Пароль файла" required>
            {(id) => <PasswordInput id={id} value={filePw} onChange={(e) => setFilePw(e.target.value)} autoComplete="off" />}
          </Field>
          {error && <Banner tone="danger">{error}</Banner>}
        </form>
      </Modal>

      <Modal
        open={Boolean(pending)}
        onClose={() => setPending(null)}
        title="Импорт записей"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setPending(null)}>
              Отмена
            </Button>
            <Button onClick={doImport} loading={busy} icon={<Download className="size-4" />}>
              Импортировать
            </Button>
          </>
        }
      >
        {pending && (
          <div className="flex flex-col gap-3 text-sm text-ink">
            <p>
              Источник: <strong>{pending.source}</strong>. Найдено записей: <strong>{pending.drafts.length}</strong>
              {pending.skipped > 0 && <>, пропущено (без пароля или не логины): {pending.skipped}</>}.
            </p>
            {dupCount > 0 && (
              <Toggle
                label={`Пропустить уже существующие (${dupCount})`}
                description="Совпадают сервис и логин"
                checked={skipDup}
                onChange={setSkipDup}
              />
            )}
            {pending.source !== 'зашифрованный файл' && (
              <p className="text-muted">Категории определятся автоматически, их можно поменять потом.</p>
            )}
            {pending.source !== 'зашифрованный файл' && (
              <Banner tone="warn" icon={<AlertTriangle className="size-4" />}>
                После импорта удалите CSV-файл — в нём пароли хранятся открытым текстом.
              </Banner>
            )}
          </div>
        )}
      </Modal>

      <Modal
        open={exportMode !== null}
        onClose={closeExport}
        title={exportMode === 'json' ? 'Зашифрованный экспорт' : 'Экспорт в CSV'}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={closeExport}>
              Отмена
            </Button>
            <Button
              type="submit"
              form="exp-form"
              variant={exportMode === 'csv' ? 'danger' : 'primary'}
              loading={busy}
              icon={<FileDown className="size-4" />}
            >
              Скачать
            </Button>
          </>
        }
      >
        <form id="exp-form" onSubmit={doExport} className="flex flex-col gap-4">
          {exportMode === 'json' ? (
            <>
              <p className="text-sm text-muted">
                Файл зашифрован AES-256-GCM отдельным паролем (PBKDF2, 600 000 итераций). Его можно импортировать
                обратно в это приложение.
              </p>
              <Field label="Пароль для файла" required>
                {(id) => <PasswordInput id={id} value={expPw} onChange={(e) => setExpPw(e.target.value)} autoComplete="new-password" />}
              </Field>
              <StrengthMeter password={expPw} />
              <Field label="Повторите пароль" required>
                {(id) => <PasswordInput id={id} value={expPw2} onChange={(e) => setExpPw2(e.target.value)} autoComplete="new-password" />}
              </Field>
            </>
          ) : (
            <>
              <Banner tone="danger" icon={<AlertTriangle className="size-4" />}>
                <strong>Небезопасно!</strong> В CSV все пароли будут записаны открытым текстом. Любой, кто получит файл
                (или доступ к папке «Загрузки», облаку, почте), увидит их. Используйте только для переноса в другой
                менеджер паролей и сразу удалите файл.
              </Banner>
              <label className="flex cursor-pointer items-start gap-2.5 text-sm text-ink">
                <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} className="mt-0.5 size-4 accent-[var(--accent)]" />
                Я понимаю риск
              </label>
              <Field label="Мастер-пароль для подтверждения" required>
                {(id) => <PasswordInput id={id} value={expPw} onChange={(e) => setExpPw(e.target.value)} autoComplete="current-password" />}
              </Field>
            </>
          )}
          {error && <Banner tone="danger">{error}</Banner>}
        </form>
      </Modal>
    </div>
  );
}
