import { DEMO_POST_IDS, participationCount } from '../feed/ratingParticipation.js';

export const MIN_RANKING_VOTES = 5;

/** Example cards stay in the feed. Rankings require a minimum real-post sample. */
export function hasRankingVotes(card) {
  return !DEMO_POST_IDS.has(card.id) && participationCount(card) >= MIN_RANKING_VOTES;
}
