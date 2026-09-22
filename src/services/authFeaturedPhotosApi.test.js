import assert from 'node:assert/strict';
import test from 'node:test';
import { listSupabaseAuthFeaturedPhotos } from './supabaseApi.js';

test('guest login images use the public featured-photo RPC and sign only returned objects', async () => {
  const calls = [];
  const client = {
    rpc: async (name, args) => {
      calls.push({ type: 'rpc', name, args });
      return {
        data: [{ post_id: 'post-public', storage_path: 'uploads/2026/09/asset-public', participation_count: '14' }],
        error: null,
      };
    },
    storage: {
      from: (bucket) => ({
        createSignedUrl: async (path, seconds) => {
          calls.push({ type: 'sign', bucket, path, seconds });
          return { data: { signedUrl: 'https://signed.example/photo.jpg' }, error: null };
        },
      }),
    },
  };

  const result = await listSupabaseAuthFeaturedPhotos({ limit: 3, candidatePoolSize: 12, client });

  assert.deepEqual(calls, [
    { type: 'rpc', name: 'get_auth_featured_public_photos', args: { page_size: 3, candidate_pool_size: 12 } },
    { type: 'sign', bucket: 'facs-media', path: 'uploads/2026/09/asset-public', seconds: 600 },
  ]);
  assert.deepEqual(result.data, [{ id: 'post-public', imageUrl: 'https://signed.example/photo.jpg', participationCount: 14 }]);
  assert.equal(result.meta.source, 'supabase-auth-featured');
});

test('guest login photo lookup does not turn an RPC failure into a data leak or fake card', async () => {
  const result = await listSupabaseAuthFeaturedPhotos({
    client: { rpc: async () => ({ data: null, error: { code: '42501' } }), storage: { from: () => ({}) } },
  });
  assert.deepEqual(result.data, []);
  assert.equal(result.meta.source, 'degraded');
});
