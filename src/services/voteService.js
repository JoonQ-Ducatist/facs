import { apiSuccess, submitVote as submitMockVote } from './mockApi.js';
import { submitSupabaseVote } from './supabaseApi.js';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** A server post uses a UUID; prototype cards deliberately stay local until feed delivery exists. */
export function isSupabasePost(card) {
  return Boolean(card?.id && UUID_PATTERN.test(card.id));
}

/** Maps the aggregate-only server response back into the presentation card contract. */
export function applyAggregateToCard(card, aggregate) {
  if (card.evaluationType === 'NUMERIC_AGE') {
    return { ...card, ageEstimate: aggregate.averageAge, ageVoteCount: aggregate.totalVotes };
  }
  return { ...card, yesVotes: aggregate.yesCount, noVotes: aggregate.noCount };
}

/** Sends real UUID-backed posts to Supabase while preserving local prototype behavior. */
export async function submitCardVote(card, value, votedIds) {
  if (!isSupabasePost(card)) return submitMockVote(card, value, votedIds);
  const voteValue = value?.type === 'age' ? value.value : value;
  const result = await submitSupabaseVote({
    postId: card.id,
    evaluationType: card.evaluationType,
    value: voteValue,
  });
  if (result.error) return result;
  return apiSuccess({ ...result.data, post: applyAggregateToCard(card, result.data.aggregate) });
}
