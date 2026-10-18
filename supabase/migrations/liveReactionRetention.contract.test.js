import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const sql = await readFile(new URL('./202610180001_live_reaction_retention.sql', import.meta.url), 'utf8');
const readGrant = await readFile(new URL('./202610180002_live_reaction_read_grant.sql', import.meta.url), 'utf8');

test('purge targets only expired live-reaction presentation rows', () => {
  assert.match(sql, /delete from public\.post_live_reaction_events\s+where created_at < now\(\) - interval '24 hours'/i);
  assert.doesNotMatch(sql, /delete from public\.(?:votes|posts|media|scraps)\b/i);
});

test('authorized post viewers can read 24-hour events without a prior vote', () => {
  assert.match(sql, /auth\.uid\(\) is not null and exists/);
  assert.match(sql, /public\.current_member_can_view_post\(p\.author_id, p\.status, p\.visibility\)/);
  assert.doesNotMatch(sql, /v\.voter_id = auth\.uid\(\)/);
  assert.match(sql, /created_at >= now\(\) - interval '24 hours'/);
  assert.match(sql, /for select to authenticated/);
});

test('authenticated viewers receive the table privilege needed to use the RLS read policy', () => {
  assert.match(readGrant, /revoke select on public\.post_live_reaction_events from anon;/i);
  assert.match(readGrant, /grant select on public\.post_live_reaction_events to authenticated;/i);
  assert.doesNotMatch(readGrant, /grant\s+(?:select|all)\s+on\s+public\.post_live_reaction_events\s+to\s+anon/i);
  assert.doesNotMatch(readGrant, /grant\s+(?:select|all)\s+on\s+public\.votes\b/i);
});

test('vote trigger emits only during the first 24 hours after publication', () => {
  assert.match(sql, /post_published_at < now\(\) - interval '24 hours'/);
  assert.match(sql, /insert into public\.post_live_reaction_events/);
});

test('browser roles cannot call the purge function', () => {
  assert.match(sql, /security invoker/i);
  assert.match(sql, /revoke all on function public\.purge_expired_post_live_reaction_events\(\)\s+from public, anon, authenticated, service_role/i);
});

test('one daily cron job invokes the same narrow purge function', () => {
  assert.match(sql, /'facs-purge-live-reactions',\s*'0 4 \* \* \*'/);
  assert.match(sql, /select public\.purge_expired_post_live_reaction_events\(\)/);
  assert.equal((sql.match(/select public\.purge_expired_post_live_reaction_events\(\)/g) ?? []).length, 1);
});
