import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '../config';
import type { EntryRow, LoginEvent, VaultRow } from '../types';
import type { AuthUser, Backend, MfaFactor } from './types';

export function createSupabaseBackend(): Backend {
  const sb: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });

  const check = <T extends { error: unknown }>(r: T): T => {
    if (r.error) throw r.error;
    return r;
  };

  return {
    mode: 'supabase',

    async getUser(): Promise<AuthUser | null> {
      // getSession читает локальную сессию и работает офлайн.
      const { data } = await sb.auth.getSession();
      const u = data.session?.user;
      return u ? { id: u.id, email: u.email ?? null } : null;
    },

    onAuthChange(cb) {
      const { data } = sb.auth.onAuthStateChange((event) => {
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'MFA_CHALLENGE_VERIFIED' || event === 'USER_UPDATED') {
          // не вызываем Supabase внутри колбэка (рекомендация supabase-js)
          setTimeout(cb, 0);
        }
      });
      return () => data.subscription.unsubscribe();
    },

    async signUp(email, password) {
      const redirect = location.origin + location.pathname;
      const r = check(await sb.auth.signUp({ email, password, options: { emailRedirectTo: redirect } }));
      return { needsConfirmation: !r.data.session };
    },

    async signIn(email, password) {
      check(await sb.auth.signInWithPassword({ email, password }));
    },

    async signOut() {
      await sb.auth.signOut({ scope: 'local' });
    },

    async resetPassword(email) {
      check(await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname }));
    },

    async mfaNeedsChallenge() {
      const { data, error } = await sb.auth.mfa.getAuthenticatorAssuranceLevel();
      if (error) throw error;
      return data.nextLevel === 'aal2' && data.currentLevel !== 'aal2';
    },

    async mfaFactors(): Promise<MfaFactor[]> {
      const { data, error } = await sb.auth.mfa.listFactors();
      if (error) throw error;
      return data.all
        .filter((f) => f.factor_type === 'totp')
        .map((f) => ({
          id: f.id,
          name: f.friendly_name ?? 'Аутентификатор',
          status: f.status as MfaFactor['status'],
          createdAt: f.created_at,
        }));
    },

    async mfaEnroll() {
      // убираем незавершённые попытки подключения
      const factors = await this.mfaFactors();
      for (const f of factors.filter((x) => x.status === 'unverified')) {
        await sb.auth.mfa.unenroll({ factorId: f.id });
      }
      const { data, error } = await sb.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: `Аутентификатор ${new Date().toLocaleDateString('ru-RU')} ${Date.now() % 10000}`,
      });
      if (error) throw error;
      return { factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret };
    },

    async mfaVerify(factorId, code) {
      const { error } = await sb.auth.mfa.challengeAndVerify({ factorId, code });
      if (error) throw error;
    },

    async mfaUnenroll(factorId) {
      const { error } = await sb.auth.mfa.unenroll({ factorId });
      if (error) throw error;
    },

    async getVault(userId) {
      const r = check(
        await sb.from('pm_vaults').select('user_id,kdf_salt,kdf_iterations,verifier,meta').eq('user_id', userId).maybeSingle(),
      );
      return (r.data as VaultRow | null) ?? null;
    },

    async createVault(row) {
      check(await sb.from('pm_vaults').insert(row));
    },

    async updateMeta(userId, meta) {
      check(await sb.from('pm_vaults').update({ meta }).eq('user_id', userId));
    },

    async listEntries(userId) {
      const out: EntryRow[] = [];
      const page = 1000;
      for (let from = 0; ; from += page) {
        const r = check(
          await sb.from('pm_entries').select('id,data,updated_at').eq('user_id', userId).order('id').range(from, from + page - 1),
        );
        const rows = (r.data ?? []) as EntryRow[];
        out.push(...rows);
        if (rows.length < page) break;
      }
      return out;
    },

    async upsertEntries(userId, rows) {
      for (let i = 0; i < rows.length; i += 500) {
        const chunk = rows.slice(i, i + 500).map((r) => ({ id: r.id, data: r.data, user_id: userId }));
        check(await sb.from('pm_entries').upsert(chunk));
      }
    },

    async deleteEntries(userId, ids) {
      check(await sb.from('pm_entries').delete().eq('user_id', userId).in('id', ids));
    },

    async rotate(vault, rows) {
      check(
        await sb.rpc('pm_rotate_vault', {
          p_salt: vault.kdf_salt,
          p_iterations: vault.kdf_iterations,
          p_verifier: vault.verifier,
          p_meta: vault.meta,
          p_entries: rows.map((r) => ({ id: r.id, data: r.data, updated_at: r.updated_at })),
        }),
      );
    },

    async deleteAccount() {
      check(await sb.rpc('pm_delete_account'));
      await sb.auth.signOut({ scope: 'local' });
    },

    async logLogin(device) {
      await sb.rpc('pm_log_login', { p_device: device });
    },

    async listLogins() {
      const r = check(
        await sb.from('pm_login_events').select('id,created_at,device,ip').order('created_at', { ascending: false }).limit(50),
      );
      return (r.data ?? []) as LoginEvent[];
    },
  };
}
