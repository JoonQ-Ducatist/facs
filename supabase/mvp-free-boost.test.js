import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const sql = await readFile(new URL('./migrations/202610110001_mvp_free_boost.sql', import.meta.url), 'utf8');
const statusSql = await readFile(new URL('./migrations/202610110002_post_boost_status_read_grant.sql', import.meta.url), 'utf8');
const pagedFeedSql = await readFile(new URL('./migrations/202610050004_paged_personalized_feed.sql', import.meta.url), 'utf8');

test('public MVP Boost has no publication-age window', () => {
  assert.doesNotMatch(sql, /interval\s+'1 hour'|boost window expired/i);
  assert.match(sql, /p\.status\s*=\s*'published'/i);
});

test('candidate discovery allows at most 10 non-author ratings', () => {
  assert.match(sql, /v\.voter_id\s*<>\s*p\.author_id/i);
  assert.match(sql, /having\s+count\(v\.id\)\s*<=\s*10/i);
});

test('Boost request revalidates the same 10-rating boundary', () => {
  assert.match(sql, /if\s+other_vote_count\s*>\s*10/i);
  assert.match(sql, /boost requires at most 10 ratings/i);
});

test('free MVP Boost remains owner-only and one request per post', () => {
  assert.match(sql, /post_author_id\s*<>\s*current_user_id/i);
  assert.match(sql, /insert into public\.post_boosts/i);
  assert.match(sql, /boost already requested/i);
  assert.doesNotMatch(sql, /insert into public\.(payments|orders)|price_|checkout/i);
});

test('active exposure status recovery remains scoped to the signed-in member', () => {
  assert.match(statusSql, /b\.requester_id\s*=\s*auth\.uid\(\)/i);
  assert.match(statusSql, /b\.status\s*=\s*'active'/i);
  assert.match(statusSql, /grant execute on function public\.get_my_active_boosted_post_ids\(integer\) to authenticated/i);
  assert.doesNotMatch(statusSql, /grant (insert|update|delete|all)/i);
});

test('active Boost ranks ahead of every normal feed signal for other members', () => {
  assert.match(pagedFeedSql, /p\.author_id\s*<>\s*auth\.uid\(\)/i);
  assert.match(pagedFeedSql, /order\s+by\s+boost_rank\s+asc,\s*follow_rank\s+asc/i);
});
