// Копирование с автоочисткой буфера через 30 секунд.
export const CLIPBOARD_CLEAR_MS = 30_000;

let timer: number | undefined;
let lastSecret: string | null = null;

async function clearIfOurs() {
  const secret = lastSecret;
  lastSecret = null;
  window.clearTimeout(timer);
  timer = undefined;
  if (secret === null) return;
  try {
    // если пользователь уже скопировал что-то другое — не трогаем
    const current = await navigator.clipboard.readText().catch(() => secret);
    if (current === secret) await navigator.clipboard.writeText('');
  } catch {
    /* вкладка не в фокусе — браузер может запретить запись */
  }
}

export async function copyText(text: string, opts: { secret?: boolean } = {}): Promise<void> {
  await navigator.clipboard.writeText(text);
  if (opts.secret) {
    lastSecret = text;
    window.clearTimeout(timer);
    timer = window.setTimeout(clearIfOurs, CLIPBOARD_CLEAR_MS);
  }
}

/** Вызывается при блокировке хранилища. */
export function clearClipboardNow(): Promise<void> {
  return clearIfOurs();
}

// Если вкладка была скрыта в момент очистки, пробуем ещё раз при возвращении.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && lastSecret !== null && timer === undefined) void clearIfOurs();
});
