import { supabase } from './supabaseClient.js';

export const LIVE_REACTION_WINDOW_MS = 60 * 60 * 1000;

/** Uses the publish timestamp as a client-side guard; the database is final authority. */
export function isLiveReactionWindow(publishedAt, now = Date.now()) {
  const timestamp = Date.parse(publishedAt ?? '');
  return Number.isFinite(timestamp) && timestamp <= now && now - timestamp < LIVE_REACTION_WINDOW_MS;
}

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
  };
}

/** Applies only aggregate fields; the browser never receives a voter identity. */
export function applyLiveReactionToCard(card, reaction) {
  if (!card || !reaction?.aggregate) return card;
  if (card.evaluationType === 'NUMERIC_AGE') return { ...card, ageEstimate: reaction.aggregate.averageAge, ageVoteCount: reaction.aggregate.totalVotes };
  return { ...card, yesVotes: reaction.aggregate.yesCount, noVotes: reaction.aggregate.noCount };
}

/** Subscribes only after the caller has established author/evaluator eligibility. */
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
