import test from 'node:test';
import assert from 'node:assert/strict';
import { clearSignedOutMemberCaches } from './browserAccountCache.js';

function storage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    get length() { return values.size; },
    key(index) { return [...values.keys()][index] ?? null; },
    getItem(key) { return values.get(key) ?? null; },
    removeItem(key) { values.delete(key); },
    snapshot() { return Object.fromEntries(values); },
  };
}

test('successful sign-out clears current member caches and legacy shared sample scraps', () => {
  const localStorage = storage({
    facs_voted_posts_alice: '["post"]',
    'facs_local_follow_targets:alice': '["follow"]',
    'facs_blocked_members:alice': '["blocked"]',
    'facs_live_reaction_seen_v1:alice:post-a': '2026-10-18T00:00:00Z',
    'facs_live_reaction_seen_v1:alice:post-b': '2026-10-18T00:00:00Z',
    facs_local_scrap_post_ids: '["sample"]',
    facs_voted_posts_bob: '["other"]',
    'facs_live_reaction_seen_v1:bob:post-a': '2026-10-18T00:00:00Z',
    facs_locale: 'ko',
    _ga: 'untouched',
  });
  const sessionStorage = storage({ 'facs_boost_candidates_v1:alice': '[]', 'facs_boost_candidates_v1:bob': '["other"]' });

  clearSignedOutMemberCaches('alice', { localStorage, sessionStorage });

  assert.deepEqual(localStorage.snapshot(), {
    facs_voted_posts_bob: '["other"]',
    'facs_live_reaction_seen_v1:bob:post-a': '2026-10-18T00:00:00Z',
    facs_locale: 'ko',
    _ga: 'untouched',
  });
  assert.deepEqual(sessionStorage.snapshot(), { 'facs_boost_candidates_v1:bob': '["other"]' });
});

test('missing member id never clears another browser session', () => {
  const localStorage = storage({ facs_local_scrap_post_ids: '["sample"]' });
  clearSignedOutMemberCaches(null, { localStorage, sessionStorage: storage() });
  assert.equal(localStorage.getItem('facs_local_scrap_post_ids'), '["sample"]');
});

test('unavailable browser storage does not interrupt sign-out', () => {
  const unavailable = { removeItem() { throw new Error('storage unavailable'); } };
  assert.doesNotThrow(() => clearSignedOutMemberCaches('alice', { localStorage: unavailable, sessionStorage: unavailable }));
});
