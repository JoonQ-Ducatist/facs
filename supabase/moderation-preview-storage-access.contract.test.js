import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const sql = await readFile(new URL('./migrations/202609250003_restore_feed_media_signing.sql', import.meta.url), 'utf8');

test('report-preview object checks stay outside the public RPC schema', () => {
  assert.match(sql, /create schema if not exists facs_private/i);
  assert.match(sql, /facs_private\.staff_can_read_report_preview_object/i);
  assert.match(sql, /drop function if exists public\.staff_can_read_report_preview_object\(text\)/i);
  assert.doesNotMatch(sql, /grant execute on function public\.staff_can_read_report_preview_object/i);
  assert.doesNotMatch(sql, /grant execute[\s\S]*\bto\s+(?:anon|public)\b/i);
});
