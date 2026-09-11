import { supabase } from './supabaseClient.js';

export const FOLLOW_ERROR = Object.freeze({
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  UNAVAILABLE: 'FOLLOWS_UNAVAILABLE',
  INVALID_TARGET: 'INVALID_TARGET',
});

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const LOCAL_FOLLOWING_KEY = 'facs_local_follow_targets';

/** Uses a device-only target for fixture cards so the same UI remains testable without inventing accounts. */
export function getFollowTargetKey(authorId, author = '') {
  return UUID_PATTERN.test(authorId ?? '') ? authorId : `sample:${String(author).trim().toLowerCase()}`;
}

function localFollowingIds() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(LOCAL_FOLLOWING_KEY) ?? '[]');
    return new Set(Array.isArray(saved) ? saved.filter((id) => typeof id === 'string' && id.startsWith('sample:')) : []);
  } catch {
    return new Set();
  }
}

function writeLocalFollowingIds(ids) {
  window.localStorage.setItem(LOCAL_FOLLOWING_KEY, JSON.stringify([...ids]));
}

async function authenticatedUser() {
  if (!supabase) return { error: FOLLOW_ERROR.UNAVAILABLE };
  const { data, error } = await supabase.auth.getUser();
  return error || !data.user ? { error: FOLLOW_ERROR.AUTH_REQUIRED } : { user: data.user };
}

/** Lists only the current member's follow targets; followers of another member stay private. */
export async function getMyFollowingIds() {
  const identity = await authenticatedUser();
  if (identity.error) return identity;
  const { data, error } = await supabase.from('follows').select('followed_id').eq('follower_id', identity.user.id);
  const local = localFollowingIds();
  return error ? { data: local } : { data: new Set([...local, ...(data ?? []).map((item) => item.followed_id)]) };
}

/** Creates or removes one explicit follow without exposing vote or preference data. */
export async function toggleMyFollow(followedId, isFollowing) {
  const identity = await authenticatedUser();
  if (identity.error) return identity;
  if (!UUID_PATTERN.test(followedId)) {
    if (!followedId?.startsWith('sample:')) return { error: FOLLOW_ERROR.INVALID_TARGET };
    const local = localFollowingIds();
    if (isFollowing) local.delete(followedId); else local.add(followedId);
    writeLocalFollowingIds(local);
    return { data: { following: !isFollowing, localOnly: true } };
  }
  if (followedId === identity.user.id) return { error: FOLLOW_ERROR.INVALID_TARGET };
  const request = isFollowing
    ? supabase.from('follows').delete().eq('follower_id', identity.user.id).eq('followed_id', followedId)
    : supabase.from('follows').insert({ follower_id: identity.user.id, followed_id: followedId });
  const { error } = await request;
  return error ? { error: FOLLOW_ERROR.UNAVAILABLE } : { data: { following: !isFollowing } };
}
