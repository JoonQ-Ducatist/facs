import test from 'node:test';
import assert from 'node:assert/strict';
import { sortPostsNewestFirst } from './profileOrdering.js';

test('own posts are sorted by publishedAt descending and ID descending for ties', () => {
  const posts = [
    { id: 'post-old', publishedAt: '2026-09-01T00:00:00.000Z' },
    { id: 'post-new-a', publishedAt: '2026-09-15T00:00:00.000Z' },
    { id: 'post-new-b', publishedAt: '2026-09-15T00:00:00.000Z' },
  ];
  assert.deepEqual(sortPostsNewestFirst(posts).map((post) => post.id), ['post-new-b', 'post-new-a', 'post-old']);
  assert.deepEqual(posts.map((post) => post.id), ['post-old', 'post-new-a', 'post-new-b']);
});

test('cards without server timestamps remain deterministically ordered', () => {
  assert.deepEqual(sortPostsNewestFirst([{ id: 'a' }, { id: 'c' }, { id: 'b' }]).map((post) => post.id), ['c', 'b', 'a']);
});
