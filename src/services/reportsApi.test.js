import test from 'node:test';
import assert from 'node:assert/strict';
import { submitPostReport } from './reportsApi.js';

function client({ insertError = null } = {}) {
  const inserted = [];
  return {
    auth: { getUser: async () => ({ data: { user: { id: 'member-a' } }, error: null }) },
    from: () => ({ insert: async (row) => { inserted.push(row); return { error: insertError }; } }),
    inserted,
  };
}

test('post reports store only the reporter, post target, and approved reason', async () => {
  const fake = client();
  const result = await submitPostReport('post-a', 'harassment', { client: fake });
  assert.deepEqual(result, { data: { postId: 'post-a', reason: 'harassment' } });
  assert.deepEqual(fake.inserted, [{ reporter_id: 'member-a', target_type: 'post', target_id: 'post-a', reason: 'harassment' }]);
});

test('post reports distinguish a duplicate from a retryable failure', async () => {
  assert.deepEqual(await submitPostReport('post-a', 'spam', { client: client({ insertError: { code: '23505' } }) }), { error: 'ALREADY_REPORTED' });
  assert.deepEqual(await submitPostReport('post-a', 'spam', { client: client({ insertError: { code: '50000' } }) }), { error: 'UNAVAILABLE' });
});
