import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const retention = await readFile(new URL('./migrations/202610170001_moderation_retention_purge.sql', import.meta.url), 'utf8');
const moderation = await readFile(new URL('./migrations/202609240001_moderation_review_contract.sql', import.meta.url), 'utf8');
const contentDeletion = await readFile(new URL('./migrations/202610090003_hard_delete_member_content.sql', import.meta.url), 'utf8');

test('immutability exception is scoped to owner-run retention deletion, not client edits', () => {
  assert.match(moderation, /before update or delete on public\.moderation_actions/);
  assert.match(retention, /tg_op = 'DELETE'/);
  assert.match(retention, /session_user = 'postgres'/);
  assert.match(retention, /current_user = 'postgres'/);
  assert.match(retention, /current_setting\('facs\.moderation_retention_purge', true\) = 'on'/);
  assert.match(retention, /moderation actions are immutable/);
});

test('retention purge removes only terminal reports after one year and honors active holds', () => {
  assert.match(retention, /r\.status in \('resolved', 'dismissed'\)/);
  assert.match(retention, /h\.report_id is null or h\.released_at is not null/);
  assert.match(retention, /greatest\(r\.reviewed_at, coalesce\(h\.released_at, r\.reviewed_at\)\) <= now\(\) - interval '1 year'/);
  assert.match(retention, /delete from public\.moderation_actions where report_id = candidate\.id;\s*delete from public\.reports where id = candidate\.id/);
  assert.doesNotMatch(retention, /delete from public\.(posts|comments|media_assets|post_media)/);
});

test('purge is unavailable to members and leaves author content deletion intact', () => {
  assert.match(retention, /revoke all on function public\.purge_expired_moderation_reports\(integer\) from public, anon, authenticated, service_role/);
  assert.match(retention, /revoke all on table public\.moderation_retention_holds from public, anon, authenticated, service_role/);
  assert.match(contentDeletion, /delete from public\.posts p where p\.id = target_post_id/);
  assert.match(contentDeletion, /delete from public\.comments c where c\.id = target_comment_id/);
  assert.doesNotMatch(contentDeletion, /delete from public\.moderation_actions/);
});
