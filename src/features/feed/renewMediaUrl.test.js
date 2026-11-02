import test from 'node:test';
import assert from 'node:assert/strict';
import { renewMediaUrl } from './renewMediaUrl.js';

test('refresh signs only the failed asset using the existing private bucket', async () => {
  const calls = [];
  const client = { storage: { from(bucket) { return { async createSignedUrl(path, ttl) { calls.push({ bucket, path, ttl }); return { data: { signedUrl: 'https://example.test/renewed' } }; } }; } } };
  assert.equal(await renewMediaUrl('member/post/photo.jpg', client), 'https://example.test/renewed');
  assert.deepEqual(calls, [{ bucket: 'facs-media', path: 'member/post/photo.jpg', ttl: 3600 }]);
});

test('denial, network failure and missing paths stay unavailable without bypass or retry loop', async () => {
  const denied = { storage: { from: () => ({ createSignedUrl: async () => ({ error: { status: 403 } }) }) } };
  const offline = { storage: { from: () => ({ createSignedUrl: async () => { throw new Error('offline'); } }) } };
  assert.equal(await renewMediaUrl('member/photo.jpg', denied), null);
  assert.equal(await renewMediaUrl('member/photo.jpg', offline), null);
  assert.equal(await renewMediaUrl('', { storage: { from: () => { throw new Error('must not request'); } } }), null);
});
