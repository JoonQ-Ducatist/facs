import test from 'node:test';
import assert from 'node:assert/strict';
import { createSupabasePublishedPost } from './supabaseApi.js';

function fixture({ lostPublish = false } = {}) {
  const calls = [];
  let signing = 0;
  const client = {
    auth: { getUser: async () => ({ data: { user: { id: 'owner-a' } }, error: null }) },
    rpc: async (name) => {
      calls.push(name);
      if (name === 'create_post_upload_with_visibility') return { data: [{ post_id: 'post-one', asset_id: 'asset-one', storage_path: 'owned/one', media_position: 0 }] };
      return lostPublish ? { error: { code: 'NETWORK' } } : { data: { id: 'post-one', published_at: '2026-10-31T02:00:00Z' } };
    },
    from(name) {
      assert.equal(name, 'posts');
      return {
        select(fields) { assert.equal(fields, 'id,published_at,status'); return this; },
        eq(key, value) { calls.push([key, value]); return this; },
        async maybeSingle() { calls.push('reconcile'); return { data: { id: 'post-one', status: 'published', published_at: '2026-10-31T02:00:00Z' } }; },
      };
    },
    storage: { from: () => ({
      upload: async () => { calls.push('storage.upload'); return { error: null }; },
      createSignedUrl: async () => {
        calls.push('signed-url'); signing++;
        return !lostPublish && signing === 1 ? { error: { code: 'NETWORK' } } : { data: { signedUrl: 'https://signed.test/photo' } };
      },
    }) },
  };
  const media = [{ type: 'image', file: { name: 'local.jpg', size: 12, type: 'image/jpeg' } }];
  return { calls, payload: { category: 'Outfit', evaluationType: 'BINARY', question: 'Does this outfit work?', visibility: 'public', media, client } };
}

test('signed URL failure retries the published receipt without another post or upload', async () => {
  const { calls, payload } = fixture();
  assert.ok((await createSupabasePublishedPost(payload)).error);
  const recovered = await createSupabasePublishedPost(payload);
  assert.equal(recovered.data.post.id, 'post-one');
  assert.equal(recovered.data.media[0].url, 'https://signed.test/photo');
  assert.deepEqual(calls, ['create_post_upload_with_visibility', 'storage.upload', 'publish_post_upload', 'signed-url', 'signed-url']);
});

test('lost publish response reconciles the same owner post before a retry', async () => {
  const { calls, payload } = fixture({ lostPublish: true });
  assert.ok((await createSupabasePublishedPost(payload)).error);
  const recovered = await createSupabasePublishedPost(payload);
  assert.equal(recovered.data.post.id, 'post-one');
  assert.deepEqual(calls, ['create_post_upload_with_visibility', 'storage.upload', 'publish_post_upload', ['id', 'post-one'], ['author_id', 'owner-a'], 'reconcile', 'signed-url']);
});
