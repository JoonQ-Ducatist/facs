import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), 'migrations');

test('guest featured photos are public images ranked by aggregate participation without user data', async () => {
  const sql = await readFile(resolve(root, '202609220002_auth_featured_public_photos.sql'), 'utf8');
  assert.match(sql, /create or replace function public\.get_auth_featured_public_photos/i);
  assert.match(sql, /post\.status\s*=\s*'published'/i);
  assert.match(sql, /post\.visibility\s*=\s*'public'/i);
  assert.match(sql, /asset\.media_type\s*=\s*'image'/i);
  assert.match(sql, /count\(vote\.id\)::bigint as participation_count/i);
  assert.match(sql, /order by participation_count desc/i);
  assert.match(sql, /order by random\(\)/i);
  assert.match(sql, /grant execute on function public\.get_auth_featured_public_photos\(integer, integer\) to anon, authenticated/i);
  const functionBody = sql.match(/returns table \([\s\S]*?\)\s+language sql[\s\S]*?as \$\$([\s\S]*?)\$\$;/i)?.[1] ?? '';
  assert.doesNotMatch(functionBody, /profiles|email|voter_id/i);
  assert.doesNotMatch(sql.match(/returns table \(([\s\S]*?)\)\s+language sql/i)?.[1] ?? '', /asset_id/i);
});

test('the media bucket stays private and anonymous access is limited to published public image objects', async () => {
  const sql = await readFile(resolve(root, '202609220002_auth_featured_public_photos.sql'), 'utf8');
  assert.match(sql, /create or replace function public\.can_read_public_media_object\(object_name text\)/i);
  assert.match(sql, /security definer/i);
  assert.match(sql, /grant execute on function public\.can_read_public_media_object\(text\) to anon/i);
  assert.match(sql, /create policy "anonymous visitors read published public media" on storage\.objects/i);
  assert.match(sql, /for select to anon/i);
  assert.match(sql, /bucket_id\s*=\s*'facs-media'/i);
  assert.match(sql, /public\.can_read_public_media_object\(name\)/i);
  assert.match(sql, /asset\.state\s*=\s*'ready'/i);
  assert.match(sql, /asset\.media_type\s*=\s*'image'/i);
  assert.doesNotMatch(sql, /update|insert|delete/i);
});
