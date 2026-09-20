import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';

const url = process.env.FACS_LOCAL_SUPABASE_URL;
const key = process.env.FACS_LOCAL_SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) throw new Error('FACS_LOCAL_SUPABASE_URL and FACS_LOCAL_SUPABASE_PUBLISHABLE_KEY are required.');

const host = new URL(url).hostname;
if (!['127.0.0.1', 'localhost'].includes(host)) throw new Error('Local account E2E only permits a local Supabase URL.');

const suffix = randomUUID().slice(0, 8);
const password = `facs-local-e2e-${suffix}-only`;

const E2E_CLEANUP_SQL = "begin; with e2e_members as (select id from auth.users where email like 'e2e.%@local.facts.test'), e2e_posts as (select id from public.posts where author_id in (select id from e2e_members)) delete from public.reports where reporter_id in (select id from e2e_members) or target_id in (select id from e2e_posts); with e2e_members as (select id from auth.users where email like 'e2e.%@local.facts.test'), e2e_posts as (select id from public.posts where author_id in (select id from e2e_members)) delete from public.votes where voter_id in (select id from e2e_members) or post_id in (select id from e2e_posts); with e2e_members as (select id from auth.users where email like 'e2e.%@local.facts.test'), e2e_posts as (select id from public.posts where author_id in (select id from e2e_members)) delete from public.scraps where user_id in (select id from e2e_members) or post_id in (select id from e2e_posts); with e2e_members as (select id from auth.users where email like 'e2e.%@local.facts.test'), e2e_posts as (select id from public.posts where author_id in (select id from e2e_members)) delete from public.post_live_reaction_events where post_id in (select id from e2e_posts); with e2e_members as (select id from auth.users where email like 'e2e.%@local.facts.test'), e2e_posts as (select id from public.posts where author_id in (select id from e2e_members)) delete from public.post_boosts where requester_id in (select id from e2e_members) or post_id in (select id from e2e_posts); with e2e_members as (select id from auth.users where email like 'e2e.%@local.facts.test') delete from public.blocks where blocker_id in (select id from e2e_members) or blocked_id in (select id from e2e_members); with e2e_members as (select id from auth.users where email like 'e2e.%@local.facts.test') delete from public.follows where follower_id in (select id from e2e_members) or followed_id in (select id from e2e_members); with e2e_members as (select id from auth.users where email like 'e2e.%@local.facts.test') delete from public.post_media where post_id in (select id from public.posts where author_id in (select id from e2e_members)); with e2e_members as (select id from auth.users where email like 'e2e.%@local.facts.test') delete from public.post_private_details where post_id in (select id from public.posts where author_id in (select id from e2e_members)); with e2e_members as (select id from auth.users where email like 'e2e.%@local.facts.test') delete from public.posts where author_id in (select id from e2e_members); with e2e_members as (select id from auth.users where email like 'e2e.%@local.facts.test') delete from public.media_assets where owner_id in (select id from e2e_members); delete from public.profiles where id in (select id from auth.users where email like 'e2e.%@local.facts.test'); delete from auth.users where email like 'e2e.%@local.facts.test'; commit;";

function clearLocalE2eFixtures() {
  execFileSync('docker', ['exec', 'supabase_db_facs', 'psql', '-U', 'postgres', '-v', 'ON_ERROR_STOP=1', '-c', E2E_CLEANUP_SQL], { stdio: 'pipe' });
}

clearLocalE2eFixtures();

async function personalizedFeedPostIds(client) {
  const { data, error } = await client.rpc('get_personalized_feed_post_ids', {
    page_size: 20,
    category_filter: null,
  });
  if (error) throw error;
  return new Set((data ?? []).map((item) => item.post_id).filter(Boolean));
}

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
  const handle = `e2${label[0]}_${suffix}`;
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
const publicFeedIds = await personalizedFeedPostIds(evaluator.client);
assert(publicFeedIds.has(post.id), 'Evaluator feed RPC does not include uploader public post.');

const { data: followerPrepared, error: followerPrepareError } = await uploader.client.rpc('create_post_upload_with_visibility', {
  input_category: 'outfit',
  input_evaluation: 'binary',
  input_question: '팔로워 전용 공개 범위 확인',
  input_age_min: null,
  input_age_max: null,
  input_media: [{ type: 'image', mimeType: 'image/png', byteSize: image.size, durationMs: null }],
  input_visibility: 'followers',
});
if (followerPrepareError || !followerPrepared?.length) throw followerPrepareError ?? new Error('Follower-only upload preparation returned no target.');
const followerTarget = followerPrepared[0];
const { error: followerStorageError } = await uploader.client.storage.from('facs-media').upload(followerTarget.storage_path, image, { contentType: 'image/png', upsert: false });
if (followerStorageError) throw followerStorageError;
const { data: followerPost, error: followerPublishError } = await uploader.client.rpc('publish_post_upload', { target_post_id: followerTarget.post_id });
if (followerPublishError || !followerPost?.id) throw followerPublishError ?? new Error('Follower-only post did not publish.');

const beforeFollow = await evaluator.client.from('posts').select('id').eq('id', followerPost.id).maybeSingle();
if (beforeFollow.error) throw beforeFollow.error;
assert.equal(beforeFollow.data, null, 'Follower-only post is visible before following.');
const beforeFollowFeedIds = await personalizedFeedPostIds(evaluator.client);
assert(!beforeFollowFeedIds.has(followerPost.id), 'Follower-only post appears in the evaluator feed before following.');
const { error: followError } = await evaluator.client.from('follows').insert({ follower_id: evaluator.user.id, followed_id: uploader.user.id });
if (followError) throw followError;
const afterFollow = await evaluator.client.from('posts').select('id').eq('id', followerPost.id).maybeSingle();
if (afterFollow.error) throw afterFollow.error;
assert.equal(afterFollow.data?.id, followerPost.id, 'Follower-only post is hidden after following.');
const afterFollowFeedIds = await personalizedFeedPostIds(evaluator.client);
assert(afterFollowFeedIds.has(followerPost.id), 'Follower-only post is absent from the evaluator feed after following.');
const { error: unfollowError } = await evaluator.client.from('follows').delete().eq('follower_id', evaluator.user.id).eq('followed_id', uploader.user.id);
if (unfollowError) throw unfollowError;
const afterUnfollow = await evaluator.client.from('posts').select('id').eq('id', followerPost.id).maybeSingle();
if (afterUnfollow.error) throw afterUnfollow.error;
assert.equal(afterUnfollow.data, null, 'Follower-only post remains visible after unfollowing.');
const afterUnfollowFeedIds = await personalizedFeedPostIds(evaluator.client);
assert(!afterUnfollowFeedIds.has(followerPost.id), 'Follower-only post remains in the evaluator feed after unfollowing.');

const { error: voteError } = await evaluator.client.from('votes').insert({ post_id: post.id, voter_id: evaluator.user.id, choice: 'yes' });
if (voteError) throw voteError;

const { data: aggregates, error: aggregateError } = await uploader.client.rpc('get_published_post_aggregates', { target_post_ids: [post.id] });
if (aggregateError) throw aggregateError;
assert.equal(Number(aggregates?.[0]?.yes_count), 1, 'Uploader did not receive evaluator aggregate.');

const { error: reportError } = await evaluator.client.from('reports').insert({
  reporter_id: evaluator.user.id,
  target_type: 'post',
  target_id: post.id,
  reason: 'spam',
});
if (reportError) throw reportError;

const { data: reports, error: reportReadError } = await evaluator.client.from('reports').select('target_id,reason').eq('target_id', post.id);
if (reportReadError) throw reportReadError;
assert.deepEqual(reports, [{ target_id: post.id, reason: 'spam' }], 'Evaluator cannot read their own private report.');

const { error: blockError } = await evaluator.client.from('blocks').insert({ blocker_id: evaluator.user.id, blocked_id: uploader.user.id });
if (blockError) throw blockError;

const { data: hiddenPost, error: hiddenPostError } = await evaluator.client.from('posts').select('id').eq('id', post.id).maybeSingle();
if (hiddenPostError) throw hiddenPostError;
assert.equal(hiddenPost, null, 'A blocked author remains visible to the blocker.');
const blockedFeedIds = await personalizedFeedPostIds(evaluator.client);
assert(!blockedFeedIds.has(post.id), 'A blocked author remains in the evaluator feed.');

console.log(JSON.stringify({ ok: true, postId: post.id, publishedAt: post.published_at, uploader: uploader.handle, evaluator: evaluator.handle, followersOnly: true, reportAccepted: true, blockHidden: true }));
clearLocalE2eFixtures();
