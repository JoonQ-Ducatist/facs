import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import test from 'node:test';
import { gaOverview } from './growthIntegrations.js';

const ratingEvents = [
  'rating_feed_viewed', 'rating_prompt_started', 'rating_vote_saved',
  'rating_skipped', 'rating_returned', 'rating_session_completed',
];

test('GA4 report requests all six rating events without dropping the existing metrics', async () => {
  const { privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    publicKeyEncoding: { type: 'spki', format: 'pem' },
  });
  const env = {
    GA4_PROPERTY_ID: '123',
    GOOGLE_ANALYTICS_SERVICE_ACCOUNT_JSON: JSON.stringify({
      client_email: 'reader@example.test', private_key: privateKey,
    }),
  };
  let saved;
  const service = { from: () => ({
    select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }),
    upsert: async row => { saved = row.payload; return {}; },
  }) };
  const report = await gaOverview(service, env, async (url, options) => {
    if (url === 'https://oauth2.googleapis.com/token') {
      return { ok: true, json: async () => ({ access_token: 'test-token' }) };
    }
    const query = JSON.parse(options.body);
    const names = query.dimensionFilter.filter.inListFilter.values;
    assert.deepEqual(query.dateRanges, [{ startDate: '7daysAgo', endDate: 'yesterday' }]);
    for (const event of [...ratingEvents, 'upload_completed', 'authenticated_entry']) {
      assert.ok(names.includes(event), event);
    }
    assert.ok(query.limit >= names.length);
    return { ok: true, json: async () => ({ rows: [{
      dimensionValues: [{ value: 'rating_skipped' }],
      metricValues: [{ value: '3' }, { value: '0' }],
    }] }) };
  });
  assert.deepEqual(report.events, [{ name: 'rating_skipped', count: 3, keyEvents: 0 }]);
  assert.deepEqual(saved.events, report.events);
});

test('GA4 report reuses the expanded report cache without contacting Google', async () => {
  const payload = { events: [{ name: 'rating_returned', count: 1, keyEvents: 0 }] };
  const service = { from: () => ({ select: () => ({ eq: (_column, key) => {
    assert.equal(key, 'ga4-overview-v2');
    return { maybeSingle: async () => ({ data: {
      payload, expires_at: new Date(Date.now() + 60_000).toISOString(),
    } }) };
  } }) }) };
  const report = await gaOverview(service, {}, () => assert.fail('cache hit contacted Google'));
  assert.deepEqual(report, { ...payload, cached: true });
});
