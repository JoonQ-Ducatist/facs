import { supabase } from './supabaseClient.js';

const LOCAL_QA_PASSWORD = 'facs-local-qa-only-2026';
const LOCAL_QA_MEMBER_IDS_KEY = 'facs_local_qa_member_ids';

export const LOCAL_QA_ACCOUNTS = Object.freeze([
  { id: 'uploader', email: 'qa.uploader@local.facts.test', handle: 'qa_uploader', displayName: '민아', role: '업로더' },
  { id: 'evaluator', email: 'qa.evaluator@local.facts.test', handle: 'qa_evaluator', displayName: '지우', role: '평가자' },
  { id: 'safety', email: 'qa.safety@local.facts.test', handle: 'qa_safety', displayName: 'Alex', role: '안전 점검' },
  // This is a local-fixture expectation only. The database fixture, not this
  // browser metadata, assigns the actual moderator role.
  { id: 'moderator', email: 'qa.moderator@local.facts.test', handle: 'qa_moderator', displayName: '현우', role: 'moderator' },
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

/** Ensures an existing disposable QA member has the same configured handle as the switcher contract. */
export async function ensureLocalQaProfile(account, userId, client = supabase) {
  if (!account || !userId || !client) return { ok: false, code: 'LOCAL_QA_PROFILE_UNAVAILABLE' };
  // Return the server-owned role too. App applies this profile immediately
  // after a QA session switch, before its normal profile hydration finishes.
  const readProfile = () => client.from('profiles').select('id,handle,display_name,role').eq('id', userId).maybeSingle();
  const current = await readProfile();
  if (current.error || !current.data) return { ok: false, code: 'LOCAL_QA_PROFILE_UNAVAILABLE' };
  if (current.data.handle === account.handle) return { ok: true, profile: current.data };

  const updated = await client.rpc('set_my_public_handle', { input_handle: account.handle });
  if (updated.error) return { ok: false, code: 'LOCAL_QA_PROFILE_SYNC_FAILED' };
  const confirmed = await readProfile();
  if (confirmed.error || confirmed.data?.handle !== account.handle) return { ok: false, code: 'LOCAL_QA_PROFILE_SYNC_FAILED' };
  return { ok: true, profile: confirmed.data };
}

async function completeLocalQaSignIn(account, user, client) {
  const profileResult = await ensureLocalQaProfile(account, user?.id, client);
  if (!profileResult.ok) return profileResult;
  rememberMemberId(account.id, user.id);
  return { ok: true, account, profile: profileResult.profile };
}

/** Creates three disposable local accounts on first use, then switches the real Supabase session. */
export async function signInWithLocalQaAccount(accountId) {
  if (!isLocalQaAccountMode() || !supabase) return { ok: false, code: 'LOCAL_QA_UNAVAILABLE' };
  const account = LOCAL_QA_ACCOUNTS.find((item) => item.id === accountId);
  if (!account) return { ok: false, code: 'LOCAL_QA_ACCOUNT_UNKNOWN' };

  const signIn = await supabase.auth.signInWithPassword({ email: account.email, password: LOCAL_QA_PASSWORD });
  if (!signIn.error) {
    return completeLocalQaSignIn(account, signIn.data.user, supabase);
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
  return completeLocalQaSignIn(account, retry.data.user, supabase);
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
