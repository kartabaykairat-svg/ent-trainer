import type { EntryRow, LoginEvent, VaultRow } from '../types';

export interface AuthUser {
  id: string;
  email: string | null;
}

export interface MfaFactor {
  id: string;
  name: string;
  status: 'verified' | 'unverified';
  createdAt: string;
}

export interface MfaEnrollment {
  factorId: string;
  qr: string; // data: URL с SVG
  secret: string;
}

export interface Backend {
  mode: 'supabase' | 'local';
  getUser(): Promise<AuthUser | null>;
  onAuthChange(cb: () => void): () => void;
  signUp(email: string, password: string): Promise<{ needsConfirmation: boolean }>;
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  resetPassword(email: string): Promise<void>;

  mfaNeedsChallenge(): Promise<boolean>;
  mfaFactors(): Promise<MfaFactor[]>;
  mfaEnroll(): Promise<MfaEnrollment>;
  mfaVerify(factorId: string, code: string): Promise<void>;
  mfaUnenroll(factorId: string): Promise<void>;

  getVault(userId: string): Promise<VaultRow | null>;
  createVault(row: VaultRow): Promise<void>;
  updateMeta(userId: string, meta: string): Promise<void>;
  listEntries(userId: string): Promise<EntryRow[]>;
  upsertEntries(userId: string, rows: EntryRow[]): Promise<void>;
  deleteEntries(userId: string, ids: string[]): Promise<void>;
  rotate(vault: VaultRow, rows: EntryRow[]): Promise<void>;
  deleteAccount(): Promise<void>;

  logLogin(device: string): Promise<void>;
  listLogins(): Promise<LoginEvent[]>;
}
