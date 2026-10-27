import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { ANALYTICS_EVENT, recordAnalyticsEvent } from './analytics.js';

const sessionId = '11111111-1111-4111-8111-111111111111';

test('upload activation milestones use the bounded anonymous analytics RPC', async () => {
  const calls = [];
  const client = { rpc: async (name, args) => { calls.push({ name, args }); return { error: null }; } };
  for (const name of [ANALYTICS_EVENT.UPLOAD_OPENED, ANALYTICS_EVENT.MEDIA_SELECTED, ANALYTICS_EVENT.PUBLISH_ATTEMPTED]) {
    assert.equal(await recordAnalyticsEvent(name, { sessionId, client }), true);
  }
  assert.deepEqual(calls.map(({ name, args }) => [name, args.input_event_name, args.input_session_id, args.input_post_id]), [
    ['record_analytics_event', 'upload_opened', sessionId, null],
    ['record_analytics_event', 'media_selected', sessionId, null],
    ['record_analytics_event', 'publish_attempted', sessionId, null],
  ]);
});

test('upload activation migration keeps telemetry bounded and aggregate-only', async () => {
  const sql = await readFile(new URL('../../supabase/migrations/202610270001_upload_activation_funnel.sql', import.meta.url), 'utf8');
  for (const event of ['upload_opened', 'media_selected', 'publish_attempted']) assert.match(sql, new RegExp(`'${event}'`));
  assert.match(sql, /count\(distinct session_id\)/);
  assert.match(sql, /grant execute on function public\.record_analytics_event/);
  assert.match(sql, /grant execute on function public\.get_mvp_operational_metrics\(integer\) to authenticated/);
  assert.doesNotMatch(sql, /input_email|input_file_name|input_media_url|input_question_text|input_user_id/);
});

test('activation UI remains advisory and preserves publish and permanent-delete language', async () => {
  const upload = await readFile(new URL('../features/upload/UploadView.jsx', import.meta.url), 'utf8');
  const feed = await readFile(new URL('../features/feed/FeedView.jsx', import.meta.url), 'utf8');
  assert.match(upload, /Nothing is posted until you tap Upload/);
  assert.match(upload, /permanently delete your post anytime/);
  assert.match(upload, /onSubmit\(/);
  assert.match(feed, /non-blocking prompt/);
  assert.doesNotMatch(feed, /disabled=\{showParticipationPrompt/);
});
