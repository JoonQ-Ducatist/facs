import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const sql = await readFile(new URL('./202611020001_persistent_bounded_live_reactions.sql', import.meta.url), 'utf8');
const readGrant = await readFile(new URL('./202610180002_live_reaction_read_grant.sql', import.meta.url), 'utf8');

test('visible members receive only the latest 12 anonymous reactions without a time window or browser write access', () => {
  assert.match(sql, /create policy "members read visible-post live reactions"[\s\S]*public\.can_view_post_live_reactions\(post_id\)/i);
  assert.doesNotMatch(sql, /created_at\s*>?=?.*interval '24 hours'/i);
  assert.match(sql, /insert into public\.post_live_reaction_events/i);
  assert.match(sql, /order by old_event\.created_at desc, old_event\.id desc\s+offset 12/i);
  assert.match(sql, /cron\.unschedule\(jobid\)[\s\S]*facs-purge-live-reactions/i);
  assert.match(sql, /drop function if exists public\.purge_expired_post_live_reaction_events\(\)/i);
  assert.doesNotMatch(sql, /delete from public\.(?:votes|posts|media|scraps)\b/i);
  assert.match(readGrant, /revoke select on public\.post_live_reaction_events from anon;/i);
  assert.match(readGrant, /grant select on public\.post_live_reaction_events to authenticated;/i);
  assert.doesNotMatch(readGrant, /grant\s+(?:select|all)\s+on\s+public\.post_live_reaction_events\s+to\s+anon/i);
  assert.doesNotMatch(readGrant, /grant\s+(?:select|all)\s+on\s+public\.votes\b/i);
});
