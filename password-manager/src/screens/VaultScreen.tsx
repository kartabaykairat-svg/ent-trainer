import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Copy, Eye, EyeOff, KeyRound, Plus, Search, Star, User, X } from 'lucide-react';
import { ScreenHeader } from '../components/AppShell';
import { useCopy } from '../components/EntryActions';
import { SiteIcon } from '../components/SiteIcon';
import { Banner, Button, Field, IconButton, Input, Modal, Segmented, cx } from '../components/ui';
import { allCategories } from '../lib/categories';
import { humanError } from '../lib/errors';
import { plural } from '../lib/format';
import { letterOf, matches, sortEntries, type SortMode } from '../lib/search';
import type { Entry } from '../lib/types';
import { useMedia } from '../lib/useMedia';
import { useSession } from '../state/session';
import { useSettings } from '../state/settings';
import { useToast } from '../state/toast';
import { EntryDetail } from './EntryDetail';
import { EntryForm } from './EntryForm';

function EntryListItem({
  entry,
  selected,
  onSelect,
}: {
  entry: Entry;
  selected: boolean;
  onSelect: () => void;
}) {
  const copy = useCopy();
  const [reveal, setReveal] = useState(false);
  useEffect(() => {
    if (!reveal) return;
    const t = window.setTimeout(() => setReveal(false), 20_000);
    return () => window.clearTimeout(t);
  }, [reveal]);

  return (
    <li
      className={cx(
        'group flex items-center gap-1 rounded-xl pr-1 transition-colors',
        selected ? 'bg-accent-soft' : 'hover:bg-sunken',
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        aria-current={selected || undefined}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-2 py-2 text-left"
      >
        <SiteIcon service={entry.service} url={entry.url} />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="truncate font-medium text-ink">{entry.service}</span>
            {entry.favorite && <Star className="size-3.5 shrink-0 fill-warn text-warn" aria-label="Избранное" />}
          </span>
          <span className="block truncate text-sm text-muted">
            {reveal ? <span className="font-mono text-ink">{entry.password}</span> : entry.login}
          </span>
        </span>
      </button>
      <IconButton label={`Копировать логин: ${entry.service}`} onClick={() => copy(entry, entry.login, 'login')} className="size-9">
        <User className="size-4" aria-hidden />
      </IconButton>
      <IconButton
        label={`Копировать пароль: ${entry.service}`}
        onClick={() => copy(entry, entry.password, 'password')}
        className="size-9"
      >
        <Copy className="size-4" aria-hidden />
      </IconButton>
      <IconButton
        label={reveal ? `Скрыть пароль: ${entry.service}` : `Показать пароль: ${entry.service}`}
        onClick={() => setReveal((r) => !r)}
        aria-pressed={reveal}
        className="size-9"
      >
        {reveal ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
      </IconButton>
    </li>
  );
}

function AddCategoryModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (id: string) => void }) {
  const { meta, setCustomCategories } = useSession();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open) {
      setName('');
      setError(null);
    }
  }, [open]);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const n = name.trim();
    if (!n) return setError('Введите название');
    if (allCategories(meta.customCategories).some((c) => c.name.toLowerCase() === n.toLowerCase()))
      return setError('Такая категория уже есть');
    setBusy(true);
    try {
      const id = `c-${crypto.randomUUID().slice(0, 8)}`;
      await setCustomCategories([...meta.customCategories, { id, name: n.slice(0, 40) }]);
      onCreated(id);
      onClose();
    } catch (err) {
      setError(humanError(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Новая категория"
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Отмена
          </Button>
          <Button type="submit" form="cat-form" loading={busy}>
            Создать
          </Button>
        </>
      }
    >
      <form id="cat-form" onSubmit={submit}>
        <Field label="Название" error={error}>
          {(id, d) => (
            <Input id={id} aria-describedby={d} value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder="Например, Игры" />
          )}
        </Field>
      </form>
    </Modal>
  );
}

export function VaultScreen() {
  const { entries, meta, offline, undecryptable } = useSession();
  const settings = useSettings();
  const { toast } = useToast();
  const wide = useMedia('(min-width: 1024px)');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Entry | null>(null);
  const [catOpen, setCatOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const sort = settings.sort;

  const cats = allCategories(meta.customCategories);
  const selected = entries.find((e) => e.id === selectedId) ?? null;

  // горячие клавиши: «/» или Ctrl+K — поиск, Alt+N — новая запись
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      const typing = t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable;
      if (document.querySelector('[role="dialog"]')) return;
      if ((e.key === '/' && !typing) || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k')) {
        e.preventDefault();
        searchRef.current?.focus();
      } else if (e.altKey && e.code === 'KeyN' && !offline) {
        e.preventDefault();
        openNew();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const filtered = useMemo(
    () => entries.filter((e) => (category === 'all' || e.category === category) && matches(e, query)),
    [entries, category, query],
  );
  const favorites = useMemo(() => sortEntries(filtered.filter((e) => e.favorite), sort), [filtered, sort]);
  const rest = useMemo(() => sortEntries(filtered.filter((e) => !e.favorite), sort), [filtered, sort]);

  const groups = useMemo(() => {
    if (sort !== 'alpha') return [{ letter: '', items: rest }];
    const out: { letter: string; items: Entry[] }[] = [];
    for (const e of rest) {
      const l = letterOf(e.service);
      const last = out[out.length - 1];
      if (last && last.letter === l) last.items.push(e);
      else out.push({ letter: l, items: [e] });
    }
    // «#» (цифры и символы) — в конце
    out.sort((a, b) => (a.letter === '#' ? 1 : 0) - (b.letter === '#' ? 1 : 0));
    return out;
  }, [rest, sort]);

  const jumpTo = (letter: string) => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-letter="${letter}"]`);
    el?.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    el?.querySelector<HTMLElement>('button')?.focus({ preventScroll: true });
  };

  function openNew() {
    setEditing(null);
    setFormOpen(true);
  }

  const showDetailOnly = !wide && selected;

  const list = (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <ScreenHeader title="Пароли">
        <span className="hidden sm:block">
          <Button onClick={openNew} disabled={offline} icon={<Plus className="size-4" aria-hidden />} title="Добавить (Alt+N)">
            Добавить
          </Button>
        </span>
      </ScreenHeader>

      <div className="flex flex-col gap-3 px-4 pb-2 sm:px-6">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setQuery('');
            }}
            placeholder="Поиск по сервису, логину, ссылке"
            aria-label="Поиск"
            className="h-11 w-full rounded-xl border border-line bg-surface pl-10 pr-10 text-[15px] text-ink placeholder:text-muted/80 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 [&::-webkit-search-cancel-button]:hidden"
          />
          {query && (
            <IconButton label="Очистить поиск" onClick={() => setQuery('')} className="absolute right-0.5 top-1/2 size-10 -translate-y-1/2">
              <X className="size-4" aria-hidden />
            </IconButton>
          )}
        </div>

        <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 sm:-mx-6 sm:px-6" role="tablist" aria-label="Категории">
          {[{ id: 'all', name: 'Все' }, ...cats].map((c) => {
            const count = c.id === 'all' ? entries.length : entries.filter((e) => e.category === c.id).length;
            return (
              <button
                key={c.id}
                type="button"
                role="tab"
                aria-selected={category === c.id}
                onClick={() => setCategory(c.id)}
                className={cx(
                  'shrink-0 rounded-full border px-3.5 py-1.5 text-sm transition-colors',
                  category === c.id
                    ? 'border-accent bg-accent text-on-accent'
                    : 'border-line bg-surface text-muted hover:border-accent/50 hover:text-ink',
                )}
              >
                {c.name}
                {count > 0 && <span className={cx('ml-1.5 text-xs', category === c.id ? 'opacity-80' : 'opacity-70')}>{count}</span>}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setCatOpen(true)}
            disabled={offline}
            className="flex shrink-0 items-center gap-1 rounded-full border border-dashed border-line px-3 py-1.5 text-sm text-muted hover:border-accent hover:text-accent disabled:opacity-50"
            aria-label="Создать категорию"
          >
            <Plus className="size-3.5" aria-hidden /> Своя
          </button>
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted" aria-live="polite">
            {query ? `Найдено: ${filtered.length}` : `${filtered.length} ${plural(filtered.length, 'запись', 'записи', 'записей')}`}
          </span>
          <Segmented<SortMode>
            label="Сортировка"
            value={sort}
            onChange={(v) => settings.set('sort', v)}
            options={[
              { value: 'alpha', label: 'А–Я' },
              { value: 'created', label: 'Новые' },
              { value: 'used', label: 'Недавние' },
            ]}
          />
        </div>
        {undecryptable > 0 && (
          <Banner tone="warn">Не удалось расшифровать записей: {undecryptable}. Они могли быть повреждены.</Banner>
        )}
      </div>

      <div className="relative flex min-h-0 flex-1">
        <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto px-2 pb-24 sm:px-4 md:pb-6">
          {entries.length === 0 ? (
            <div className="animate-fade flex flex-col items-center px-6 py-16 text-center">
              <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-accent-soft text-accent">
                <KeyRound className="size-8" aria-hidden />
              </div>
              <h2 className="text-lg font-semibold text-ink">Здесь пока пусто</h2>
              <p className="mt-1 max-w-xs text-sm text-muted">
                Добавьте первый пароль — он будет зашифрован прямо на этом устройстве.
              </p>
              <Button className="mt-5" onClick={openNew} disabled={offline} icon={<Plus className="size-4" />}>
                Добавить
              </Button>
            </div>
          ) : filtered.length === 0 ? (
            <p className="px-4 py-12 text-center text-sm text-muted">
              {query ? <>Ничего не найдено по запросу «{query}»</> : 'В этой категории пока нет записей'}
            </p>
          ) : (
            <>
              {favorites.length > 0 && (
                <section aria-label="Избранное" className="mb-2">
                  <h2 className="sticky top-0 z-10 flex items-center gap-1.5 bg-bg/95 px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-warn backdrop-blur">
                    <Star className="size-3.5 fill-current" aria-hidden /> Избранное
                  </h2>
                  <ul className="flex flex-col gap-0.5">
                    {favorites.map((e) => (
                      <EntryListItem key={e.id} entry={e} selected={e.id === selectedId} onSelect={() => setSelectedId(e.id)} />
                    ))}
                  </ul>
                </section>
              )}
              {groups.map((g) => (
                <section key={g.letter || 'all'} data-letter={g.letter} aria-label={g.letter ? `Буква ${g.letter}` : 'Все записи'} className="mb-1 scroll-mt-1">
                  {g.letter && (
                    <h2 className="sticky top-0 z-10 bg-bg/95 px-2 py-1 text-xs font-semibold text-accent backdrop-blur">{g.letter}</h2>
                  )}
                  <ul className="flex flex-col gap-0.5">
                    {g.items.map((e) => (
                      <EntryListItem key={e.id} entry={e} selected={e.id === selectedId} onSelect={() => setSelectedId(e.id)} />
                    ))}
                  </ul>
                </section>
              ))}
            </>
          )}
        </div>

        {sort === 'alpha' && groups.length > 3 && (
          <nav aria-label="Быстрый переход по букве" className="flex w-6 shrink-0 flex-col items-center justify-center gap-px py-2 pr-1">
            {groups.map((g) => (
              <button
                key={g.letter}
                type="button"
                onClick={() => jumpTo(g.letter)}
                className="w-6 rounded text-[11px] font-semibold leading-[1.15rem] text-accent hover:bg-accent-soft"
                aria-label={`Перейти к букве ${g.letter}`}
              >
                {g.letter}
              </button>
            ))}
          </nav>
        )}
      </div>

      {/* Плавающая кнопка на телефоне */}
      <button
        type="button"
        onClick={openNew}
        disabled={offline}
        className="fixed bottom-20 right-4 z-30 flex h-14 items-center gap-2 rounded-2xl bg-accent px-5 font-medium text-on-accent shadow-lg shadow-black/20 transition-transform active:scale-95 disabled:opacity-50 sm:hidden"
      >
        <Plus className="size-5" aria-hidden /> Добавить
      </button>
    </div>
  );

  return (
    <div className="flex min-h-0 min-w-0 flex-1">
      <div className={cx('flex min-h-0 min-w-0 flex-1 flex-col', wide && 'max-w-xl border-r border-line', showDetailOnly && 'hidden')}>
        {list}
      </div>
      {wide ? (
        <aside className="hidden min-w-0 flex-1 lg:block" aria-label="Детали записи">
          {selected ? (
            <EntryDetail
              entry={selected}
              showBack={false}
              onBack={() => setSelectedId(null)}
              onEdit={() => {
                setEditing(selected);
                setFormOpen(true);
              }}
              onDeleted={() => setSelectedId(null)}
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center p-8 text-center text-sm text-muted">
              <KeyRound className="mb-3 size-10 opacity-40" aria-hidden />
              Выберите запись слева, чтобы увидеть подробности
            </div>
          )}
        </aside>
      ) : (
        selected && (
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <EntryDetail
              entry={selected}
              showBack
              onBack={() => setSelectedId(null)}
              onEdit={() => {
                setEditing(selected);
                setFormOpen(true);
              }}
              onDeleted={() => setSelectedId(null)}
            />
          </div>
        )
      )}

      <EntryForm
        open={formOpen}
        editing={editing}
        defaultCategory={category !== 'all' ? category : undefined}
        onClose={() => setFormOpen(false)}
        onSaved={(e) => {
          if (editing || wide) setSelectedId(e.id);
        }}
      />
      <AddCategoryModal
        open={catOpen}
        onClose={() => setCatOpen(false)}
        onCreated={(id) => {
          setCategory(id);
          toast('Категория создана');
        }}
      />
    </div>
  );
}
