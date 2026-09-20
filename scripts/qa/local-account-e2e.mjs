import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const url = process.env.FACS_LOCAL_SUPABASE_URL;
const key = process.env.FACS_LOCAL_SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) throw new Error('FACS_LOCAL_SUPABASE_URL and FACS_LOCAL_SUPABASE_PUBLISHABLE_KEY are required.');

const host = new URL(url).hostname;
if (!['127.0.0.1', 'localhost'].includes(host)) throw new Error('Local account E2E only permits a local Supabase URL.');

const suffix = randomUUID().slice(0, 8);
const password = `facs-local-e2e-${suffix}-only`;

async function createMember(label) {
  const email = `e2e.${label}.${suffix}@local.facts.test`;
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const signedUp = await client.auth.signUp({ email, password });
  if (signedUp.error) throw signedUp.error;
  if (!signedUp.data.session) {
    const signedIn = await client.auth.signInWithPassword({ email, password });
    if (signedIn.error) throw signedIn.error;
  }
  const { data: identity, error: identityError } = await client.auth.getUser();
  if (identityError || !identity.user) throw identityError ?? new Error('Local member session is missing.');
  const handle = `e2e_${label}_${suffix}`;
  const { error: handleError } = await client.rpc('set_my_public_handle', { input_handle: handle });
  if (handleError) throw handleError;
  return { client, user: identity.user, handle };
}

const uploader = await createMember('uploader');
const evaluator = await createMember('evaluator');
const image = new Blob([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])], { type: 'image/png' });

const { data: prepared, error: prepareError } = await uploader.client.rpc('create_post_upload_with_visibility', {
  input_category: 'outfit',
  input_evaluation: 'binary',
  input_question: '로컬 A/B E2E 평가 확인',
  input_age_min: null,
  input_age_max: null,
  input_media: [{ type: 'image', mimeType: 'image/png', byteSize: image.size, durationMs: null }],
  input_visibility: 'public',
});
if (prepareError || !prepared?.length) throw prepareError ?? new Error('Upload preparation returned no target.');

const target = prepared[0];
const { error: storageError } = await uploader.client.storage.from('facs-media').upload(target.storage_path, image, { contentType: 'image/png', upsert: false });
if (storageError) throw storageError;

const { data: post, error: publishError } = await uploader.client.rpc('publish_post_upload', { target_post_id: target.post_id });
if (publishError || !post?.published_at) throw publishError ?? new Error('Published post is missing a server timestamp.');

const { data: visiblePost, error: visibilityError } = await evaluator.client.from('posts').select('id,published_at').eq('id', post.id).single();
if (visibilityError) throw visibilityError;
assert.equal(visiblePost.id, post.id, 'Evaluator cannot see uploader public post.');

const { error: voteError } = await evaluator.client.from('votes').insert({ post_id: post.id, voter_id: evaluator.user.id, choice: 'yes' });
if (voteError) throw voteError;

const { data: aggregates, error: aggregateError } = await uploader.client.rpc('get_published_post_aggregates', { target_post_ids: [post.id] });
if (aggregateError) throw aggregateError;
assert.equal(Number(aggregates?.[0]?.yes_count), 1, 'Uploader did not receive evaluator aggregate.');

console.log(JSON.stringify({ ok: true, postId: post.id, publishedAt: post.published_at, uploader: uploader.handle, evaluator: evaluator.handle }));
