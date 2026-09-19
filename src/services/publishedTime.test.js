import test from 'node:test';
import assert from 'node:assert/strict';
import { formatPublishedTime } from './publishedTime.js';

const now = Date.parse('2026-09-19T12:00:00Z');

test('published time is calculated from the persisted server timestamp', () => {
  assert.equal(formatPublishedTime('2026-09-19T11:59:31Z', { now }), '방금 전');
  assert.equal(formatPublishedTime('2026-09-19T11:42:00Z', { now }), '18분 전');
  assert.equal(formatPublishedTime('2026-09-19T09:00:00Z', { now }), '3시간 전');
  assert.equal(formatPublishedTime('2026-09-17T12:00:00Z', { now }), '2일 전');
});

test('published time has a compact English form and falls back cleanly without a timestamp', () => {
  assert.equal(formatPublishedTime('2026-09-19T11:42:00Z', { locale: 'en', now }), '18m ago');
  assert.equal(formatPublishedTime('', { now }), '');
});
