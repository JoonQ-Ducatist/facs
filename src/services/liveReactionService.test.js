import assert from 'node:assert/strict';
import test from 'node:test';
import { LIVE_REACTION_WINDOW_MS, applyLiveReactionToCard, isLiveReactionWindow, toLiveReaction } from './liveReactionService.js';

test('live reactions expire exactly one hour after publication', () => {
  const now = Date.parse('2026-09-10T00:00:00.000Z');
  assert.equal(isLiveReactionWindow('2026-09-09T23:00:00.001Z', now), true);
  assert.equal(isLiveReactionWindow('2026-09-09T23:00:00.000Z', now), false);
  assert.equal(LIVE_REACTION_WINDOW_MS, 3_600_000);
});

test('live reaction maps only anonymous presentation fields', () => {
  const reaction = toLiveReaction({
    id: 28, post_id: 'post-1', reaction: 'age', perceived_age: 32,
    yes_count: 0, no_count: 0, average_age: '32.0', total_votes: 1,
    voter_id: 'must-not-map', email: 'must-not-map@example.com',
  });
  assert.deepEqual(reaction, {
    id: '28', postId: 'post-1', kind: 'age', value: 32,
    aggregate: { yesCount: 0, noCount: 0, averageAge: 32, totalVotes: 1 },
    createdAt: null,
  });
});

test('live reaction rejects invalid age payloads', () => {
  assert.equal(toLiveReaction({ id: 1, reaction: 'age', perceived_age: 'unknown' }), null);
});

test('live reaction updates only result aggregates on the presentation card', () => {
  const reaction = toLiveReaction({ id: 2, post_id: 'post-1', reaction: 'no', yes_count: 12, no_count: 4, average_age: null, total_votes: 16 });
  assert.deepEqual(applyLiveReactionToCard({ id: 'post-1', evaluationType: 'BINARY', yesVotes: 11, noVotes: 3 }, reaction), { id: 'post-1', evaluationType: 'BINARY', yesVotes: 12, noVotes: 4 });
});

test('an older replay event never moves a visible result backwards', () => {
  const older = toLiveReaction({ id: 3, post_id: 'post-1', reaction: 'yes', yes_count: 2, no_count: 1, average_age: null, total_votes: 3 });
  const visible = { id: 'post-1', evaluationType: 'BINARY', yesVotes: 4, noVotes: 2 };
  assert.deepEqual(applyLiveReactionToCard(visible, older), visible);
});
