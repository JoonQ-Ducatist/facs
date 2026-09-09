import { createClient } from '@supabase/supabase-js';
import { getPublicAuthConfig } from './authConfig.js';

// Node contract tests do not provide Vite's import.meta.env object.
const environment = import.meta.env ?? {};
const authConfig = getPublicAuthConfig(environment);
const url = authConfig.ok ? authConfig.supabaseUrl : null;
const publishableKey = authConfig.ok ? authConfig.publishableKey : null;
const AUTH_PERSISTENCE_KEY = 'facs_auth_persistence';
const AUTH_REMEMBER_PARAM = 'facs_remember';

function browserStorage(name) {
  if (typeof window === 'undefined') return null;
  try {
    return window[name];
  } catch {
    return null;
  }
}

function useSessionStorage() {
  const sessionStorage = browserStorage('sessionStorage');
  if (!sessionStorage) return false;
  if (sessionStorage.getItem(AUTH_PERSISTENCE_KEY) === 'session') return true;

  const params = new URLSearchParams(window.location.search);
  if (params.get(AUTH_REMEMBER_PARAM) === '0') {
    sessionStorage.setItem(AUTH_PERSISTENCE_KEY, 'session');
    return true;
  }
  return false;
}

const authStorage = {
  getItem(key) {
    const storage = useSessionStorage() ? browserStorage('sessionStorage') : browserStorage('localStorage');
    return storage?.getItem(key) ?? null;
  },
  setItem(key, value) {
    const storage = useSessionStorage() ? browserStorage('sessionStorage') : browserStorage('localStorage');
    storage?.setItem(key, value);
  },
  removeItem(key) {
    browserStorage('localStorage')?.removeItem(key);
    browserStorage('sessionStorage')?.removeItem(key);
  },
};

/** Chooses whether a new authentication session survives closing the browser. */
export function setAuthPersistence(remember) {
  const localStorage = browserStorage('localStorage');
  const sessionStorage = browserStorage('sessionStorage');
  if (remember) {
    sessionStorage?.removeItem(AUTH_PERSISTENCE_KEY);
    localStorage?.setItem(AUTH_PERSISTENCE_KEY, 'local');
    return;
  }
  localStorage?.removeItem(AUTH_PERSISTENCE_KEY);
  sessionStorage?.setItem(AUTH_PERSISTENCE_KEY, 'session');
}

/** Adds the selected persistence mode to an auth callback URL when needed. */
export function withAuthPersistenceRedirect(redirectTo, remember) {
  if (remember) return redirectTo;
  try {
    const url = new URL(redirectTo);
    url.searchParams.set(AUTH_REMEMBER_PARAM, '0');
    return url.toString();
  } catch {
    return redirectTo;
  }
}

/**
 * The browser receives only Supabase's publishable key. All data access must
 * remain protected by RLS; service-role credentials must never be imported here.
 */
export const supabase = url && publishableKey
  ? createClient(url, publishableKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storage: authStorage } })
  : null;

export function getSupabaseConnectionState() {
  return supabase ? 'configured' : authConfig.code ?? 'missing_public_config';
}
