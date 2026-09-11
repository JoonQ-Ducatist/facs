import assert from 'node:assert/strict';
import test from 'node:test';
import { getFollowTargetKey } from './followsApi.js';

test('real account IDs stay server-backed while sample authors receive a device-only key', () => {
  const accountId = '3f1df227-c017-4c9f-8f2e-3afb9ad8b2bf';
  assert.equal(getFollowTargetKey(accountId, 'ignored'), accountId);
  assert.equal(getFollowTargetKey(undefined, 'Today_Sora'), 'sample:today_sora');
});
