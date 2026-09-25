import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const sql = await readFile(new URL('./migrations/202609250002_moderation_post_preview.sql', import.meta.url), 'utf8');

test('staff post preview is report-scoped and excludes reporter identity', () => {
  assert.match(sql, /create or replace function public\.get_moderation_post_preview\(target_report_id uuid\)/i);
  assert.match(sql, /not public\.current_member_is_staff\(\)/i);
  assert.match(sql, /p\.question[\s\S]*p\.category[\s\S]*author\.handle[\s\S]*p\.visibility/i);
  assert.match(sql, /staff_can_read_report_preview_object/i);
  assert.doesNotMatch(sql, /reporter_id uuid/);
});
