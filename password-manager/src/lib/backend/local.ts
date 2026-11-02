// Локальный режим (если Supabase не настроен): зашифрованные данные
// хранятся в localStorage этого браузера. Мастер-пароль и ключ — нет.
import type { EntryRow, VaultRow } from '../types';
import type { Backend } from './types';
import { AppError } from '../errors';

const K_VAULT = 'pm-local-vault';
const K_ENTRIES = 'pm-local-entries';

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}
const unsupported = () => {
  throw new AppError('Недоступно в локальном режиме.');
};

export function createLocalBackend(): Backend {
  return {
    mode: 'local',
    async getUser() {
      return { id: 'local', email: null };
    },
    onAuthChange() {
      return () => {};
    },
    signUp: async () => unsupported(),
    signIn: async () => unsupported(),
    async signOut() {},
    resetPassword: async () => unsupported(),
    async mfaNeedsChallenge() {
      return false;
    },
    async mfaFactors() {
      return [];
    },
    mfaEnroll: async () => unsupported(),
    mfaVerify: async () => unsupported(),
    mfaUnenroll: async () => unsupported(),

    async getVault() {
      return read<VaultRow | null>(K_VAULT, null);
    },
    async createVault(row) {
      write(K_VAULT, row);
    },
    async updateMeta(_userId, meta) {
      const v = read<VaultRow | null>(K_VAULT, null);
      if (v) write(K_VAULT, { ...v, meta });
    },
    async listEntries() {
      return read<EntryRow[]>(K_ENTRIES, []);
    },
    async upsertEntries(_userId, rows) {
      const map = new Map(read<EntryRow[]>(K_ENTRIES, []).map((r) => [r.id, r]));
      const now = new Date().toISOString();
      for (const r of rows) map.set(r.id, { id: r.id, data: r.data, updated_at: now });
      write(K_ENTRIES, [...map.values()]);
    },
    async deleteEntries(_userId, ids) {
      const set = new Set(ids);
      write(
        K_ENTRIES,
        read<EntryRow[]>(K_ENTRIES, []).filter((r) => !set.has(r.id)),
      );
    },
    async rotate(vault, rows) {
      const current = read<EntryRow[]>(K_ENTRIES, []);
      if (current.length !== rows.length) throw new AppError('Список записей изменился. Повторите.');
      write(K_ENTRIES, rows);
      write(K_VAULT, vault);
    },
    async deleteAccount() {
      localStorage.removeItem(K_VAULT);
      localStorage.removeItem(K_ENTRIES);
    },
    async logLogin() {},
    async listLogins() {
      return [];
    },
  };
}
