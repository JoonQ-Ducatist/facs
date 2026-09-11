import test from 'node:test';
import assert from 'node:assert/strict';
import { fromDatabaseCategory, getSupabaseFeedAggregates, getSupabaseMyVotedPostIds, listSupabasePublishedPosts, mapSupabaseFeedPost, normalizeSupabaseError, toDatabaseCategory } from './supabaseApi.js';

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

test('server feed preserves the private personalized order returned by the RPC', async () => {
  const calls = [];
  const postA = { id: 'post-a', author_id: 'author-a', category: 'outfit', evaluation: 'binary', question: 'A', age_min: null, age_max: null, published_at: '2026-09-10T00:00:00Z' };
  const postB = { id: 'post-b', author_id: 'author-b', category: 'fitness', evaluation: 'binary', question: 'B', age_min: null, age_max: null, published_at: '2026-09-11T00:00:00Z' };
  const query = {
    select: () => query,
    eq: () => query,
    in: async () => ({ data: [postB, postA], error: null }),
  };
  const client = {
    rpc: async (name, args) => {
      calls.push({ name, args });
      return { data: [{ post_id: 'post-a', source: 'followed' }, { post_id: 'post-b', source: 'similar_interest' }], error: null };
    },
    from: () => query,
  };
  const result = await listSupabasePublishedPosts({ limit: 20, client });
  assert.deepEqual(calls, [{ name: 'get_personalized_feed_post_ids', args: { page_size: 20, category_filter: null } }]);
  assert.deepEqual(result.data.map((post) => post.id), ['post-a', 'post-b']);
});

test('feed aggregate reads a page in one aggregate-only RPC without raw vote rows', async () => {
  const calls = [];
  const result = await getSupabaseFeedAggregates(['post-a', 'post-a', 'post-b'], {
    rpc: async (name, args) => {
      calls.push({ name, args });
      return { data: [{ post_id: 'post-a', yes_count: '7', no_count: '3', average_age: null, total_votes: '10', sample_status: 'EARLY_SIGNAL' }], error: null };
    },
  });
  assert.deepEqual(calls, [{ name: 'get_published_post_aggregates', args: { target_post_ids: ['post-a', 'post-b'] } }]);
  assert.deepEqual(result.data.get('post-a'), { yesCount: 7, noCount: 3, averageAge: null, totalVotes: 10, sampleStatus: 'EARLY_SIGNAL' });
  assert.equal(result.data.has('post-b'), false);
});

test('my vote state reads only the current member\'s completed post IDs', async () => {
  const calls = [];
  const result = await getSupabaseMyVotedPostIds(['post-a', 'post-a', 'post-b'], {
    rpc: async (name, args) => {
      calls.push({ name, args });
      return { data: [{ post_id: 'post-b' }], error: null };
    },
  });
  assert.deepEqual(calls, [{ name: 'get_my_voted_post_ids', args: { target_post_ids: ['post-a', 'post-b'] } }]);
  assert.deepEqual([...result.data], ['post-b']);
});

test('upload categories map to the database contract without exposing display labels', () => {
  assert.equal(toDatabaseCategory('PerceivedAge'), 'perceived_age');
  assert.equal(toDatabaseCategory('SocialProfile'), 'profile');
  assert.equal(toDatabaseCategory('Outfit'), 'outfit');
  assert.equal(fromDatabaseCategory('perceived_age'), 'PerceivedAge');
  assert.equal(fromDatabaseCategory('profile'), 'SocialProfile');
});
