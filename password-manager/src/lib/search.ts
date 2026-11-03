import type { Entry } from './types';

export const collator = new Intl.Collator('ru', { sensitivity: 'base', numeric: true });

export const norm = (s: string) => s.toLocaleLowerCase('ru').replace(/ё/g, 'е').trim();

export function matches(e: Entry, q: string): boolean {
  if (!q) return true;
  const n = norm(q);
  return norm(e.service).includes(n) || norm(e.login).includes(n) || norm(e.url).includes(n);
}

export type SortMode = 'alpha' | 'created' | 'used';

export function sortEntries(list: Entry[], mode: SortMode): Entry[] {
  const arr = [...list];
  if (mode === 'alpha') arr.sort((a, b) => collator.compare(a.service, b.service) || collator.compare(a.login, b.login));
  else if (mode === 'created') arr.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  else
    arr.sort(
      (a, b) =>
        (b.lastUsedAt ?? '').localeCompare(a.lastUsedAt ?? '') || collator.compare(a.service, b.service),
    );
  return arr;
}

/** Буква-разделитель: первая буква названия, всё остальное — «#». */
export function letterOf(service: string): string {
  const ch = service.trim().charAt(0).toLocaleUpperCase('ru');
  if (ch === 'Ё') return 'Е';
  return /[A-ZА-Я]/.test(ch) ? ch : '#';
}

export function isDuplicate(a: { service: string; login: string }, b: { service: string; login: string }) {
  return norm(a.service) === norm(b.service) && norm(a.login) === norm(b.login);
}
