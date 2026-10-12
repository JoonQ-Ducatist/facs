import test from 'node:test';
import assert from 'node:assert/strict';
import { buildShareUrl } from './share.js';

test('share URLs retain only a post and guest marker on the selected locale path', () => {
  assert.equal(buildShareUrl('card-7', 'en', 'https://facs.example/ko/?state=loading'), 'https://facs.example/?post=card-7&shared=1');
  assert.equal(buildShareUrl('card-7', 'ko', 'https://facs.example/?locale=en'), 'https://facs.example/ko/?post=card-7&shared=1');
});
