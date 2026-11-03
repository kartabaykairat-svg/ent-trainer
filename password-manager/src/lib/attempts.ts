// Ограничение попыток ввода мастер-пароля: после 5 ошибок — пауза,
// которая удваивается с каждой следующей ошибкой (30 с, 1 мин, 2 мин…).
// Хранятся только счётчики, без каких-либо секретов.

const FREE_ATTEMPTS = 5;
const BASE_DELAY_MS = 30_000;
const MAX_DELAY_MS = 60 * 60_000;

interface State {
  fails: number;
  lockedUntil: number;
}

const keyFor = (userId: string) => `pm-attempts:${userId}`;

function load(userId: string): State {
  try {
    const s = JSON.parse(localStorage.getItem(keyFor(userId)) ?? '');
    if (typeof s.fails === 'number' && typeof s.lockedUntil === 'number') return s;
  } catch {
    /* пусто */
  }
  return { fails: 0, lockedUntil: 0 };
}

function save(userId: string, s: State) {
  localStorage.setItem(keyFor(userId), JSON.stringify(s));
}

export function lockRemainingMs(userId: string): number {
  return Math.max(0, load(userId).lockedUntil - Date.now());
}

export function failedAttempts(userId: string): number {
  return load(userId).fails;
}

export function registerFailure(userId: string): State {
  const s = load(userId);
  s.fails += 1;
  if (s.fails >= FREE_ATTEMPTS) {
    const extra = s.fails - FREE_ATTEMPTS;
    s.lockedUntil = Date.now() + Math.min(MAX_DELAY_MS, BASE_DELAY_MS * 2 ** extra);
  }
  save(userId, s);
  return s;
}

export function registerSuccess(userId: string) {
  localStorage.removeItem(keyFor(userId));
}

export const FREE_MASTER_ATTEMPTS = FREE_ATTEMPTS;
