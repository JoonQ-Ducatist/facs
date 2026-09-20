import { supabase } from './supabaseClient.js';

const POST_REPORT_REASONS = new Set(['spam', 'hate', 'harassment', 'sexual_content', 'privacy', 'defamation', 'social_norm_violation', 'other']);

async function currentUser(client) {
  if (!client) return { error: 'AUTH_REQUIRED' };
  const { data, error } = await client.auth.getUser();
  return error || !data.user ? { error: 'AUTH_REQUIRED' } : { user: data.user };
}

/** Sends one private post report; individual reporter identities never appear in Feed. */
export async function submitPostReport(postId, reason, { client = supabase } = {}) {
  if (!postId || !POST_REPORT_REASONS.has(reason)) return { error: 'VALIDATION_FAILED' };
  const identity = await currentUser(client);
  if (identity.error) return identity;
  const { error } = await client.from('reports').insert({
    reporter_id: identity.user.id,
    target_type: 'post',
    target_id: postId,
    reason,
  });
  if (!error) return { data: { postId, reason } };
  if (error.code === '23505') return { error: 'ALREADY_REPORTED' };
  return { error: 'UNAVAILABLE' };
}
