import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const resultCard = await readFile(new URL('./ResultCard.jsx', import.meta.url), 'utf8');
const feed = await readFile(new URL('./FeedView.jsx', import.meta.url), 'utf8');

test('result card exposes accessible result context without a new visible summary panel', () => {
  assert.match(resultCard, /data-result-card/);
  assert.match(resultCard, /aria-label=\{cardLabel\}/);
  assert.match(resultCard, /card\?\.media\?\.\[0\]/);
  assert.match(resultCard, /sr-only/);
  assert.doesNotMatch(resultCard, /object-cover/);
  assert.doesNotMatch(resultCard, /<header/);
});

test('result card keeps localized category, sample count, and existing actions', () => {
  assert.match(resultCard, /categoryLabel/);
  assert.match(resultCard, /sampleCount/);
  assert.match(resultCard, /onBoost &&/);
  assert.match(resultCard, /onStartUpload &&/);
  assert.match(feed, /import ResultCard from '\.\/ResultCard\.jsx'/);
  assert.match(feed, /<ResultCard locale=\{locale\} card=\{card\} category=\{category\}/);
});

test('numeric and binary results use the same result card base', () => {
  assert.match(feed, /function Result\(\{ locale, card, category/);
  assert.match(feed, /function AgeResult\(\{ locale, card, category/);
  assert.equal((feed.match(/<ResultCard /g) ?? []).length, 4);
});
