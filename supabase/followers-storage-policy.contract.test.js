import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), 'migrations');

test('followers Storage policy delegates non-owner visibility to the post helper', async () => {
  const sql = await readFile(resolve(root, '202609230001_followers_storage_reads.sql'), 'utf8');
  assert.match(sql, /create or replace function public\.can_read_member_media_metadata\(target_asset_id uuid\)/i);
  assert.match(sql, /revoke all on function public\.can_read_member_media_metadata\(uuid\) from public, anon, authenticated/i);
  assert.match(sql, /grant execute on function public\.can_read_member_media_metadata\(uuid\) to authenticated/i);
  assert.match(sql, /create or replace function public\.can_read_member_media_object\(object_name text\)/i);
  assert.match(sql, /returns boolean/i);
  assert.match(sql, /security definer/i);
  assert.match(sql, /set search_path = public/i);
  assert.match(sql, /revoke all on function public\.can_read_member_media_object\(text\) from public, anon, authenticated/i);
  assert.match(sql, /grant execute on function public\.can_read_member_media_object\(text\) to authenticated/i);
  assert.match(sql, /from public\.media_assets a[\s\S]*public\.post_media pm[\s\S]*public\.posts p/i);
  assert.match(sql, /public\.current_member_can_view_post\(p\.author_id, p\.status, p\.visibility\)/i);
  assert.match(sql, /drop policy if exists "owners or published viewers read media metadata" on public\.media_assets/i);
  assert.match(sql, /create policy "owners or permitted viewers read media metadata" on public\.media_assets/i);
  assert.match(sql, /using \(public\.can_read_member_media_metadata\(id\)\)/i);
  assert.match(sql, /drop policy if exists "facs media is readable with its post" on storage\.objects/i);
  assert.match(sql, /create policy "facs media is readable with its post" on storage\.objects/i);
  assert.match(sql, /for select to authenticated using/i);
  assert.match(sql, /public\.can_read_member_media_object\(name\)/i);
  assert.doesNotMatch(sql, /p\.visibility\s*=\s*'public'/i);
});
