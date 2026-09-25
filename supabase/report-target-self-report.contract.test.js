import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const sql = await readFile(new URL('./migrations/202609250001_reject_self_post_reports.sql', import.meta.url), 'utf8');

test('report target trigger rejects an author\'s own post', () => {
  assert.match(sql, /p\.author_id\s*<>\s*new\.reporter_id/i);
  assert.match(sql, /public\.current_member_can_view_post\(p\.author_id, p\.status, p\.visibility\)/i);
  assert.match(sql, /raise exception 'report target is not available to this member'/i);
});
