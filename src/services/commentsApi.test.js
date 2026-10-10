import test from 'node:test';
import assert from 'node:assert/strict';
import { createSupabasePostComment, deleteSupabasePostComment, editSupabasePostComment, listSupabasePostComments } from './supabaseApi.js';

test('comment reads and writes use only the intended RPC contracts', async () => {
  const calls = [];
  const client = {
    auth: { getUser: async () => ({ data: { user: { id: 'member-a' } }, error: null }) },
    rpc: async (name, args) => {
      calls.push({ name, args });
      if (name === 'list_post_comments') return { data: [{ id: 'comment-a', author_id: 'member-b', author_handle: 'other', body: 'Hi', created_at: '2026-10-03T00:00:00Z', updated_at: '2026-10-03T00:00:00Z', edited_at: null }], error: null };
      return { data: [{ id: 'comment-b', author_id: 'member-a', author_handle: 'me', body: 'Hello', created_at: '2026-10-03T00:01:00Z', updated_at: '2026-10-03T00:01:00Z', edited_at: null }], error: null };
    },
  };
  const listed = await listSupabasePostComments('post-a', { client });
  const created = await createSupabasePostComment('post-a', ' Hello ', client);
  assert.equal(listed.data[0].author, 'other');
  assert.equal(created.data.body, 'Hello');
  assert.deepEqual(calls, [
    { name: 'list_post_comments', args: { target_post_id: 'post-a', page_size: 50, before_created_at: null } },
    { name: 'create_post_comment', args: { target_post_id: 'post-a', input_body: 'Hello' } },
  ]);
});

test('comment owners edit and permanently delete through owner-only RPCs', async () => {
  const calls = [];
  const client = {
    auth: { getUser: async () => ({ data: { user: { id: 'member-a' } }, error: null }) },
    rpc: async (name, args) => {
      calls.push({ name, args });
      return name === 'edit_own_comment'
        ? { data: [{ id: 'comment-a', body: 'Updated', updated_at: '2026-10-03T00:02:00Z', edited_at: '2026-10-03T00:02:00Z' }], error: null }
        : { data: null, error: null };
    },
  };
  const edited = await editSupabasePostComment('comment-a', ' Updated ', client);
  const deleted = await deleteSupabasePostComment('comment-a', client);
  assert.equal(edited.data.body, 'Updated');
  assert.equal(deleted.error, undefined);
  assert.deepEqual(calls, [
    { name: 'edit_own_comment', args: { target_comment_id: 'comment-a', input_body: 'Updated' } },
    { name: 'delete_own_comment', args: { target_comment_id: 'comment-a' } },
  ]);
});
