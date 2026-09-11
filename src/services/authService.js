import { AUTH_CONFIG_ERROR, AUTH_PROVIDER } from './authConfig.js';
import { setAuthPersistence, supabase, withAuthPersistenceRedirect } from './supabaseClient.js';

export const AUTH_ACTION_ERROR = Object.freeze({
  NOT_CONFIGURED: 'AUTH_NOT_CONFIGURED',
  INVALID_PROVIDER: 'AUTH_INVALID_PROVIDER',
  NOT_SIGNED_IN: 'AUTH_NOT_SIGNED_IN',
  REQUEST_FAILED: 'AUTH_REQUEST_FAILED',
  LINK_FAILED: 'AUTH_LINK_FAILED',
  EMAIL_RATE_LIMITED: 'AUTH_EMAIL_RATE_LIMITED',
  EMAIL_CODE_INVALID: 'AUTH_EMAIL_CODE_INVALID',
  EMAIL_REDIRECT_REJECTED: 'AUTH_EMAIL_REDIRECT_REJECTED',
  SIGN_OUT_FAILED: 'AUTH_SIGN_OUT_FAILED',
});

function unavailable(config) {
  return { ok: false, code: config?.code === AUTH_CONFIG_ERROR.INVALID_REDIRECT_URL ? AUTH_CONFIG_ERROR.INVALID_REDIRECT_URL : AUTH_ACTION_ERROR.NOT_CONFIGURED };
}

function supportedProvider(provider) {
  return AUTH_PROVIDER.includes(provider);
}

/** Accepts only a complete HTTPS provider handoff URL before navigation occurs. */
export function getOAuthRedirectUrl(data) {
  try {
    const url = new URL(data?.url);
    return url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

/** Sends a one-time email code. The member enters it in the tab where sign-in began. */
export async function requestEmailMagicLink(email, config, remember = true) {
  if (!config?.ok || !supabase) return unavailable(config);
  setAuthPersistence(remember);
  const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: withAuthPersistenceRedirect(config.redirectTo, remember) } });
  if (!error) return { ok: true };

  // Provider details are intentionally not shown to visitors, but common
  // recoverable cases need a useful next step instead of a generic failure.
  if (error.status === 429 || error.code === 'over_email_send_rate_limit') {
    return { ok: false, code: AUTH_ACTION_ERROR.EMAIL_RATE_LIMITED };
  }
  if (error.code === 'validation_failed' || /redirect/i.test(error.message ?? '')) {
    return { ok: false, code: AUTH_ACTION_ERROR.EMAIL_REDIRECT_REJECTED };
  }
  return { ok: false, code: AUTH_ACTION_ERROR.REQUEST_FAILED };
}

/**
 * Verifies a six-digit code against the current email OTP flow. Older GoTrue
 * projects can still label passwordless email codes as `magiclink`; retrying
 * that legacy label keeps the migration transparent without accepting a bad code.
 */
export async function verifyEmailOtp(client, email, token) {
  const credentials = { email, token: token.trim() };
  const first = await client.auth.verifyOtp({ ...credentials, type: 'email' });
  if (!first.error) return { ok: true };
  if (first.error.status === 429) return { ok: false, code: AUTH_ACTION_ERROR.EMAIL_RATE_LIMITED };

  const legacy = await client.auth.verifyOtp({ ...credentials, type: 'magiclink' });
  if (!legacy.error) return { ok: true };
  if (legacy.error.status === 429) return { ok: false, code: AUTH_ACTION_ERROR.EMAIL_RATE_LIMITED };
  return { ok: false, code: AUTH_ACTION_ERROR.EMAIL_CODE_INVALID };
}

/** Verifies a short-lived email code without navigating away from the sign-in tab. */
export async function verifyEmailCode(email, token, config, remember = true) {
  if (!config?.ok || !supabase) return unavailable(config);
  setAuthPersistence(remember);
  return verifyEmailOtp(supabase, email, token);
}

/** Starts an OAuth sign-in. Provider credentials live only in the Supabase project. */
export async function beginOAuthSignIn(provider, config, remember = true) {
  if (!supportedProvider(provider)) return { ok: false, code: AUTH_ACTION_ERROR.INVALID_PROVIDER };
  if (!config?.ok || !supabase) return unavailable(config);
  setAuthPersistence(remember);
  try {
    // Keep the browser on FACS until Supabase has returned a valid provider URL.
    // This prevents a malformed or unavailable provider response from exposing a
    // raw Supabase error page to the visitor.
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: withAuthPersistenceRedirect(config.redirectTo, remember), skipBrowserRedirect: true },
    });
    const url = getOAuthRedirectUrl(data);
    if (error || !url) return { ok: false, code: AUTH_ACTION_ERROR.REQUEST_FAILED };
    return { ok: true, url };
  } catch {
    return { ok: false, code: AUTH_ACTION_ERROR.REQUEST_FAILED };
  }
}

/** Ends only the active browser session; persistent account data remains intact. */
export async function signOutCurrentSession() {
  if (!supabase) return { ok: false, code: AUTH_ACTION_ERROR.NOT_CONFIGURED };
  try {
    const { error } = await supabase.auth.signOut();
    return error ? { ok: false, code: AUTH_ACTION_ERROR.SIGN_OUT_FAILED } : { ok: true };
  } catch {
    return { ok: false, code: AUTH_ACTION_ERROR.SIGN_OUT_FAILED };
  }
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
