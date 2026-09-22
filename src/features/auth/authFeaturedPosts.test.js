import assert from 'node:assert/strict';
import test from 'node:test';
import { authParticipationCount, selectAuthFeaturedPosts } from './authFeaturedPosts.js';

test('login features only the five most popular real posts before random rotation', () => {
  const cards = [1, 2, 3, 4, 5, 6].map((votes) => ({ id: String(votes), imageUrl: `/photo-${votes}.jpg`, yesVotes: votes, noVotes: 0 }));
  const selected = selectAuthFeaturedPosts(cards, () => 0);

  assert.deepEqual(selected.map((card) => card.id).sort(), ['2', '3', '4', '5', '6']);
  assert.equal(authParticipationCount({ evaluationType: 'NUMERIC_AGE', ageVoteCount: 3 }), 3);
  assert.equal(authParticipationCount({ participationCount: 14, yesVotes: 0, noVotes: 0 }), 14);
});

test('login featured selection is safe for an empty or malformed response and does not mutate input', () => {
  assert.deepEqual(selectAuthFeaturedPosts(), []);
  assert.deepEqual(selectAuthFeaturedPosts([null, {}, { id: 'missing-image' }]), []);
  const source = [{ id: '1', imageUrl: '/one.jpg', participationCount: 4 }, { id: '2', imageUrl: '/two.jpg', participationCount: 2 }];
  const snapshot = source.map((card) => ({ ...card }));
  selectAuthFeaturedPosts(source, () => 0);
  assert.deepEqual(source, snapshot);
  assert.equal(authParticipationCount({ participationCount: null, yesVotes: 3, noVotes: 1 }), 4);
});
