// Перевод ошибок в понятные сообщения на русском. Никогда не включает секреты.

export class AppError extends Error {}

export function isNetworkError(e: unknown): boolean {
  const msg = String((e as { message?: string })?.message ?? e);
  return (
    (typeof navigator !== 'undefined' && navigator.onLine === false) ||
    /Failed to fetch|NetworkError|Load failed|network|fetch failed/i.test(msg)
  );
}

export function humanError(e: unknown): string {
  if (e instanceof AppError) return e.message;
  const err = e as { message?: string; code?: string; status?: number };
  const msg = err?.message ?? String(e);
  if (isNetworkError(e)) return 'Нет соединения с интернетом. Проверьте сеть и повторите.';
  if (/Invalid login credentials/i.test(msg)) return 'Неверный email или пароль.';
  if (/Email not confirmed/i.test(msg)) return 'Email не подтверждён. Откройте письмо и перейдите по ссылке.';
  if (/already registered|already been registered|User already exists/i.test(msg))
    return 'Этот email уже зарегистрирован. Войдите или восстановите пароль.';
  if (/Password should be at least|weak.?password/i.test(msg))
    return 'Пароль от аккаунта слишком простой: минимум 8 символов, буквы и цифры.';
  if (/rate limit|too many requests/i.test(msg) || err?.status === 429)
    return 'Слишком много попыток. Подождите немного и повторите.';
  if (/Unable to validate email|invalid email|valid email/i.test(msg)) return 'Неверный формат email.';
  if (/Invalid TOTP|invalid.*code|otp.*(expired|invalid)/i.test(msg)) return 'Неверный или устаревший код.';
  if (/entries changed during rotation/i.test(msg))
    return 'Записи изменились на другом устройстве. Ничего не потеряно — повторите смену мастер-пароля.';
  if (err?.code === '42P01' || err?.code === 'PGRST205' || err?.code === 'PGRST202' || /does not exist|schema cache/i.test(msg))
    return 'База данных не настроена: выполните файл schema.sql в Supabase (см. README).';
  if (err?.code === '42501' || /row-level security|permission denied/i.test(msg))
    return 'Нет доступа. Войдите заново (возможно, нужен код 2FA).';
  if (/JWT expired|session.*(missing|expired)|Auth session missing/i.test(msg))
    return 'Сессия истекла. Войдите заново.';
  return 'Что-то пошло не так. Попробуйте ещё раз.';
}
