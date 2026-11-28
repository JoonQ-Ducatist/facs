import assert from 'node:assert/strict';
import test from 'node:test';
import { DEMO_POST_IDS } from '../feed/ratingParticipation.js';
import { hasRankingVotes } from './rankingEligibility.js';

test('ranking requires at least five evaluations for real binary posts', () => {
  assert.equal(hasRankingVotes({ yesVotes: 1, noVotes: 0 }), false);
  assert.equal(hasRankingVotes({ yesVotes: 3, noVotes: 1 }), false);
  assert.equal(hasRankingVotes({ yesVotes: 3, noVotes: 2 }), true);
});

test('ranking requires five numeric evaluations and excludes known example posts', () => {
  assert.equal(hasRankingVotes({ evaluationType: 'NUMERIC_AGE', ageVoteCount: 4 }), false);
  assert.equal(hasRankingVotes({ evaluationType: 'NUMERIC_AGE', ageVoteCount: 5 }), true);
  assert.equal(hasRankingVotes({ id: [...DEMO_POST_IDS][0], yesVotes: 100 }), false);
});
