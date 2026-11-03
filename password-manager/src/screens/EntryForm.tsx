import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ChevronDown, Save, Star, Wand2 } from 'lucide-react';
import { StrengthMeter } from '../components/StrengthMeter';
import { Banner, Button, Field, Input, Modal, PasswordInput, TextArea, Toggle, cx, inputClass } from '../components/ui';
import { allCategories } from '../lib/categories';
import { humanError } from '../lib/errors';
import { generate } from '../lib/generator';
import { isDuplicate } from '../lib/search';
import type { Entry, EntryDraft } from '../lib/types';
import { loadGeneratorOptions } from '../lib/useGenerator';
import { useSession } from '../state/session';
import { useToast } from '../state/toast';

const EMPTY: EntryDraft = { service: '', login: '', password: '', url: '', category: 'other', note: '', favorite: false };

interface Props {
  open: boolean;
  onClose: () => void;
  editing?: Entry | null;
  defaultCategory?: string;
  onSaved?: (e: Entry) => void;
}

export function EntryForm({ open, onClose, editing, defaultCategory, onSaved }: Props) {
  const { saveEntry, entries, meta } = useSession();
  const { toast } = useToast();
  const [draft, setDraft] = useState<EntryDraft>(EMPTY);
  const [more, setMore] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof EntryDraft, string>>>({});
  const [error, setError] = useState<string | null>(null);
  const [dup, setDup] = useState<Entry | null>(null);
  const [added, setAdded] = useState<string | null>(null);
  const serviceRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setError(null);
    setDup(null);
    setAdded(null);
    if (editing) {
      const { service, login, password, url, category, note, favorite } = editing;
      setDraft({ service, login, password, url, category, note, favorite });
      setMore(Boolean(note || favorite || category !== 'other'));
    } else {
      setDraft({ ...EMPTY, category: defaultCategory ?? 'other' });
      setMore(false);
    }
  }, [open, editing, defaultCategory]);

  const set = <K extends keyof EntryDraft>(k: K, v: EntryDraft[K]) => {
    setDraft((d) => ({ ...d, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const validate = () => {
    const e: typeof errors = {};
    if (!draft.service.trim()) e.service = 'Укажите сервис';
    if (!draft.login.trim()) e.login = 'Укажите логин или email';
    if (!draft.password) e.password = 'Укажите пароль';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const doSave = async (target?: Entry) => {
    setBusy(true);
    setError(null);
    try {
      const data: EntryDraft = target
        ? {
            service: target.service,
            login: target.login,
            password: draft.password,
            url: target.url || draft.url,
            category: target.category,
            note: target.note,
            favorite: target.favorite,
          }
        : draft;
      const saved = await saveEntry(data, target?.id ?? editing?.id);
      onSaved?.(saved);
      if (editing || target) {
        toast(target ? `Пароль для «${saved.service}» обновлён` : 'Изменения сохранены');
        onClose();
      } else {
        // форма очищается и готова к следующей записи
        setAdded(saved.service);
        setDraft({ ...EMPTY, category: draft.category });
        setMore(false);
        setDup(null);
        toast(`«${saved.service}» добавлен`);
        serviceRef.current?.focus();
      }
    } catch (err) {
      setError(humanError(err));
    } finally {
      setBusy(false);
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    const existing = entries.find((x) => x.id !== editing?.id && isDuplicate(x, draft));
    if (existing) {
      setDup(existing);
      return;
    }
    void doSave();
  };

  const onGenerate = async () => {
    const pw = await generate(loadGeneratorOptions());
    set('password', pw);
  };

  const cats = allCategories(meta.customCategories);

  return (
    <>
      <Modal
        open={open && !dup}
        onClose={onClose}
        title={editing ? 'Редактировать запись' : 'Новая запись'}
        footer={
          <>
            <Button variant="secondary" onClick={onClose}>
              {added && !editing ? 'Готово' : 'Отмена'}
            </Button>
            <Button type="submit" form="entry-form" loading={busy} icon={<Save className="size-4" />}>
              Сохранить
            </Button>
          </>
        }
      >
        <form id="entry-form" onSubmit={submit} className="flex flex-col gap-4" noValidate>
          {added && (
            <Banner>
              «{added}» добавлен в список. Можно добавить следующую запись.
            </Banner>
          )}
          <Field label="Сервис / откуда" required error={errors.service}>
            {(id, d) => (
              <Input
                ref={serviceRef}
                id={id}
                aria-describedby={d}
                aria-invalid={Boolean(errors.service)}
                value={draft.service}
                onChange={(e) => set('service', e.target.value)}
                placeholder="Например, Instagram"
                autoComplete="off"
                data-autofocus
                maxLength={200}
              />
            )}
          </Field>
          <Field label="Логин или email" required error={errors.login}>
            {(id, d) => (
              <Input
                id={id}
                aria-describedby={d}
                aria-invalid={Boolean(errors.login)}
                value={draft.login}
                onChange={(e) => set('login', e.target.value)}
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                maxLength={500}
              />
            )}
          </Field>
          <Field
            label="Пароль"
            required
            error={errors.password}
            trailing={
              <button
                type="button"
                onClick={onGenerate}
                className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-medium text-accent hover:bg-accent-soft"
              >
                <Wand2 className="size-4" aria-hidden /> Сгенерировать
              </button>
            }
          >
            {(id, d) => (
              <PasswordInput
                id={id}
                aria-describedby={d}
                aria-invalid={Boolean(errors.password)}
                value={draft.password}
                onChange={(e) => set('password', e.target.value)}
                autoComplete="new-password"
                maxLength={1000}
              />
            )}
          </Field>
          {draft.password && <StrengthMeter password={draft.password} />}
          <Field label="Ссылка на сайт">
            {(id) => (
              <Input
                id={id}
                value={draft.url}
                onChange={(e) => set('url', e.target.value)}
                placeholder="instagram.com"
                inputMode="url"
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                maxLength={2000}
              />
            )}
          </Field>

          <div className="rounded-xl border border-line">
            <button
              type="button"
              onClick={() => setMore((m) => !m)}
              aria-expanded={more}
              aria-controls="entry-more"
              className="flex w-full items-center justify-between rounded-xl px-3.5 py-3 text-sm font-medium text-ink hover:bg-sunken"
            >
              Ещё
              <ChevronDown className={cx('size-4 text-muted transition-transform', more && 'rotate-180')} aria-hidden />
            </button>
            {more && (
              <div id="entry-more" className="animate-fade flex flex-col gap-4 border-t border-line px-3.5 py-4">
                <Field label="Категория">
                  {(id) => (
                    <select
                      id={id}
                      value={draft.category}
                      onChange={(e) => set('category', e.target.value)}
                      className={inputClass}
                    >
                      {cats.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  )}
                </Field>
                <Field label="Заметка" hint="Заметка тоже шифруется.">
                  {(id, d) => (
                    <TextArea
                      id={id}
                      aria-describedby={d}
                      value={draft.note}
                      onChange={(e) => set('note', e.target.value)}
                      maxLength={5000}
                    />
                  )}
                </Field>
                <div className="flex items-center gap-2">
                  <Star className={cx('size-4', draft.favorite ? 'fill-warn text-warn' : 'text-muted')} aria-hidden />
                  <div className="flex-1">
                    <Toggle label="Избранное" checked={draft.favorite} onChange={(v) => set('favorite', v)} />
                  </div>
                </div>
              </div>
            )}
          </div>
          {error && <Banner tone="danger">{error}</Banner>}
        </form>
      </Modal>

      <Modal
        open={Boolean(open && dup)}
        onClose={() => setDup(null)}
        title="Такая запись уже есть"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDup(null)}>
              Отмена
            </Button>
            <Button variant="secondary" onClick={() => void doSave()} disabled={busy}>
              Добавить отдельно
            </Button>
            <Button onClick={() => dup && void doSave(dup)} loading={busy}>
              Обновить пароль
            </Button>
          </>
        }
      >
        {dup && (
          <p className="text-sm text-ink">
            Запись <strong>«{dup.service}»</strong> с логином <strong className="break-all">{dup.login}</strong> уже
            сохранена. Обновить в ней пароль? Старый пароль сохранится в истории.
          </p>
        )}
      </Modal>
    </>
  );
}

