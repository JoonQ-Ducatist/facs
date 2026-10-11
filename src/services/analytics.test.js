import test from 'node:test';
import assert from 'node:assert/strict';
import { ANALYTICS_EVENT, getAnalyticsSnapshot, recordAnalyticsEvent, trackEvent } from './analytics.js';

const sessionId = '11111111-1111-4111-8111-111111111111';
const postId = '22222222-2222-4222-8222-222222222222';

test('server analytics sends only the allowed event, anonymous session, and optional post id', async () => {
  const calls = [];
  const recorded = await recordAnalyticsEvent(ANALYTICS_EVENT.FIRST_VOTE, {
    sessionId,
    postId,
    client: { rpc: async (name, args) => { calls.push({ name, args }); return { error: null }; } },
  });
  assert.equal(recorded, true);
  assert.deepEqual(calls, [{ name: 'record_analytics_event', args: {
    input_event_name: 'first_vote', input_session_id: sessionId, input_post_id: postId,
  } }]);
});

test('server analytics rejects unsupported names and non-UUID identifiers before an RPC', async () => {
  let called = false;
  const client = { rpc: async () => { called = true; return { error: null }; } };
  assert.equal(await recordAnalyticsEvent('share_requested', { sessionId, client }), false);
  assert.equal(await recordAnalyticsEvent(ANALYTICS_EVENT.VISITOR_OPENED, { sessionId: 'member-a', client }), false);
  assert.equal(called, false);
});

test('production browsers discard legacy local QA events without exposing detailed events', () => {
  const previousWindow = globalThis.window;
  const stored = new Map([['facs_analytics_v1', JSON.stringify([{ name: 'first_vote', properties: { postId } }])]]);
  const dispatched = [];
  globalThis.window = {
    location: { origin: 'https://www.factsmack.com', search: '' },
    localStorage: {
      getItem: (key) => stored.get(key) ?? null,
      setItem: (key, value) => stored.set(key, value),
      removeItem: (key) => stored.delete(key),
    },
    dispatchEvent: (event) => dispatched.push(event.type),
  };
  try {
    assert.deepEqual(getAnalyticsSnapshot(), []);
    assert.equal(stored.has('facs_analytics_v1'), false);
    trackEvent(ANALYTICS_EVENT.SHARE_REQUESTED, { postId });
    assert.equal(stored.has('facs_analytics_v1'), false);
    assert.deepEqual(dispatched, []);
  } finally {
    globalThis.window = previousWindow;
  }
});
