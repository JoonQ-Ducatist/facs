import test from 'node:test';
import assert from 'node:assert/strict';
import { fromDatabaseCategory, listSupabasePublishedPosts, mapSupabaseFeedPost, normalizeSupabaseError, toDatabaseCategory } from './supabaseApi.js';

test('Supabase duplicate vote errors retain the public API contract', () => {
  const result = normalizeSupabaseError({ code: '23505' });
  assert.equal(result.error.code, 'ALREADY_VOTED');
  assert.equal(result.error.message, '이미 의견을 남긴 게시물이에요.');
});

test('Supabase authorization errors never expose database detail', () => {
  const result = normalizeSupabaseError({ code: '42501' });
  assert.equal(result.error.code, 'FORBIDDEN');
  assert.equal(result.error.message, '이 작업을 수행할 권한이 없어요.');
});

test('server feed maps only the reduced public post contract', () => {
  assert.deepEqual(mapSupabaseFeedPost({ id: 'post-1', category: 'outfit', evaluation: 'binary', question: '어울리나요?', age_min: null, age_max: null, published_at: '2026-09-08T00:00:00Z', author_id: 'hidden' }), {
    id: 'post-1', authorId: 'hidden', category: 'outfit', evaluationType: 'BINARY', question: '어울리나요?', ageMin: null, ageMax: null, publishedAt: '2026-09-08T00:00:00Z',
  });
});

test('server feed safely degrades when Supabase is unavailable', async () => {
  const result = await listSupabasePublishedPosts({ client: null });
  assert.deepEqual(result.data, []);
  assert.equal(result.meta.source, 'unavailable');
});

test('server feed safely degrades when the public post query fails', async () => {
  const terminal = { limit: async () => ({ data: null, error: { code: 'PGRST000' } }) };
  const chained = { ...terminal, from: () => chained, select: () => chained, eq: () => chained, order: () => chained };
  const result = await listSupabasePublishedPosts({ client: chained });
  assert.deepEqual(result.data, []);
  assert.equal(result.meta.source, 'degraded');
});

test('upload categories map to the database contract without exposing display labels', () => {
  assert.equal(toDatabaseCategory('PerceivedAge'), 'perceived_age');
  assert.equal(toDatabaseCategory('SocialProfile'), 'profile');
  assert.equal(toDatabaseCategory('Outfit'), 'outfit');
  assert.equal(fromDatabaseCategory('perceived_age'), 'PerceivedAge');
  assert.equal(fromDatabaseCategory('profile'), 'SocialProfile');
});
