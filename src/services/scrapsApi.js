import { supabase } from './supabaseClient.js';

export const SCRAP_ERROR = Object.freeze({
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  UNAVAILABLE: 'SCRAPS_UNAVAILABLE',
});

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
  return error ? { error: SCRAP_ERROR.UNAVAILABLE } : { data: new Set(data.map((item) => item.post_id)) };
}

/** Creates or removes a single private scrap for the authenticated user only. */
export async function toggleMyScrap(postId, isSaved) {
  const identity = await authenticatedUser();
  if (identity.error) return identity;
  const request = isSaved
    ? supabase.from('scraps').delete().eq('user_id', identity.user.id).eq('post_id', postId)
    : supabase.from('scraps').insert({ user_id: identity.user.id, post_id: postId });
  const { error } = await request;
  return error ? { error: SCRAP_ERROR.UNAVAILABLE } : { data: { saved: !isSaved } };
}

