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

test('staging login uses tiny inline cards without Supabase media requests', async () => {
  const calls = [];
  const client = {
    supabaseUrl: 'https://zvaheyfumpmzrolsbtrf.supabase.co',
    rpc: async () => { calls.push('rpc'); return { data: [], error: null }; },
    storage: { from: () => { calls.push('storage'); return {}; } },
  };

  const result = await listSupabaseAuthFeaturedPhotos({ limit: 5, client });

  assert.deepEqual(calls, []);
  assert.equal(result.data.length, 5);
  assert.ok(result.data.every((card) => card.imageUrl.startsWith('data:image/svg+xml,')));
  assert.equal(result.meta.source, 'staging-lightweight');
});

test('production login reuses a valid signed-card cache entry', async () => {
  const calls = [];
  const cache = new Map();
  const storage = {
    getItem: (key) => cache.get(key) ?? null,
    setItem: (key, value) => cache.set(key, value),
  };
  const client = {
    supabaseUrl: 'https://production-ref.supabase.co',
    rpc: async () => {
      calls.push('rpc');
      return { data: [{ post_id: 'post-1', storage_path: 'uploads/photo.jpg', participation_count: 2 }], error: null };
    },
    storage: { from: () => ({ createSignedUrl: async () => { calls.push('sign'); return { data: { signedUrl: 'https://signed.example/photo.jpg' }, error: null }; } }) },
  };

  const first = await listSupabaseAuthFeaturedPhotos({ limit: 5, candidatePoolSize: 20, client, cache: storage, now: 1_000 });
  const second = await listSupabaseAuthFeaturedPhotos({ limit: 5, candidatePoolSize: 20, client, cache: storage, now: 2_000 });

  assert.deepEqual(calls, ['rpc', 'sign']);
  assert.deepEqual(second.data, first.data);
  assert.equal(second.meta.source, 'browser-cache');
});

test('expired or malformed featured-card cache safely refetches', async () => {
  const calls = [];
  const cache = new Map([['facs_auth_featured_v1:5:20', '{bad json']]);
  const storage = { getItem: (key) => cache.get(key) ?? null, setItem: () => { throw new Error('full'); } };
  const client = {
    supabaseUrl: 'https://production-ref.supabase.co',
    rpc: async () => { calls.push('rpc'); return { data: [], error: null }; },
    storage: { from: () => ({ createSignedUrl: async () => ({ data: null, error: null }) }) },
  };

  const result = await listSupabaseAuthFeaturedPhotos({ client, cache: storage, now: 10_000 });

  assert.deepEqual(calls, ['rpc']);
  assert.deepEqual(result.data, []);
  assert.equal(result.meta.source, 'supabase-auth-featured');
});
