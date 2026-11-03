import { HAS_SUPABASE } from '../config';
import { createLocalBackend } from './local';
import { createSupabaseBackend } from './supabase';
import type { Backend } from './types';

export const backend: Backend = HAS_SUPABASE ? createSupabaseBackend() : createLocalBackend();
export type { Backend, AuthUser, MfaFactor, MfaEnrollment } from './types';
