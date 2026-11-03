declare global {
  interface Window {
    PM_CONFIG?: { supabaseUrl?: string; supabaseAnonKey?: string };
  }
}

const cfg = window.PM_CONFIG ?? {};
export const SUPABASE_URL = (cfg.supabaseUrl ?? '').trim();
export const SUPABASE_ANON_KEY = (cfg.supabaseAnonKey ?? '').trim();
export const HAS_SUPABASE = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
