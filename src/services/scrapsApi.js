import { supabase } from './supabaseClient.js';

export const SCRAP_ERROR = Object.freeze({
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  UNAVAILABLE: 'SCRAPS_UNAVAILABLE',
});

const LOCAL_SCRAPS_KEY = 'facs_local_scrap_post_ids';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function localScrapIds() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(LOCAL_SCRAPS_KEY) ?? '[]');
    return new Set(Array.isArray(saved) ? saved.filter((id) => typeof id === 'string') : []);
  } catch {
    return new Set();
  }
}

function writeLocalScrapIds(ids) {
  window.localStorage.setItem(LOCAL_SCRAPS_KEY, JSON.stringify([...ids]));
}

async function authenticatedUser() {
  if (!supabase) return { error: SCRAP_ERROR.UNAVAILABLE };
  const { data, error } = await supabase.auth.getUser();
  return error || !data.user ? { error: SCRAP_ERROR.AUTH_REQUIRED } : { user: data.user };
}

/** Lists only the current user's accessible saved post IDs; raw relationship data is never exposed. */
export async function getMyScrapPostIds() {
  const identity = await authenticatedUser();
  if (identity.error) return identity;
  const { data, error } = await supabase.from('scraps').select('post_id').eq('user_id', identity.user.id);
  const local = localScrapIds();
  return error ? { data: local } : { data: new Set([...local, ...data.map((item) => item.post_id)]) };
}

/** Creates or removes a single private scrap for the authenticated user only. */
export async function toggleMyScrap(postId, isSaved) {
  const identity = await authenticatedUser();
  if (identity.error) return identity;
  if (!UUID_PATTERN.test(postId)) {
    const local = localScrapIds();
    if (isSaved) local.delete(postId); else local.add(postId);
    writeLocalScrapIds(local);
    return { data: { saved: !isSaved } };
  }
  const request = isSaved
    ? supabase.from('scraps').delete().eq('user_id', identity.user.id).eq('post_id', postId)
    : supabase.from('scraps').insert({ user_id: identity.user.id, post_id: postId });
  const { error } = await request;
  return error ? { error: SCRAP_ERROR.UNAVAILABLE } : { data: { saved: !isSaved } };
}
