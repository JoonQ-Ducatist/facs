import assert from 'node:assert/strict';
import test from 'node:test';
import { GET } from '../api/growth.js';

function mockMemberMetrics(t, { role = 'admin', rpcStatus = 200 } = {}) {
  const env = {
    VITE_SUPABASE_URL: 'https://members.example.test',
    VITE_SUPABASE_PUBLISHABLE_KEY: 'test-key',
    SUPABASE_SERVICE_ROLE_KEY: '',
  };
  const original = Object.fromEntries(Object.keys(env).map(key => [key, process.env[key]]));
  Object.assign(process.env, env);
  t.after(() => {
    for (const [key, value] of Object.entries(original)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  const windows = [];
  t.mock.method(globalThis, 'fetch', async (input, options) => {
    const url = new URL(input);
    assert.equal(url.origin, env.VITE_SUPABASE_URL);
    if (url.pathname === '/auth/v1/user') return Response.json({ id: 'member-id' });
    if (url.pathname === '/rest/v1/profiles') return Response.json({ role });
    assert.equal(url.pathname, '/rest/v1/rpc/get_growth_member_metrics');
    windows.push(JSON.parse(options.body).window_hours);
    return rpcStatus === 200
      ? Response.json({ new_members: 1, uploaders: 0, published_posts: 0, voters: 0, votes: 0 })
      : Response.json({ message: 'Query failed' }, { status: rpcStatus });
  });
  return windows;
}

function request(action) {
  return new Request(`https://www.factsmack.com/api/growth?action=${action}`, {
    headers: { authorization: 'Bearer mock-session' },
  });
}

test('admin requests use the existing RPC with the chosen 7- or 30-day window', async t => {
  const windows = mockMemberMetrics(t);
  for (const action of ['members-week', 'members']) {
    const response = await GET(request(action));
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      ok: true, data: { new_members: 1, uploaders: 0, published_posts: 0, voters: 0, votes: 0 },
    });
  }
  assert.deepEqual(windows, [168, 720]);
});

test('non-admin accounts cannot query the weekly aggregate', async t => {
  const windows = mockMemberMetrics(t, { role: 'member' });
  const response = await GET(request('members-week'));
  assert.equal(response.status, 403);
  assert.deepEqual(windows, []);
});

test('a weekly query failure returns unavailable instead of zero counts', async t => {
  const windows = mockMemberMetrics(t, { rpcStatus: 500 });
  const response = await GET(request('members-week'));
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { ok: false, code: 'UNAVAILABLE' });
  assert.deepEqual(windows, [168]);
});
