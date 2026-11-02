// Проверка утечек через HaveIBeenPwned (k-anonymity):
// на сервер уходят только первые 5 символов SHA-1 хеша пароля.
import { sha1Hex } from './crypto';

const prefixCache = new Map<string, Map<string, number>>();

async function fetchRange(prefix: string): Promise<Map<string, number>> {
  const cached = prefixCache.get(prefix);
  if (cached) return cached;
  const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
    headers: { 'Add-Padding': 'true' },
    referrerPolicy: 'no-referrer',
    credentials: 'omit',
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`HIBP ${res.status}`);
  const map = new Map<string, number>();
  for (const line of (await res.text()).split('\n')) {
    const [suffix, count] = line.trim().split(':');
    const n = Number(count);
    if (suffix && n > 0) map.set(suffix, n);
  }
  prefixCache.set(prefix, map);
  return map;
}

/** Сколько раз пароль встречался в утечках (0 — не найден). */
export async function pwnedCount(password: string): Promise<number> {
  const hash = await sha1Hex(password);
  const map = await fetchRange(hash.slice(0, 5));
  return map.get(hash.slice(5)) ?? 0;
}
