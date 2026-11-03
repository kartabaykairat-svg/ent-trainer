export interface PasswordVersion {
  password: string;
  changedAt: string; // ISO — когда этот пароль был заменён
}

/** Расшифрованная запись. На сервере хранится только как шифртекст. */
export interface Entry {
  id: string;
  service: string;
  login: string;
  password: string;
  url: string;
  category: string;
  note: string;
  favorite: boolean;
  createdAt: string;
  updatedAt: string;
  passwordChangedAt: string;
  lastUsedAt: string | null;
  history: PasswordVersion[];
}

export type EntryDraft = Pick<Entry, 'service' | 'login' | 'password' | 'url' | 'category' | 'note' | 'favorite'>;

export interface Category {
  id: string;
  name: string;
}

/** Зашифрованные метаданные хранилища (свои категории). */
export interface VaultMeta {
  customCategories: Category[];
}

/** Строка таблицы pm_vaults. */
export interface VaultRow {
  user_id: string;
  kdf_salt: string;
  kdf_iterations: number;
  verifier: string;
  meta: string | null;
}

/** Строка таблицы pm_entries. */
export interface EntryRow {
  id: string;
  data: string;
  updated_at?: string;
}

export interface LoginEvent {
  id: number;
  created_at: string;
  device: string;
  ip: string | null;
}
