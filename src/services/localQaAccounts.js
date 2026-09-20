import { supabase } from './supabaseClient.js';

const LOCAL_QA_PASSWORD = 'facs-local-qa-only-2026';
const LOCAL_QA_MEMBER_IDS_KEY = 'facs_local_qa_member_ids';

export const LOCAL_QA_ACCOUNTS = Object.freeze([
  { id: 'uploader', email: 'qa.uploader@local.facts.test', handle: 'qa_uploader', displayName: '민아', role: '업로더' },
  { id: 'evaluator', email: 'qa.evaluator@local.facts.test', handle: 'qa_evaluator', displayName: '지우', role: '평가자' },
  { id: 'safety', email: 'qa.safety@local.facts.test', handle: 'qa_safety', displayName: 'Alex', role: '안전 점검' },
]);

function readRememberedMemberIds() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(LOCAL_QA_MEMBER_IDS_KEY) ?? '{}');
    return saved && typeof saved === 'object' ? saved : {};
  } catch { return {}; }
}

function rememberMemberId(accountId, userId) {
  if (!accountId || !userId) return;
  try {
    window.localStorage.setItem(LOCAL_QA_MEMBER_IDS_KEY, JSON.stringify({ ...readRememberedMemberIds(), [accountId]: userId }));
  } catch { /* Private browsing may deny Storage; the account switch still works. */ }
}

/** True only for an explicit local QA URL; Preview and production can never enable this. */
export function isLocalQaAccountMode(origin = typeof window === 'undefined' ? '' : window.location.origin, search = typeof window === 'undefined' ? '' : window.location.search, development = import.meta.env?.DEV, supabaseUrl = import.meta.env?.VITE_SUPABASE_URL) {
  try {
    const url = new URL(origin);
    const databaseUrl = new URL(supabaseUrl);
    return Boolean(development)
      && url.protocol === 'http:'
      && ['127.0.0.1', 'localhost'].includes(url.hostname)
      && ['127.0.0.1', 'localhost'].includes(databaseUrl.hostname)
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
  if (!signIn.error) {
    rememberMemberId(account.id, signIn.data.user?.id);
    return { ok: true, account };
  }

  const signUp = await supabase.auth.signUp({
    email: account.email,
    password: LOCAL_QA_PASSWORD,
    options: { data: { handle: account.handle, display_name: account.displayName } },
  });
  if (signUp.error) return { ok: false, code: 'LOCAL_QA_SIGN_IN_FAILED' };

  // Local config disables email confirmation. A retry also handles an account
  // created by a previous browser session without exposing a real credential.
  const retry = await supabase.auth.signInWithPassword({ email: account.email, password: LOCAL_QA_PASSWORD });
  if (retry.error) return { ok: false, code: 'LOCAL_QA_SIGN_IN_FAILED' };
  rememberMemberId(account.id, retry.data.user?.id);
  return { ok: true, account };
}

/** Resets only the current local QA member's A/B follow and block state. */
export async function resetLocalQaAbRelationshipState() {
  if (!isLocalQaAccountMode() || !supabase) return { ok: false, code: 'LOCAL_QA_UNAVAILABLE' };
  const { data: identity, error: identityError } = await supabase.auth.getUser();
  if (identityError || !identity.user) return { ok: false, code: 'LOCAL_QA_AUTH_REQUIRED' };

  const remembered = readRememberedMemberIds();
  const memberIds = LOCAL_QA_ACCOUNTS
    .map((account) => remembered[account.id])
    .filter((memberId) => memberId && memberId !== identity.user.id);
  if (!memberIds.length) return { ok: false, code: 'LOCAL_QA_COUNTERPART_NOT_READY' };

  const [blocks, follows] = await Promise.all([
    supabase.from('blocks').delete().eq('blocker_id', identity.user.id).in('blocked_id', memberIds),
    supabase.from('follows').delete().eq('follower_id', identity.user.id).in('followed_id', memberIds),
  ]);
  if (blocks.error || follows.error) return { ok: false, code: 'LOCAL_QA_RESET_FAILED' };

  try {
    window.localStorage.removeItem(`facs_blocked_members:${identity.user.id}`);
    window.localStorage.removeItem(`facs_local_follow_targets:${identity.user.id}`);
  } catch { /* Private browsing may deny local Storage. The server reset remains canonical. */ }
  return { ok: true };
}
