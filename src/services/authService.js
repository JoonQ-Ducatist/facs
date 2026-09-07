import { AUTH_CONFIG_ERROR, AUTH_PROVIDER } from './authConfig.js';
import { supabase } from './supabaseClient.js';

export const AUTH_ACTION_ERROR = Object.freeze({
  NOT_CONFIGURED: 'AUTH_NOT_CONFIGURED',
  INVALID_PROVIDER: 'AUTH_INVALID_PROVIDER',
  NOT_SIGNED_IN: 'AUTH_NOT_SIGNED_IN',
  REQUEST_FAILED: 'AUTH_REQUEST_FAILED',
  LINK_FAILED: 'AUTH_LINK_FAILED',
});

function unavailable(config) {
  return { ok: false, code: config?.code === AUTH_CONFIG_ERROR.INVALID_REDIRECT_URL ? AUTH_CONFIG_ERROR.INVALID_REDIRECT_URL : AUTH_ACTION_ERROR.NOT_CONFIGURED };
}

function supportedProvider(provider) {
  return AUTH_PROVIDER.includes(provider);
}

/** Starts a Magic Link with the environment-pinned callback URL. */
export async function requestEmailMagicLink(email, config) {
  if (!config?.ok || !supabase) return unavailable(config);
  const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: config.redirectTo } });
  return error ? { ok: false, code: AUTH_ACTION_ERROR.REQUEST_FAILED } : { ok: true };
}

/** Starts an OAuth sign-in. Provider credentials live only in the Supabase project. */
export async function beginOAuthSignIn(provider, config) {
  if (!supportedProvider(provider)) return { ok: false, code: AUTH_ACTION_ERROR.INVALID_PROVIDER };
  if (!config?.ok || !supabase) return unavailable(config);
  const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: config.redirectTo } });
  return error ? { ok: false, code: AUTH_ACTION_ERROR.REQUEST_FAILED } : { ok: true };
}

/**
 * Account linking is intentionally service-only until Account Settings gets its
 * own re-authentication and audit UI. It must never accept a caller-supplied id.
 */
export async function linkOAuthIdentity(provider, config) {
  if (!supportedProvider(provider)) return { ok: false, code: AUTH_ACTION_ERROR.INVALID_PROVIDER };
  if (!config?.ok || !supabase) return unavailable(config);
  const { data, error: userError } = await supabase.auth.getUser();
  if (userError || !data.user) return { ok: false, code: AUTH_ACTION_ERROR.NOT_SIGNED_IN };
  const { error } = await supabase.auth.linkIdentity({ provider, options: { redirectTo: config.redirectTo } });
  return error ? { ok: false, code: AUTH_ACTION_ERROR.LINK_FAILED } : { ok: true };
}

