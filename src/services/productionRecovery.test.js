import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { listSupabasePublishedFeedCards, listSupabaseMyPublishedProfileCards } from './supabaseApi.js';

function recoveryClient({ allMissing = false } = {}) {
  const posts = ['missing', 'healthy'].map((id) => ({
    id, author_id: 'owner', category: 'outfit', evaluation: 'binary', question: id,
    profiles: { handle: 'owner' }, published_at: '2026-10-18T00:00:00Z',
    post_media: [{ position: 0, media_assets: { id: `asset-${id}`, storage_path: id, media_type: 'image' } }],
  }));
  const query = { select: () => query, eq: () => query, in: async () => ({ data: posts, error: null }) };
  const comments = { select: () => comments, in: () => comments, eq: () => comments, order: async () => ({ data: [], error: null }) };
  return {
    auth: { getUser: async () => ({ data: { user: { id: 'owner' } }, error: null }) },
    rpc: async (name) => ({ data: name === 'get_published_post_aggregates' ? [] : posts.map(({ id }) => ({ post_id: id })), error: null }),
    from: (table) => table === 'comments' ? comments : query,
    storage: { from: () => ({ createSignedUrl: async (path) => path === 'missing' || allMissing
      ? { data: null, error: { status: 404, message: 'Object not found' } }
      : { data: { signedUrl: 'https://signed.example/healthy.jpg' }, error: null } }) },
  };
}

test('production recovery keeps missing-media posts and healthy feed cards readable', async () => {
  const result = await listSupabasePublishedFeedCards({ client: recoveryClient() });
  assert.equal(result.error, undefined);
  assert.deepEqual(result.data.map(({ id }) => id), ['missing', 'healthy']);
  assert.equal(result.data[0].media[0].unavailable, true);
  assert.match(result.data[0].imageUrl, /media-unavailable\.svg$/);
  assert.equal(result.data[1].imageUrl, 'https://signed.example/healthy.jpg');
  assert.equal(result.data[0].yesVotes, 0);
});

test('production recovery preserves owner profile deletion targets when all media is missing', async () => {
  const result = await listSupabaseMyPublishedProfileCards({ client: recoveryClient({ allMissing: true }) });
  assert.equal(result.error, undefined);
  assert.equal(result.data.length, 2);
  assert.ok(result.data.every((card) => card.isMyUpload && card.authorId === 'owner' && card.media[0].unavailable));
});

test('production recovery removes only post-linked analytics on deletion without weakening event deduplication', async () => {
  const sql = await readFile(new URL('../../supabase/migrations/202610180003_post_analytics_delete_cascade.sql', import.meta.url), 'utf8');
  assert.match(sql, /foreign key \(post_id\) references public\.posts\(id\) on delete cascade/i);
  assert.doesNotMatch(sql, /delete from|drop index|disable.*trigger|grant/i);
});

test('public branding policy links open existing policies without changing their approved content', async () => {
  const app = await readFile(new URL('../App.jsx', import.meta.url), 'utf8');
  assert.match(app, /const \[policyOpen, setPolicyOpen\] = useState\(\(\) => \{\s*const policy = new URLSearchParams\(window.location.search\).get\('policy'\);\s*return \['privacy', 'terms', 'safety'\].includes\(policy\) \? policy : null;/);
});
