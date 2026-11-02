import { supabase } from './supabaseClient.js';

export const LIVE_REACTION_RETAINED_PER_POST = 12;
export const LIVE_REACTION_REPLAY_LIMIT = 6;
export const LIVE_REACTION_UNSEEN_LIMIT = 3;

/** Maps the anonymous database event to the small visual reaction contract. */
export function toLiveReaction(payload) {
  const event = payload?.new ?? payload;
  if (!event?.id || !['yes', 'no', 'age'].includes(event.reaction)) return null;
  if (event.reaction === 'age' && !Number.isInteger(Number(event.perceived_age))) return null;
  return {
    id: String(event.id),
    postId: event.post_id,
    kind: event.reaction,
    value: event.reaction === 'age' ? Number(event.perceived_age) : event.reaction === 'yes' ? 'Y' : 'N',
    aggregate: {
      yesCount: Number(event.yes_count ?? 0),
      noCount: Number(event.no_count ?? 0),
      averageAge: event.average_age === null ? null : Number(event.average_age),
      totalVotes: Number(event.total_votes ?? 0),
    },
    createdAt: event.created_at ?? null,
  };
}

/** Reads the bounded anonymous presentation history for one accessible post. */
export async function getRecentPostLiveReactions(postId, client = supabase) {
  if (!client || !postId) return [];
  const query = client
    .from('post_live_reaction_events')
    .select('id, post_id, reaction, perceived_age, yes_count, no_count, average_age, total_votes, created_at')
    .eq('post_id', postId)
    .order('created_at', { ascending: false })
    .limit(LIVE_REACTION_RETAINED_PER_POST);
  const { data, error } = await query;
  if (error) return [];
  return (data ?? []).map(toLiveReaction).filter(Boolean).reverse();
}

/**
 * Replays at most six real reactions. Unseen reactions are intentionally
 * limited to three so balloons remain a social cue rather than a result leak.
 */
export function selectLiveReactionReplay(reactions, checkpoint = null) {
  const checkpointTime = Date.parse(checkpoint ?? '');
  const valid = (Array.isArray(reactions) ? reactions : [])
    .filter((reaction) => reaction?.id && reaction?.postId && Number.isFinite(Date.parse(reaction.createdAt ?? '')))
    .sort((left, right) => Date.parse(left.createdAt) - Date.parse(right.createdAt));
  const unseen = valid.filter((reaction) => !Number.isFinite(checkpointTime) || Date.parse(reaction.createdAt) > checkpointTime);
  const selectedUnseen = unseen.slice(0, LIVE_REACTION_UNSEEN_LIMIT);
  const unseenIds = new Set(selectedUnseen.map((reaction) => reaction.id));
  const seenSlots = LIVE_REACTION_REPLAY_LIMIT - selectedUnseen.length;
  const seen = valid
    .filter((reaction) => !unseenIds.has(reaction.id) && Number.isFinite(checkpointTime) && Date.parse(reaction.createdAt) <= checkpointTime)
    .slice(-seenSlots);
  return [...seen.map((reaction) => ({ ...reaction, emphasis: 'seen' })), ...selectedUnseen.map((reaction) => ({ ...reaction, emphasis: 'new' }))]
    .sort((left, right) => Date.parse(left.createdAt) - Date.parse(right.createdAt));
}

/** Applies only aggregate fields; the browser never receives a voter identity. */
export function applyLiveReactionToCard(card, reaction) {
  if (!card || !reaction?.aggregate) return card;
  if (card.evaluationType === 'NUMERIC_AGE') {
    if (reaction.aggregate.totalVotes < (card.ageVoteCount ?? 0)) return card;
    return { ...card, ageEstimate: reaction.aggregate.averageAge, ageVoteCount: reaction.aggregate.totalVotes };
  }
  if (reaction.aggregate.totalVotes < (card.yesVotes ?? 0) + (card.noVotes ?? 0)) return card;
  return { ...card, yesVotes: reaction.aggregate.yesCount, noVotes: reaction.aggregate.noCount };
}

/** Subscribes only after the caller has selected an accessible visible server post. */
export function subscribeToPostLiveReactions(postId, onReaction) {
  if (!supabase || !postId || typeof onReaction !== 'function') return () => {};
  const channel = supabase
    .channel(`post-live-reactions:${postId}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'post_live_reaction_events', filter: `post_id=eq.${postId}` }, (payload) => {
      const reaction = toLiveReaction(payload);
      if (reaction) onReaction(reaction);
    })
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}
