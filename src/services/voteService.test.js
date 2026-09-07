import test from 'node:test';
import assert from 'node:assert/strict';
import { applyAggregateToCard, isSupabasePost } from './voteService.js';

test('only UUID-backed cards are considered Supabase posts', () => {
  assert.equal(isSupabasePost({ id: 'card-1' }), false);
  assert.equal(isSupabasePost({ id: '3f2504e0-4f89-41d3-9a0c-0305e82c3301' }), true);
});

test('server aggregate updates a binary presentation card without raw vote data', () => {
  const card = applyAggregateToCard({ id: '3f2504e0-4f89-41d3-9a0c-0305e82c3301', evaluationType: 'BINARY', yesVotes: 1, noVotes: 1 }, { yesCount: 7, noCount: 3, totalVotes: 10 });
  assert.deepEqual(card, { id: '3f2504e0-4f89-41d3-9a0c-0305e82c3301', evaluationType: 'BINARY', yesVotes: 7, noVotes: 3 });
});

test('server aggregate updates a numeric-age presentation card', () => {
  const card = applyAggregateToCard({ id: '3f2504e0-4f89-41d3-9a0c-0305e82c3301', evaluationType: 'NUMERIC_AGE', ageEstimate: 30, ageVoteCount: 1 }, { averageAge: 32.4, totalVotes: 28 });
  assert.equal(card.ageEstimate, 32.4);
  assert.equal(card.ageVoteCount, 28);
});
