import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const sql = await readFile(new URL('./migrations/202610050001_mvp_operational_metrics.sql', import.meta.url), 'utf8');

test('operational metrics are aggregate-only and cover the existing MVP signals', () => {
  assert.match(sql, /returns table \([\s\S]*new_members bigint[\s\S]*open_reports bigint[\s\S]*unique_visitors bigint[\s\S]*results_viewed bigint/i);
  assert.match(sql, /count\(distinct session_id\)/i);
  assert.doesNotMatch(sql, /returns table \([\s\S]*(email|handle|reporter_id|session_id)\s/i);
});

test('the snapshot is admin-only and bounds the requested window', () => {
  assert.match(sql, /role = 'admin'/i);
  assert.match(sql, /errcode = '42501'.*admin access required/i);
  assert.match(sql, /least\(greatest\(coalesce\(window_hours, 24\), 1\), 168\)/i);
});

test('browser roles cannot read source rows through the metrics boundary', () => {
  assert.match(sql, /security definer/i);
  assert.match(sql, /revoke all on function public\.get_mvp_operational_metrics\(integer\) from public, anon/i);
  assert.match(sql, /grant execute on function public\.get_mvp_operational_metrics\(integer\) to authenticated/i);
});
