import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const sql = await readFile(new URL('./migrations/202609240001_moderation_review_contract.sql', import.meta.url), 'utf8');

test('moderation migration makes audit rows immutable and routes report updates through RPC', () => {
  assert.match(sql, /create table public\.moderation_actions/i);
  assert.match(sql, /before update or delete on public\.moderation_actions/i);
  assert.match(sql, /drop policy if exists "staff review reports"/i);
  assert.match(sql, /revoke update on table public\.reports from authenticated/i);
  assert.match(sql, /create or replace function public\.review_report/i);
  assert.match(sql, /existing_report\.status = 'received' and next_status = 'triaged'/i);
  assert.match(sql, /existing_report\.status = 'triaged' and next_status in \('resolved', 'dismissed'\)/i);
  assert.match(sql, /insert into public\.moderation_actions/i);
});

test('moderation migration exposes a staff-checked queue without exposing audit tables', () => {
  assert.match(sql, /create or replace function public\.get_moderation_report_queue/i);
  assert.match(sql, /not public\.current_member_is_staff\(\)/i);
  assert.match(sql, /revoke all on table public\.moderation_actions from public, anon, authenticated/i);
  assert.match(sql, /grant execute on function public\.get_moderation_report_queue\(public\.report_status, integer\) to authenticated/i);
});
