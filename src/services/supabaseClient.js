import { createClient } from '@supabase/supabase-js';
import { getPublicAuthConfig } from './authConfig.js';

// Node contract tests do not provide Vite's import.meta.env object.
const environment = import.meta.env ?? {};
const authConfig = getPublicAuthConfig(environment);
const url = authConfig.ok ? authConfig.supabaseUrl : null;
const publishableKey = authConfig.ok ? authConfig.publishableKey : null;

/**
 * The browser receives only Supabase's publishable key. All data access must
 * remain protected by RLS; service-role credentials must never be imported here.
 */
export const supabase = url && publishableKey
  ? createClient(url, publishableKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })
  : null;

export function getSupabaseConnectionState() {
  return supabase ? 'configured' : authConfig.code ?? 'missing_public_config';
}
