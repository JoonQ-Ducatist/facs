import { supabase } from './supabaseClient.js';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const LOCAL_BLOCKS_KEY = 'facs_blocked_members';

async function currentUser() {
  if (!supabase) return { error: 'AUTH_REQUIRED' };
  const { data, error } = await supabase.auth.getUser();
  return error || !data.user ? { error: 'AUTH_REQUIRED' } : { user: data.user };
}

function readLocal(userId) {
  try {
    const saved = JSON.parse(window.localStorage.getItem(`${LOCAL_BLOCKS_KEY}:${userId}`) ?? '[]');
    return Array.isArray(saved) ? saved.filter((item) => item?.id && typeof item.id === 'string') : [];
  } catch { return []; }
}

function writeLocal(userId, members) {
  window.localStorage.setItem(`${LOCAL_BLOCKS_KEY}:${userId}`, JSON.stringify(members));
}

/** Lists only members blocked by the signed-in user; no reciprocal relationship is disclosed. */
export async function getMyBlockedMembers() {
  const identity = await currentUser();
  if (identity.error) return identity;
  const local = readLocal(identity.user.id);
  const { data, error } = await supabase.from('blocks').select('blocked_id').eq('blocker_id', identity.user.id);
  const localById = new Map(local.map((item) => [item.id, item]));
  for (const item of data ?? []) if (!localById.has(item.blocked_id)) localById.set(item.blocked_id, { id: item.blocked_id, author: '' });
  return error ? { data: local } : { data: [...localById.values()] };
}

/** Blocks a member and records only the public handle needed for the owner's unblock list. */
export async function blockMember(targetId, author = '') {
  const identity = await currentUser();
  if (identity.error || targetId === identity.user.id) return { error: identity.error ?? 'INVALID_TARGET' };
  const entry = { id: targetId, author };
  if (UUID_PATTERN.test(targetId)) {
    const { error } = await supabase.from('blocks').insert({ blocker_id: identity.user.id, blocked_id: targetId });
    if (error && error.code !== '23505') return { error: 'UNAVAILABLE' };
  }
  const next = readLocal(identity.user.id).filter((item) => item.id !== targetId);
  next.push(entry);
  writeLocal(identity.user.id, next);
  return { data: entry };
}

/** Removes only the signed-in member's block. */
export async function unblockMember(targetId) {
  const identity = await currentUser();
  if (identity.error) return identity;
  if (UUID_PATTERN.test(targetId)) {
    const { error } = await supabase.from('blocks').delete().eq('blocker_id', identity.user.id).eq('blocked_id', targetId);
    if (error) return { error: 'UNAVAILABLE' };
  }
  writeLocal(identity.user.id, readLocal(identity.user.id).filter((item) => item.id !== targetId));
  return { data: { id: targetId } };
}
