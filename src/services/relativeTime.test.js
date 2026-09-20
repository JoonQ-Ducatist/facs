import test from 'node:test';
import assert from 'node:assert/strict';
import { formatRelativePublishedTime } from './relativeTime.js';

const NOW = Date.parse('2026-09-20T12:00:00Z');

test('server publication time uses Korean relative labels across each boundary', () => {
  assert.equal(formatRelativePublishedTime('2026-09-20T11:59:20Z', 'ko', NOW), '방금 전');
  assert.equal(formatRelativePublishedTime('2026-09-20T11:55:00Z', 'ko', NOW), '5분 전');
  assert.equal(formatRelativePublishedTime('2026-09-20T10:00:00Z', 'ko', NOW), '2시간 전');
  assert.equal(formatRelativePublishedTime('2026-09-17T12:00:00Z', 'ko', NOW), '3일 전');
});

test('server publication time uses English labels and safely handles invalid or future data', () => {
  assert.equal(formatRelativePublishedTime('2026-09-20T11:55:00Z', 'en', NOW), '5 min ago');
  assert.equal(formatRelativePublishedTime('2026-09-20T14:00:00Z', 'en', NOW), 'just now');
  assert.equal(formatRelativePublishedTime('not-a-date', 'en', NOW), null);
});
