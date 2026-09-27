import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const sql = await readFile(new URL('./migrations/202609270003_weekly_valid_votes.sql', import.meta.url), 'utf8');

test('weekly valid-vote metric is staff-only, rolling seven-day, and count-only', () => {
  assert.match(sql, /create or replace function public\.get_weekly_valid_vote_count\(\)/i);
  assert.match(sql, /returns bigint/i);
  assert.match(sql, /security definer/i);
  assert.match(sql, /auth\.uid\(\) is null or not public\.current_member_is_staff\(\)/i);
  assert.match(sql, /v\.created_at\s*>=\s*now\(\)\s*-\s*interval\s+'7 days'/i);
  assert.match(sql, /join public\.posts p on p\.id = v\.post_id/i);
  assert.match(sql, /p\.status\s*=\s*'published'/i);
  assert.match(sql, /p\.author_id\s*<>\s*v\.voter_id/i);
  assert.match(sql, /revoke all on function public\.get_weekly_valid_vote_count\(\) from public, anon/i);
  assert.match(sql, /grant execute on function public\.get_weekly_valid_vote_count\(\) to authenticated/i);
  assert.doesNotMatch(sql, /returns table/i);
  assert.doesNotMatch(sql, /voter_id\s*,|post_id\s*,/i);
});
