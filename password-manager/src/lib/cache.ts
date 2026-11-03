// Офлайн-кэш: только зашифрованные строки с сервера (IndexedDB).
import { del, get, set } from 'idb-keyval';
import type { EntryRow, VaultRow } from './types';

interface Snapshot {
  vault: VaultRow;
  entries: EntryRow[];
  savedAt: string;
}

const key = (userId: string) => `pm-cache:${userId}`;

export async function saveSnapshot(userId: string, vault: VaultRow, entries: EntryRow[]) {
  try {
    await set(key(userId), { vault, entries, savedAt: new Date().toISOString() } satisfies Snapshot);
  } catch {
    /* IndexedDB недоступен (приватный режим) — работаем без кэша */
  }
}

export async function loadSnapshot(userId: string): Promise<Snapshot | null> {
  try {
    return ((await get(key(userId))) as Snapshot | undefined) ?? null;
  } catch {
    return null;
  }
}

export async function clearSnapshot(userId: string) {
  try {
    await del(key(userId));
  } catch {
    /* ignore */
  }
}
