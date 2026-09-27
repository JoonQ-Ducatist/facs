import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const sql = await readFile(new URL('./migrations/202609270002_report_status_guard.sql', import.meta.url), 'utf8');

test('ordinary members cannot read or mutate reports directly', () => {
  assert.match(sql, /drop policy if exists "members read own reports"/i);
  assert.match(sql, /drop policy if exists "members submit own reports"/i);
  assert.match(sql, /revoke all on table public\.reports from public, anon, authenticated/i);
  assert.match(sql, /insert into public\.reports \(reporter_id, target_type, target_id, reason\)/i);
  assert.doesNotMatch(sql, /input_status|input_reviewed_by|input_reviewed_at/i);
});

test('report status audit returns reason and timestamps only through a staff-gated RPC', () => {
  assert.match(sql, /create or replace function public\.get_moderation_report_audit\(target_report_id uuid\)/i);
  assert.match(sql, /not public\.current_member_is_staff\(\)/i);
  assert.match(sql, /r\.reason,[\s\S]*?r\.status,[\s\S]*?r\.created_at,[\s\S]*?r\.reviewed_at/i);
  assert.match(sql, /left join public\.moderation_actions/i);
  assert.match(sql, /revoke all on function public\.get_moderation_report_audit\(uuid\) from public, anon/i);
  assert.match(sql, /grant execute on function public\.get_moderation_report_audit\(uuid\) to authenticated/i);
});
