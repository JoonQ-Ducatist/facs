import assert from 'node:assert/strict';
import test from 'node:test';
import { LIVE_REACTION_REPLAY_LIMIT, LIVE_REACTION_RETAINED_PER_POST, LIVE_REACTION_UNSEEN_LIMIT, applyLiveReactionToCard, selectLiveReactionReplay, toLiveReaction } from './liveReactionService.js';

test('live reaction maps only anonymous valid presentation fields', () => {
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
  assert.equal(toLiveReaction({ id: 1, reaction: 'age', perceived_age: 'unknown' }), null);
});

test('bounded replay distinguishes unseen reactions without exposing an unbounded history', () => {
  const reactions = Array.from({ length: 10 }, (_, index) => ({
    id: String(index + 1), postId: 'post-1', kind: index % 2 ? 'no' : 'yes', value: index % 2 ? 'N' : 'Y',
    createdAt: `2026-11-02T00:00:${String(index + 1).padStart(2, '0')}.000Z`,
  }));
  const replay = selectLiveReactionReplay(reactions, reactions[3].createdAt);
  assert.equal(LIVE_REACTION_RETAINED_PER_POST, 12);
  assert.equal(LIVE_REACTION_REPLAY_LIMIT, 6);
  assert.equal(LIVE_REACTION_UNSEEN_LIMIT, 3);
  assert.deepEqual(replay.map(({ id, emphasis }) => [id, emphasis]), [['2', 'seen'], ['3', 'seen'], ['4', 'seen'], ['5', 'new'], ['6', 'new'], ['7', 'new']]);
});

test('first visit emphasizes only three and a fully seen visit replays the latest six subtly', () => {
  const reactions = Array.from({ length: 8 }, (_, index) => ({ id: String(index + 1), postId: 'post-1', createdAt: `2026-11-02T00:00:${String(index + 1).padStart(2, '0')}.000Z` }));
  assert.deepEqual(selectLiveReactionReplay(reactions).map(({ id, emphasis }) => [id, emphasis]), [['1', 'new'], ['2', 'new'], ['3', 'new']]);
  assert.deepEqual(selectLiveReactionReplay(reactions, reactions[7].createdAt).map(({ id, emphasis }) => [id, emphasis]), [['3', 'seen'], ['4', 'seen'], ['5', 'seen'], ['6', 'seen'], ['7', 'seen'], ['8', 'seen']]);
});

test('presentation aggregates update forward but never move a visible result backwards', () => {
  const reaction = toLiveReaction({ id: 2, post_id: 'post-1', reaction: 'no', yes_count: 12, no_count: 4, average_age: null, total_votes: 16 });
  assert.deepEqual(applyLiveReactionToCard({ id: 'post-1', evaluationType: 'BINARY', yesVotes: 11, noVotes: 3 }, reaction), { id: 'post-1', evaluationType: 'BINARY', yesVotes: 12, noVotes: 4 });
  const older = toLiveReaction({ id: 3, post_id: 'post-1', reaction: 'yes', yes_count: 2, no_count: 1, average_age: null, total_votes: 3 });
  const visible = { id: 'post-1', evaluationType: 'BINARY', yesVotes: 4, noVotes: 2 };
  assert.deepEqual(applyLiveReactionToCard(visible, older), visible);
});
