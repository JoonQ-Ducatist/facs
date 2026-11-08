import assert from 'node:assert/strict';
import test from 'node:test';
import { getCompletedAuthReturnUrl } from './authConfig.js';
import { readSharedPostForAuth, rememberSharedPostForAuth } from './share.js';
import { listSupabasePublishedFeedCards } from './supabaseApi.js';

const sharedId = 'b7295bfa-38a7-423d-a3a0-044675e088d1';
const regularId = '60b04cce-f4de-4b1f-a722-b2390eca92ce';
const nextId = '29dd34a5-ebb8-4e4d-833f-24107f29f5bf';

function browserStorage() {
  const items = new Map();
  return { getItem: key => items.get(key), setItem: (key, value) => items.set(key, value), removeItem: key => items.delete(key) };
}

test('shared photo survives the fixed OAuth callback while credentials are discarded', () => {
  const storage = browserStorage();
  rememberSharedPostForAuth(sharedId.toUpperCase(), 'ko', storage);
  const result = getCompletedAuthReturnUrl({ pathname: '/auth/callback', search: '?code=secret&facs_remember=0&access_token=secret' }, storage);
  assert.equal(result, `/?post=${sharedId}&shared=1&locale=ko`);
  assert.equal(getCompletedAuthReturnUrl({ pathname: '/auth/callback', search: '?error=access_denied' }, storage), null);
  rememberSharedPostForAuth(null, null, storage);
  assert.equal(getCompletedAuthReturnUrl({ pathname: '/auth/callback', search: '' }, storage), '/');
});

test('expired intent and invalid external destinations cannot become return URLs', () => {
  const storage = browserStorage();
  rememberSharedPostForAuth(sharedId, 'en', storage, 1000);
  assert.equal(readSharedPostForAuth(storage, 31 * 60 * 1000), null);
  assert.equal(getCompletedAuthReturnUrl({ pathname: '/auth/callback', search: '?post=https://external.example/&shared=1' }, storage), '/');
});

function feedClient(visibleIds, feedIds = [regularId, nextId]) {
  const queried = [];
  const signed = [];
  const postQuery = {
    select: () => postQuery,
    eq(key, value) {
      assert.deepEqual([key, value], ['status', 'published']);
      return postQuery;
    },
    async in(key, ids) {
      assert.equal(key, 'id');
      queried.push(ids);
      const data = visibleIds.filter(id => ids.includes(id)).map(id => ({
        id, author_id: 'other-member', category: 'outfit', evaluation: 'binary',
        post_media: [{ position: 0, media_assets: { id, storage_path: id, media_type: 'image' } }],
      }));
      return { data };
    },
  };
  const comments = { select: () => comments, in: () => comments, eq: () => comments, order: async () => ({ data: [] }) };
  return {
    queried, signed,
    rpc: async name => ({ data: name === 'get_personalized_feed_post_page' ? feedIds.map(post_id => ({ post_id })) : [] }),
    from: table => table === 'posts' ? postQuery : comments,
    storage: { from: () => ({ createSignedUrl: async id => { signed.push(id); return { data: { signedUrl: `https://media.example/${id}` } }; } }) },
  };
}

test('a visible shared photo outside the first page is read first without changing cursor or ownership', async () => {
  const client = feedClient([regularId, sharedId]);
  const result = await listSupabasePublishedFeedCards({ limit: 1, sharedPostId: sharedId, client });
  assert.deepEqual(client.queried, [[sharedId, regularId]]);
  assert.deepEqual(result.data.map(card => card.id), [sharedId, regularId]);
  assert.equal(result.data[0].isMyUpload, false);
  assert.equal(result.meta.nextCursor, regularId);
  assert.equal(result.meta.hasMore, true);

  const inPage = feedClient([regularId, sharedId], [regularId, sharedId, nextId]);
  const reordered = await listSupabasePublishedFeedCards({ limit: 2, sharedPostId: sharedId, client: inPage });
  assert.deepEqual(reordered.data.map(card => card.id), [sharedId, regularId]);
  assert.equal(reordered.meta.nextCursor, sharedId);
});

test('an RLS-hidden shared photo never gets a card or signed media, and pagination leaves it alone', async () => {
  const client = feedClient([regularId]);
  const result = await listSupabasePublishedFeedCards({ limit: 1, sharedPostId: sharedId, client });
  assert.deepEqual(result.data.map(card => card.id), [regularId]);
  assert.deepEqual(client.signed, [regularId]);

  await listSupabasePublishedFeedCards({ limit: 1, cursor: nextId, sharedPostId: sharedId, client });
  assert.deepEqual(client.queried, [[sharedId, regularId], [regularId]]);
});
