import test from 'node:test';
import assert from 'node:assert/strict';
import { ensureLocalQaProfile, isLocalQaAccountMode, LOCAL_QA_ACCOUNTS } from './localQaAccounts.js';

test('local QA account mode requires a local browser, development, and an explicit query flag', () => {
  assert.equal(isLocalQaAccountMode('http://127.0.0.1:5173', '?qaAccounts=1', true), true);
  assert.equal(isLocalQaAccountMode('http://localhost:5173', '?qaAccounts=1', true), true);
  assert.equal(isLocalQaAccountMode('https://product-test-example.vercel.app', '?qaAccounts=1', true), false);
  assert.equal(isLocalQaAccountMode('http://127.0.0.1:5173', '', true), false);
  assert.equal(isLocalQaAccountMode('http://127.0.0.1:5173', '?qaAccounts=1', false), false);
});

test('local QA selector includes a moderator fixture without granting its browser role', () => {
  const moderator = LOCAL_QA_ACCOUNTS.find((account) => account.id === 'moderator');
  assert.deepEqual(moderator, {
    id: 'moderator', email: 'qa.moderator@local.facts.test', handle: 'qa_moderator', displayName: '현우', role: 'moderator',
  });
});

function qaProfileClient(initialHandle, role = 'member') {
  const profile = { id: 'qa-member', handle: initialHandle, display_name: '민아', role };
  const calls = [];
  const query = { select: () => query, eq: () => query, maybeSingle: async () => ({ data: { ...profile }, error: null }) };
  return {
    calls,
    from: () => query,
    rpc: async (name, args) => {
      calls.push({ name, args });
      profile.handle = args.input_handle;
      return { data: { ...profile }, error: null };
    },
  };
}

test('local QA uploader repairs a legacy placeholder handle before Upload can open', async () => {
  const client = qaProfileClient('member_abc123');
  const result = await ensureLocalQaProfile({ handle: 'qa_uploader' }, 'qa-member', client);
  assert.equal(result.ok, true);
  assert.equal(result.profile.handle, 'qa_uploader');
  assert.deepEqual(client.calls, [{ name: 'set_my_public_handle', args: { input_handle: 'qa_uploader' } }]);
});

test('local QA uploader keeps an existing configured handle without rewriting it', async () => {
  const client = qaProfileClient('qa_uploader');
  const result = await ensureLocalQaProfile({ handle: 'qa_uploader' }, 'qa-member', client);
  assert.equal(result.ok, true);
  assert.equal(result.profile.handle, 'qa_uploader');
  assert.equal(client.calls.length, 0);
});

test('local QA moderator preserves the server-returned role through account switching', async () => {
  const client = qaProfileClient('qa_moderator', 'moderator');
  const result = await ensureLocalQaProfile({ handle: 'qa_moderator' }, 'qa-member', client);
  assert.equal(result.ok, true);
  assert.equal(result.profile.role, 'moderator');
  assert.equal(client.calls.length, 0);
});
