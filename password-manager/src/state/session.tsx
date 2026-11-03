import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { backend, type AuthUser } from '../lib/backend';
import {
  KDF_ITERATIONS,
  checkVerifier,
  decryptJson,
  deriveKey,
  encryptJson,
  makeVerifier,
  newSalt,
} from '../lib/crypto';
import { clearSnapshot, loadSnapshot, saveSnapshot } from '../lib/cache';
import { clearClipboardNow } from '../lib/clipboard';
import { AppError, isNetworkError } from '../lib/errors';
import { deviceLabel } from '../lib/format';
import type { Category, Entry, EntryDraft, EntryRow, VaultMeta, VaultRow } from '../lib/types';
import { useSettings } from './settings';

export type Phase = 'loading' | 'auth' | 'mfa' | 'setup' | 'locked' | 'unlocked' | 'error';

type StoredEntry = Omit<Entry, 'id'>;

interface SessionCtx {
  phase: Phase;
  user: AuthUser | null;
  offline: boolean;
  error: string | null;
  entries: Entry[];
  meta: VaultMeta;
  undecryptable: number;
  evaluate(): Promise<void>;
  onLoggedIn(): Promise<void>;
  createVault(password: string): Promise<void>;
  unlock(password: string): Promise<boolean>;
  verifyMaster(password: string): Promise<boolean>;
  lock(): void;
  signOut(): Promise<void>;
  saveEntry(draft: EntryDraft, id?: string): Promise<Entry>;
  deleteEntry(id: string): Promise<void>;
  markUsed(id: string): void;
  toggleFavorite(id: string): Promise<void>;
  setCustomCategories(list: Category[]): Promise<void>;
  importDrafts(drafts: (EntryDraft & { createdAt?: string })[]): Promise<number>;
  changeMaster(oldPassword: string, newPassword: string): Promise<void>;
  deleteAccount(): Promise<void>;
}

const EMPTY_META: VaultMeta = { customCategories: [] };
const SessionContext = createContext<SessionCtx | null>(null);

const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'wheel', 'touchstart', 'mousemove', 'scroll'] as const;

export function SessionProvider({ children }: { children: ReactNode }) {
  const { autoLockMin } = useSettings();
  const [phase, setPhase] = useState<Phase>('loading');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [meta, setMeta] = useState<VaultMeta>(EMPTY_META);
  const [undecryptable, setUndecryptable] = useState(0);

  // Ключ и строки шифртекста — только в памяти, вне React-состояния.
  const keyRef = useRef<CryptoKey | null>(null);
  const vaultRef = useRef<VaultRow | null>(null);
  const rowsRef = useRef<Map<string, string>>(new Map());
  const userRef = useRef<AuthUser | null>(null);
  const phaseRef = useRef<Phase>('loading');
  const entriesRef = useRef<Entry[]>([]);
  phaseRef.current = phase;
  entriesRef.current = entries;

  const wipeMemory = useCallback(() => {
    keyRef.current = null;
    setEntries([]);
    setMeta(EMPTY_META);
    setUndecryptable(0);
  }, []);

  const lock = useCallback(() => {
    if (!keyRef.current && phaseRef.current !== 'unlocked') return;
    wipeMemory();
    void clearClipboardNow();
    setPhase('locked');
  }, [wipeMemory]);

  const evaluate = useCallback(async () => {
    setError(null);
    try {
      const u = await backend.getUser();
      // Повторное событие входа того же пользователя не должно блокировать хранилище.
      if (u && userRef.current?.id === u.id && (phaseRef.current === 'unlocked' || phaseRef.current === 'locked')) return;
      wipeMemory();
      userRef.current = u;
      setUser(u);
      if (!u) {
        vaultRef.current = null;
        setPhase('auth');
        return;
      }
      setPhase('loading');
      let needsMfa = false;
      try {
        needsMfa = await backend.mfaNeedsChallenge();
      } catch (e) {
        if (!isNetworkError(e)) throw e;
      }
      if (needsMfa) {
        setPhase('mfa');
        return;
      }
      let vault: VaultRow | null;
      try {
        vault = await backend.getVault(u.id);
        setOffline(false);
      } catch (e) {
        if (!isNetworkError(e)) throw e;
        const snap = await loadSnapshot(u.id);
        if (!snap) throw new AppError('Нет сети, а на этом устройстве ещё нет офлайн-копии хранилища.');
        vault = snap.vault;
        setOffline(true);
      }
      vaultRef.current = vault;
      setPhase(vault ? 'locked' : 'setup');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPhase('error');
      throw e;
    }
  }, [wipeMemory]);

  useEffect(() => {
    void evaluate().catch(() => {});
    return backend.onAuthChange(() => {
      void evaluate().catch(() => {});
    });
  }, [evaluate]);

  const onLoggedIn = useCallback(async () => {
    try {
      await backend.logLogin(deviceLabel());
    } catch {
      /* журнал не критичен */
    }
    userRef.current = null; // принудительно перечитать состояние
    await evaluate();
  }, [evaluate]);

  // ---------- шифрование записей ----------
  const uid = () => {
    const u = userRef.current;
    if (!u) throw new AppError('Сессия истекла. Войдите заново.');
    return u.id;
  };
  const requireKey = () => {
    const k = keyRef.current;
    if (!k) throw new AppError('Хранилище заблокировано.');
    return k;
  };
  const requireOnline = () => {
    if (offline) throw new AppError('Нет сети: в офлайн-режиме записи можно только просматривать.');
  };

  const encryptEntry = useCallback((key: CryptoKey, userId: string, e: Entry): Promise<string> => {
    const { id, ...rest } = e;
    return encryptJson(key, rest satisfies StoredEntry, `${userId}:${id}`);
  }, []);

  const decryptRows = useCallback(async (key: CryptoKey, userId: string, rows: EntryRow[]) => {
    let bad = 0;
    const list = await Promise.all(
      rows.map(async (r) => {
        try {
          const s = await decryptJson<StoredEntry>(key, r.data, `${userId}:${r.id}`);
          return { ...s, id: r.id, history: s.history ?? [], lastUsedAt: s.lastUsedAt ?? null } as Entry;
        } catch {
          bad++;
          return null;
        }
      }),
    );
    return { list: list.filter((x): x is Entry => x !== null), bad };
  }, []);

  const snapshot = useCallback(async () => {
    const u = userRef.current;
    const v = vaultRef.current;
    if (!u || !v || backend.mode === 'local') return;
    await saveSnapshot(
      u.id,
      v,
      [...rowsRef.current].map(([id, data]) => ({ id, data })),
    );
  }, []);

  const writeEntries = useCallback(
    async (list: Entry[]) => {
      const key = requireKey();
      const userId = uid();
      const rows = await Promise.all(list.map(async (e) => ({ id: e.id, data: await encryptEntry(key, userId, e) })));
      await backend.upsertEntries(userId, rows);
      for (const r of rows) rowsRef.current.set(r.id, r.data);
      void snapshot();
    },
    [encryptEntry, snapshot],
  );

  // ---------- хранилище ----------
  const createVault = useCallback(async (password: string) => {
    const userId = uid();
    const salt = newSalt();
    const key = await deriveKey(password, salt, KDF_ITERATIONS);
    const row: VaultRow = {
      user_id: userId,
      kdf_salt: salt,
      kdf_iterations: KDF_ITERATIONS,
      verifier: await makeVerifier(key, userId),
      meta: await encryptJson(key, EMPTY_META, `${userId}:meta`),
    };
    await backend.createVault(row);
    vaultRef.current = row;
    rowsRef.current = new Map();
    keyRef.current = key;
    setEntries([]);
    setMeta(EMPTY_META);
    void snapshot();
    setPhase('unlocked');
  }, [snapshot]);

  const verifyMaster = useCallback(async (password: string) => {
    const v = vaultRef.current;
    if (!v) return false;
    const key = await deriveKey(password, v.kdf_salt, v.kdf_iterations);
    return checkVerifier(key, v.verifier, uid());
  }, []);

  const unlock = useCallback(
    async (password: string) => {
      const userId = uid();
      let v = vaultRef.current;
      if (!offline) {
        // свежие параметры (мастер-пароль могли сменить на другом устройстве)
        try {
          v = (await backend.getVault(userId)) ?? v;
          vaultRef.current = v;
        } catch (e) {
          if (!isNetworkError(e)) throw e;
        }
      }
      if (!v) throw new AppError('Хранилище не найдено.');
      const key = await deriveKey(password, v.kdf_salt, v.kdf_iterations);
      if (!(await checkVerifier(key, v.verifier, userId))) return false;

      let rows: EntryRow[];
      let isOffline = offline;
      try {
        if (isOffline) throw new TypeError('Failed to fetch');
        rows = await backend.listEntries(userId);
      } catch (e) {
        if (!isNetworkError(e)) throw e;
        const snap = await loadSnapshot(userId);
        rows = snap?.entries ?? [];
        isOffline = true;
      }
      const { list, bad } = await decryptRows(key, userId, rows);
      let m = EMPTY_META;
      if (v.meta) {
        try {
          m = { ...EMPTY_META, ...(await decryptJson<VaultMeta>(key, v.meta, `${userId}:meta`)) };
        } catch {
          /* мета повреждена — используем пустую */
        }
      }
      rowsRef.current = new Map(rows.map((r) => [r.id, r.data]));
      keyRef.current = key;
      setOffline(isOffline);
      setEntries(list);
      setMeta(m);
      setUndecryptable(bad);
      if (!isOffline) void snapshot();
      setPhase('unlocked');
      return true;
    },
    [offline, decryptRows, snapshot],
  );

  const signOut = useCallback(async () => {
    wipeMemory();
    void clearClipboardNow();
    const u = userRef.current;
    if (u && backend.mode !== 'local') await clearSnapshot(u.id);
    await backend.signOut();
    userRef.current = null;
    vaultRef.current = null;
    setUser(null);
    setPhase(backend.mode === 'local' ? 'locked' : 'auth');
  }, [wipeMemory]);

  // ---------- записи ----------
  const saveEntry = useCallback(
    async (draft: EntryDraft, id?: string) => {
      requireOnline();
      const now = new Date().toISOString();
      const clean: EntryDraft = {
        service: draft.service.trim(),
        login: draft.login.trim(),
        password: draft.password,
        url: draft.url.trim(),
        category: draft.category || 'other',
        note: draft.note,
        favorite: draft.favorite,
      };
      let next: Entry;
      const prev = id ? entriesRef.current.find((e) => e.id === id) : undefined;
      if (prev) {
        const pwChanged = prev.password !== clean.password;
        next = {
          ...prev,
          ...clean,
          updatedAt: now,
          passwordChangedAt: pwChanged ? now : prev.passwordChangedAt,
          history: pwChanged
            ? [{ password: prev.password, changedAt: now }, ...prev.history].slice(0, 5)
            : prev.history,
        };
      } else {
        next = {
          ...clean,
          id: crypto.randomUUID(),
          createdAt: now,
          updatedAt: now,
          passwordChangedAt: now,
          lastUsedAt: null,
          history: [],
        };
      }
      await writeEntries([next]);
      setEntries((list) => (prev ? list.map((e) => (e.id === next.id ? next : e)) : [...list, next]));
      return next;
    },
    [offline, writeEntries],
  );

  const deleteEntry = useCallback(
    async (id: string) => {
      requireOnline();
      await backend.deleteEntries(uid(), [id]);
      rowsRef.current.delete(id);
      void snapshot();
      setEntries((list) => list.filter((e) => e.id !== id));
    },
    [offline, snapshot],
  );

  const markUsed = useCallback(
    (id: string) => {
      const prev = entriesRef.current.find((e) => e.id === id);
      if (!prev) return;
      const next = { ...prev, lastUsedAt: new Date().toISOString() };
      setEntries((list) => list.map((e) => (e.id === id ? next : e)));
      // на сервер пишем не чаще раза в минуту на запись
      const recently = prev.lastUsedAt && Date.now() - new Date(prev.lastUsedAt).getTime() < 60_000;
      if (!offline && !recently) void writeEntries([next]).catch(() => {});
    },
    [offline, writeEntries],
  );

  const toggleFavorite = useCallback(
    async (id: string) => {
      requireOnline();
      const prev = entriesRef.current.find((e) => e.id === id);
      if (!prev) return;
      const next = { ...prev, favorite: !prev.favorite };
      await writeEntries([next]);
      setEntries((list) => list.map((e) => (e.id === id ? next : e)));
    },
    [offline, writeEntries],
  );

  const setCustomCategories = useCallback(
    async (list: Category[]) => {
      requireOnline();
      const key = requireKey();
      const userId = uid();
      const nextMeta: VaultMeta = { ...meta, customCategories: list };
      const ids = new Set(list.map((c) => c.id));
      // записи удалённых категорий переносим в «Другое»
      const builtin = new Set(['mail', 'social', 'work', 'banks', 'shops', 'study', 'other']);
      const orphans = entriesRef.current
        .filter((e) => !builtin.has(e.category) && !ids.has(e.category))
        .map((e) => ({ ...e, category: 'other' }));
      const enc = await encryptJson(key, nextMeta, `${userId}:meta`);
      await backend.updateMeta(userId, enc);
      if (vaultRef.current) vaultRef.current = { ...vaultRef.current, meta: enc };
      if (orphans.length) {
        await writeEntries(orphans);
        const map = new Map(orphans.map((o) => [o.id, o]));
        setEntries((l) => l.map((e) => map.get(e.id) ?? e));
      }
      setMeta(nextMeta);
      void snapshot();
    },
    [meta, offline, writeEntries, snapshot],
  );

  const importDrafts = useCallback(
    async (drafts: (EntryDraft & { createdAt?: string })[]) => {
      requireOnline();
      const now = new Date().toISOString();
      const list: Entry[] = drafts.map((d) => ({
        service: d.service.trim(),
        login: d.login.trim(),
        password: d.password,
        url: d.url.trim(),
        category: d.category || 'other',
        note: d.note ?? '',
        favorite: Boolean(d.favorite),
        id: crypto.randomUUID(),
        createdAt: d.createdAt ?? now,
        updatedAt: now,
        passwordChangedAt: d.createdAt ?? now,
        lastUsedAt: null,
        history: [],
      }));
      await writeEntries(list);
      setEntries((l) => [...l, ...list]);
      return list.length;
    },
    [offline, writeEntries],
  );

  const changeMaster = useCallback(
    async (oldPassword: string, newPassword: string) => {
      requireOnline();
      const userId = uid();
      const v = vaultRef.current;
      if (!v) throw new AppError('Хранилище не найдено.');
      if (!(await verifyMaster(oldPassword))) throw new AppError('Текущий мастер-пароль введён неверно.');
      // берём актуальные данные с сервера, чтобы ничего не потерять
      const oldKey = requireKey();
      const rows = await backend.listEntries(userId);
      const { list, bad } = await decryptRows(oldKey, userId, rows);
      if (bad) throw new AppError('Часть записей не расшифровывается — смена пароля отменена, чтобы не потерять данные.');
      const salt = newSalt();
      const newKey = await deriveKey(newPassword, salt, KDF_ITERATIONS);
      const readAt = new Map(rows.map((r) => [r.id, r.updated_at]));
      const newRows = await Promise.all(
        list.map(async (e) => ({ id: e.id, data: await encryptEntry(newKey, userId, e), updated_at: readAt.get(e.id) })),
      );
      const newVault: VaultRow = {
        user_id: userId,
        kdf_salt: salt,
        kdf_iterations: KDF_ITERATIONS,
        verifier: await makeVerifier(newKey, userId),
        meta: await encryptJson(newKey, meta, `${userId}:meta`),
      };
      await backend.rotate(newVault, newRows);
      vaultRef.current = newVault;
      rowsRef.current = new Map(newRows.map((r) => [r.id, r.data]));
      keyRef.current = newKey;
      setEntries(list);
      void snapshot();
    },
    [offline, meta, verifyMaster, decryptRows, encryptEntry, snapshot],
  );

  const deleteAccount = useCallback(async () => {
    requireOnline();
    const u = userRef.current;
    await backend.deleteAccount();
    if (u) await clearSnapshot(u.id);
    wipeMemory();
    vaultRef.current = null;
    rowsRef.current = new Map();
    if (backend.mode === 'local') {
      // в локальном режиме «пользователь» остаётся тем же — можно сразу создать новое хранилище
      userRef.current = { id: 'local', email: null };
      setUser(userRef.current);
      setPhase('setup');
    } else {
      userRef.current = null;
      setUser(null);
      setPhase('auth');
    }
  }, [offline, wipeMemory]);

  // ---------- автоблокировка ----------
  useEffect(() => {
    if (phase !== 'unlocked') return;
    let last = Date.now();
    let throttle = 0;
    const onActivity = () => {
      const now = Date.now();
      if (now - throttle > 1000) {
        throttle = now;
        last = now;
      }
    };
    const limit = autoLockMin * 60_000;
    const check = () => {
      if (Date.now() - last >= limit) lock();
    };
    const timer = window.setInterval(check, 5000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') check();
    };
    // закрытие вкладки / уход со страницы — блокируем сразу
    const onHide = () => lock();
    for (const ev of ACTIVITY_EVENTS) window.addEventListener(ev, onActivity, { passive: true });
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('pagehide', onHide);
    return () => {
      window.clearInterval(timer);
      for (const ev of ACTIVITY_EVENTS) window.removeEventListener(ev, onActivity);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('pagehide', onHide);
    };
  }, [phase, autoLockMin, lock]);

  // возврат сети: предлагаем перечитать данные при следующей разблокировке
  useEffect(() => {
    const on = () => {
      if (phaseRef.current === 'locked') setOffline(false);
    };
    window.addEventListener('online', on);
    return () => window.removeEventListener('online', on);
  }, []);

  const value = useMemo<SessionCtx>(
    () => ({
      phase,
      user,
      offline,
      error,
      entries,
      meta,
      undecryptable,
      evaluate,
      onLoggedIn,
      createVault,
      unlock,
      verifyMaster,
      lock,
      signOut,
      saveEntry,
      deleteEntry,
      markUsed,
      toggleFavorite,
      setCustomCategories,
      importDrafts,
      changeMaster,
      deleteAccount,
    }),
    [
      phase, user, offline, error, entries, meta, undecryptable, evaluate, onLoggedIn, createVault, unlock,
      verifyMaster, lock, signOut, saveEntry, deleteEntry, markUsed, toggleFavorite, setCustomCategories,
      importDrafts, changeMaster, deleteAccount,
    ],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionCtx {
  const c = useContext(SessionContext);
  if (!c) throw new Error('SessionProvider missing');
  return c;
}
