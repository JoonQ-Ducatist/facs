import assert from 'node:assert/strict';
import test from 'node:test';
import { selectUniqueAccountRecommendations } from './recommendationService.js';

test('desktop account suggestions contain each author once in feed relevance order', () => {
  const cards = [
    { id: 'post-a', authorId: 'member-a', author: 'alice' },
    { id: 'post-b', authorId: 'member-a', author: 'alice' },
    { id: 'post-c', authorId: 'member-b', author: 'bob' },
  ];
  assert.deepEqual(selectUniqueAccountRecommendations(cards, 'viewer').map((card) => card.id), ['post-a', 'post-c']);
});

test('desktop account suggestions exclude the signed-in member and local own uploads', () => {
  const cards = [
    { id: 'mine-server', authorId: 'viewer', author: 'me' },
    { id: 'mine-local', author: 'me_local', isMyUpload: true },
    { id: 'other', authorId: 'member-b', author: 'bob' },
  ];
  assert.deepEqual(selectUniqueAccountRecommendations(cards, 'viewer').map((card) => card.id), ['other']);
});
