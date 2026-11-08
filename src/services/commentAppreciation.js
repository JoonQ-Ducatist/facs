import { supabase } from './supabaseClient.js';

const UUID = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

/** null means appreciation is unavailable, independently of the comment list. */
export async function readCommentAppreciation(ids, client = supabase) {
  if (!ids.length) return new Set();
  try {
    const { data, error } = await client.from('comment_appreciations')
      .select('comment_id').in('comment_id', ids);
    return error ? null : new Set((data ?? []).map(row => row.comment_id));
  } catch {
    return null;
  }
}

export async function setCommentAppreciation(commentId, thanked, client = supabase) {
  if (!UUID.test(commentId ?? '') || typeof thanked !== 'boolean') return false;
  try {
    const table = client.from('comment_appreciations');
    const { error } = thanked
      ? await table.upsert({ comment_id: commentId }, { onConflict: 'comment_id', ignoreDuplicates: true })
      : await table.delete().eq('comment_id', commentId);
    return !error;
  } catch {
    return false;
  }
}
