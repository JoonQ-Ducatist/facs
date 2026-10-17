import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const retention = await readFile(new URL('./migrations/202610170002_funnel_analytics_retention.sql', import.meta.url), 'utf8');
const funnel = await readFile(new URL('./migrations/202609270001_funnel_analytics.sql', import.meta.url), 'utf8');

test('daily purge removes only first-party events older than 30 days', () => {
  assert.match(retention, /delete from public\.funnel_analytics_events\s+where occurred_at < now\(\) - interval '30 days'/);
  assert.match(retention, /'facs-purge-funnel-analytics',\s*'0 3 \* \* \*'/);
  assert.doesNotMatch(retention, /delete from public\.(posts|media_assets|post_media|ratings|comments|reports|moderation_actions|profiles)/);
});

test('retention function is not callable by browser or service roles', () => {
  assert.match(retention, /security invoker/);
  assert.match(retention, /revoke all on function public\.purge_expired_funnel_analytics_events\(\)\s+from public, anon, authenticated, service_role/);
  assert.match(funnel, /grant execute on function public\.record_analytics_event\(text, uuid, uuid\) to anon, authenticated/);
});
