import { supabase } from './supabaseClient.js';

const LOCAL_QA_PASSWORD = 'facs-local-qa-only-2026';

export const LOCAL_QA_ACCOUNTS = Object.freeze([
  { id: 'uploader', email: 'qa.uploader@local.facts.test', handle: 'qa_uploader', displayName: '민아', role: '업로더' },
  { id: 'evaluator', email: 'qa.evaluator@local.facts.test', handle: 'qa_evaluator', displayName: '지우', role: '평가자' },
  { id: 'safety', email: 'qa.safety@local.facts.test', handle: 'qa_safety', displayName: 'Alex', role: '안전 점검' },
]);

/** True only for an explicit local QA URL; Preview and production can never enable this. */
export function isLocalQaAccountMode(origin = typeof window === 'undefined' ? '' : window.location.origin, search = typeof window === 'undefined' ? '' : window.location.search, development = import.meta.env?.DEV) {
  try {
    const url = new URL(origin);
    return Boolean(development)
      && url.protocol === 'http:'
      && ['127.0.0.1', 'localhost'].includes(url.hostname)
      && new URLSearchParams(search).get('qaAccounts') === '1';
  } catch {
    return false;
  }
}

/** Creates three disposable local accounts on first use, then switches the real Supabase session. */
export async function signInWithLocalQaAccount(accountId) {
  if (!isLocalQaAccountMode() || !supabase) return { ok: false, code: 'LOCAL_QA_UNAVAILABLE' };
  const account = LOCAL_QA_ACCOUNTS.find((item) => item.id === accountId);
  if (!account) return { ok: false, code: 'LOCAL_QA_ACCOUNT_UNKNOWN' };

  const signIn = await supabase.auth.signInWithPassword({ email: account.email, password: LOCAL_QA_PASSWORD });
  if (!signIn.error) return { ok: true, account };

  const signUp = await supabase.auth.signUp({
    email: account.email,
    password: LOCAL_QA_PASSWORD,
    options: { data: { handle: account.handle, display_name: account.displayName } },
  });
  if (signUp.error) return { ok: false, code: 'LOCAL_QA_SIGN_IN_FAILED' };

  // Local config disables email confirmation. A retry also handles an account
  // created by a previous browser session without exposing a real credential.
  const retry = await supabase.auth.signInWithPassword({ email: account.email, password: LOCAL_QA_PASSWORD });
  return retry.error ? { ok: false, code: 'LOCAL_QA_SIGN_IN_FAILED' } : { ok: true, account };
}
