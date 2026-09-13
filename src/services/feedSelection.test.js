import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveFeedCardIndex } from './feedSelection.js';

const cards = [{ id: 'fresh' }, { id: 'older-1' }, { id: 'older-2' }];

test('a just-published post is the first card shown in Shuffle', () => {
  assert.equal(resolveFeedCardIndex(cards, 2, 'ALL', 'fresh'), 0);
});

test('category browsing and deliberate navigation do not force a featured post', () => {
  assert.equal(resolveFeedCardIndex(cards, 1, 'Outfit', 'fresh'), 1);
  assert.equal(resolveFeedCardIndex(cards, 4, 'ALL', null), 1);
});
