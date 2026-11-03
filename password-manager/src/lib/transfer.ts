// Импорт (CSV из Chrome, Bitwarden, LastPass; зашифрованный JSON) и экспорт.
import { decryptJson, deriveKey, encryptJson, KDF_ITERATIONS, newSalt } from './crypto';
import { parseCsv, toCsv } from './csv';
import { hostOf } from './format';
import { categoryName } from './categories';
import type { Category, Entry, EntryDraft } from './types';
import { AppError } from './errors';

export type ImportDraft = EntryDraft & { createdAt?: string };
export type CsvFormat = 'chrome' | 'bitwarden' | 'lastpass' | 'generic';

export const FORMAT_NAMES: Record<CsvFormat, string> = {
  chrome: 'Chrome / Edge / Яндекс',
  bitwarden: 'Bitwarden',
  lastpass: 'LastPass',
  generic: 'CSV',
};

function guessCategory(service: string, url: string, folder = ''): string {
  const t = `${service} ${url} ${folder}`.toLowerCase();
  if (/mail|почт|gmail|outlook|yandex\.ru\/mail|proton/.test(t)) return 'mail';
  if (/instagram|facebook|vk\.com|вконтакте|twitter|x\.com|tiktok|telegram|ok\.ru|linkedin|reddit|social|соц/.test(t)) return 'social';
  if (/bank|банк|kaspi|halyk|sber|tinkoff|paypal|visa|mastercard|jusan|forte/.test(t)) return 'banks';
  if (/shop|магазин|ozon|wildberries|amazon|aliexpress|market|ebay|kaspi\.kz\/shop/.test(t)) return 'shops';
  if (/edu|univer|учёб|учеб|school|coursera|stepik|moodle|course/.test(t)) return 'study';
  if (/work|работ|jira|slack|confluence|github|gitlab|corp/.test(t)) return 'work';
  return 'other';
}

export function parseImportCsv(text: string): { format: CsvFormat; drafts: ImportDraft[]; skipped: number } {
  const rows = parseCsv(text);
  if (rows.length < 2) throw new AppError('Файл пустой или не похож на CSV.');
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const idx = (...names: string[]) => names.map((n) => header.indexOf(n)).find((i) => i >= 0) ?? -1;

  let format: CsvFormat = 'generic';
  if (header.includes('login_password') || header.includes('login_username')) format = 'bitwarden';
  else if (header.includes('grouping') || header.includes('extra')) format = 'lastpass';
  else if (header.includes('name') && header.includes('url') && header.includes('username')) format = 'chrome';

  const iName = idx('name', 'title', 'service');
  const iUrl = idx('login_uri', 'url', 'website', 'uri');
  const iUser = idx('login_username', 'username', 'login', 'email');
  const iPass = idx('login_password', 'password');
  const iNote = idx('notes', 'note', 'extra');
  const iFolder = idx('folder', 'grouping');
  const iFav = idx('favorite', 'fav');
  const iType = idx('type');
  if (iPass < 0) throw new AppError('В файле нет колонки с паролями (password).');

  const drafts: ImportDraft[] = [];
  let skipped = 0;
  for (const r of rows.slice(1)) {
    const get = (i: number) => (i >= 0 ? (r[i] ?? '').trim() : '');
    if (format === 'bitwarden' && iType >= 0 && get(iType) && get(iType) !== 'login') {
      skipped++;
      continue;
    }
    const password = i_or(r, iPass);
    const url = get(iUrl) === 'http://sn' ? '' : get(iUrl); // LastPass: защищённые заметки
    const login = get(iUser);
    const service = get(iName) || hostOf(url) || login;
    if (!password || !service) {
      skipped++;
      continue;
    }
    const folder = get(iFolder);
    drafts.push({
      service: service.slice(0, 200),
      login: login || '—',
      password,
      url,
      note: get(iNote),
      favorite: ['1', 'true', 'yes'].includes(get(iFav).toLowerCase()),
      category: guessCategory(service, url, folder),
    });
  }
  return { format, drafts, skipped };
}

function i_or(r: string[], i: number) {
  return i >= 0 ? (r[i] ?? '') : '';
}

export function exportCsv(entries: Entry[], custom: Category[]): string {
  return toCsv([
    ['name', 'url', 'username', 'password', 'note', 'category', 'favorite'],
    ...entries.map((e) => [
      e.service,
      e.url,
      e.login,
      e.password,
      e.note,
      categoryName(e.category, custom),
      e.favorite ? '1' : '',
    ]),
  ]);
}

interface EncryptedExport {
  format: 'pm-encrypted-export';
  version: 1;
  kdf: { name: 'PBKDF2'; hash: 'SHA-256'; iterations: number; salt: string };
  cipher: 'AES-256-GCM';
  data: string;
}

interface ExportPayload {
  exportedAt: string;
  categories: Category[];
  entries: Omit<Entry, 'id'>[];
}

export async function exportEncrypted(entries: Entry[], categories: Category[], password: string): Promise<string> {
  const salt = newSalt();
  const key = await deriveKey(password, salt, KDF_ITERATIONS);
  const payload: ExportPayload = {
    exportedAt: new Date().toISOString(),
    categories,
    entries: entries.map(({ id: _id, ...rest }) => rest),
  };
  const file: EncryptedExport = {
    format: 'pm-encrypted-export',
    version: 1,
    kdf: { name: 'PBKDF2', hash: 'SHA-256', iterations: KDF_ITERATIONS, salt },
    cipher: 'AES-256-GCM',
    data: await encryptJson(key, payload, 'pm-export'),
  };
  return JSON.stringify(file, null, 2);
}

export function isEncryptedExport(text: string): boolean {
  try {
    return JSON.parse(text)?.format === 'pm-encrypted-export';
  } catch {
    return false;
  }
}

export async function importEncrypted(
  text: string,
  password: string,
): Promise<{ drafts: ImportDraft[]; categories: Category[] }> {
  const file = JSON.parse(text) as EncryptedExport;
  if (file.format !== 'pm-encrypted-export' || file.version !== 1) throw new AppError('Неизвестный формат файла.');
  const key = await deriveKey(password, file.kdf.salt, Math.max(file.kdf.iterations, KDF_ITERATIONS));
  let payload: ExportPayload;
  try {
    payload = await decryptJson<ExportPayload>(key, file.data, 'pm-export');
  } catch {
    throw new AppError('Неверный пароль файла или файл повреждён.');
  }
  return {
    categories: payload.categories ?? [],
    drafts: payload.entries.map((e) => ({
      service: e.service,
      login: e.login,
      password: e.password,
      url: e.url ?? '',
      category: e.category ?? 'other',
      note: e.note ?? '',
      favorite: Boolean(e.favorite),
      createdAt: e.createdAt,
    })),
  };
}

export function downloadFile(name: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
