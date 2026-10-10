import test from 'node:test';
import assert from 'node:assert/strict';
import { deleteMySupabasePost } from './supabaseApi.js';

test('post deletion removes owned Storage files before deleting database rows', async () => {
  const calls = [];
  const client = {
    auth: { getUser: async () => ({ data: { user: { id: 'owner' } }, error: null }) },
    rpc: async (name, args) => {
      calls.push([name, args]);
      return name === 'get_my_post_deletion_assets'
        ? { data: [{ storage_path: 'uploads/photo.jpg' }, { storage_path: 'uploads/clip.mp4' }], error: null }
        : { data: true, error: null };
    },
    storage: { from: (bucket) => ({ remove: async (paths) => {
      calls.push(['storage.remove', bucket, paths]);
      return { data: paths, error: null };
    } }) },
  };

  const result = await deleteMySupabasePost('post-a', client);
  assert.equal(result.error, undefined);
  assert.deepEqual(calls, [
    ['get_my_post_deletion_assets', { target_post_id: 'post-a' }],
    ['storage.remove', 'facs-media', ['uploads/photo.jpg', 'uploads/clip.mp4']],
    ['delete_my_post', { target_post_id: 'post-a' }],
  ]);
});

test('failed Storage removal never requests database deletion', async () => {
  const calls = [];
  const client = {
    auth: { getUser: async () => ({ data: { user: { id: 'owner' } }, error: null }) },
    rpc: async (name) => {
      calls.push(name);
      return { data: [{ storage_path: 'uploads/a' }], error: null };
    },
    storage: { from: () => ({ remove: async () => ({ data: null, error: { code: '500' } }) }) },
  };

  const result = await deleteMySupabasePost('post-a', client);
  assert.ok(result.error);
  assert.deepEqual(calls, ['get_my_post_deletion_assets']);
});

test('non-owner cannot reach Storage deletion', async () => {
  let storageCalled = false;
  const client = {
    auth: { getUser: async () => ({ data: { user: { id: 'other' } }, error: null }) },
    rpc: async () => ({ data: null, error: { code: '42501' } }),
    storage: { from: () => { storageCalled = true; return {}; } },
  };

  const result = await deleteMySupabasePost('post-a', client);
  assert.ok(result.error);
  assert.equal(storageCalled, false);
});

test('a post without media deletes without calling Storage', async () => {
  const calls = [];
  const client = {
    auth: { getUser: async () => ({ data: { user: { id: 'owner' } }, error: null }) },
    rpc: async (name) => {
      calls.push(name);
      return name === 'get_my_post_deletion_assets'
        ? { data: [], error: null }
        : { data: true, error: null };
    },
    storage: { from: () => { throw new Error('Storage must not be called'); } },
  };

  const result = await deleteMySupabasePost('post-a', client);
  assert.equal(result.error, undefined);
  assert.deepEqual(calls, ['get_my_post_deletion_assets', 'delete_my_post']);
});

test('database deletion failure is not reported as a successful deletion', async () => {
  const calls = [];
  const client = {
    auth: { getUser: async () => ({ data: { user: { id: 'owner' } }, error: null }) },
    rpc: async (name) => {
      calls.push(name);
      return name === 'get_my_post_deletion_assets'
        ? { data: [{ storage_path: 'uploads/photo.jpg' }], error: null }
        : { data: null, error: { code: '22023' } };
    },
    storage: { from: () => ({ remove: async () => {
      calls.push('storage.remove');
      return { data: [], error: null };
    } }) },
  };

  const result = await deleteMySupabasePost('post-a', client);
  assert.ok(result.error);
  assert.deepEqual(calls, ['get_my_post_deletion_assets', 'storage.remove', 'delete_my_post']);
});

test('a retry can finish database deletion after media was already removed', async () => {
  const calls = [];
  let mediaExists = true;
  let deleteAttempts = 0;
  const client = {
    auth: { getUser: async () => ({ data: { user: { id: 'owner' } }, error: null }) },
    rpc: async (name) => {
      calls.push(name);
      if (name === 'get_my_post_deletion_assets') {
        return { data: mediaExists ? [{ storage_path: 'uploads/photo.jpg' }] : [], error: null };
      }
      deleteAttempts += 1;
      return deleteAttempts === 1
        ? { data: null, error: { code: '503' } }
        : { data: true, error: null };
    },
    storage: { from: () => ({ remove: async () => {
      calls.push('storage.remove');
      mediaExists = false;
      return { data: [], error: null };
    } }) },
  };

  assert.ok((await deleteMySupabasePost('post-a', client)).error);
  assert.equal((await deleteMySupabasePost('post-a', client)).error, undefined);
  assert.deepEqual(calls, [
    'get_my_post_deletion_assets', 'storage.remove', 'delete_my_post',
    'get_my_post_deletion_assets', 'delete_my_post',
  ]);
});
