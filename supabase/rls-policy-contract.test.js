import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), 'migrations');

async function migration(name) {
  return readFile(resolve(root, name), 'utf8');
}

test('profile visibility policy cannot expose blocked members', async () => {
  const sql = await migration('202609110006_block_relationship_cleanup.sql');
  assert.match(sql, /drop policy if exists "public profiles expose only signed-in members"/i);
  assert.match(sql, /create policy "members read unblocked profiles"/i);
  assert.match(sql, /id = auth\.uid\(\) or not public\.members_are_blocked\(id, auth\.uid\(\)\)/i);
});

test('authenticated profile reads have both table privilege and RLS coverage', async () => {
  const sql = await migration('202609140001_profile_read_grant.sql');
  assert.match(sql, /grant select on table public\.profiles to authenticated/i);
  assert.match(sql, /create or replace function public\.can_read_profile\(target_profile uuid\)/i);
  assert.match(sql, /grant execute on function public\.can_read_profile\(uuid\) to authenticated/i);
  assert.match(sql, /using \(public\.can_read_profile\(id\)\)/i);
});

test('post access is centralized through the block-aware visibility helper', async () => {
  const sql = await migration('202609110005_follows_and_personalized_feed.sql');
  assert.match(sql, /create or replace function public\.current_member_can_view_post/i);
  assert.match(sql, /not public\.members_are_blocked\(target_author_id, auth\.uid\(\)\)/i);
  assert.match(sql, /create policy "members read permitted posts" on public\.posts/i);
  assert.match(sql, /using \(public\.current_member_can_view_post\(author_id, status, visibility\)\)/i);
});

test('private media and scraps remain owner-scoped', async () => {
  const mediaSql = await migration('202609100002_media_uploads.sql');
  const scrapSql = await migration('202609100004_scraps.sql');
  assert.match(mediaSql, /owner_id = auth\.uid\(\)/i);
  assert.match(mediaSql, /facs owners remove pending media/i);
  assert.match(scrapSql, /user_id = auth\.uid\(\)/i);
  assert.match(scrapSql, /members remove own scraps/i);
});

test('profile library migration uses a server-clock handle cooldown and deterministic private lists', async () => {
  const sql = await migration('202609160001_profile_library_contracts.sql');
  assert.match(sql, /add column if not exists handle_changed_at timestamptz/i);
  assert.match(sql, /handle_changed_at > now\(\) - interval '1 month'/i);
  assert.match(sql, /if saved_profile\.handle = normalized_handle then/i);
  assert.match(sql, /create or replace function public\.get_my_published_profile_post_ids/i);
  assert.match(sql, /order by p\.published_at desc nulls last, p\.id desc/i);
  assert.match(sql, /create or replace function public\.get_my_scrap_post_ids/i);
  assert.match(sql, /public\.current_member_can_view_post/i);
  assert.match(sql, /order by s\.created_at desc, p\.published_at desc nulls last, p\.id desc/i);
  assert.match(sql, /owners or permitted post viewers read media metadata/i);
  assert.match(sql, /drop policy if exists "owners or permitted post viewers read media metadata" on public\.media_assets/i);
  assert.match(sql, /pm\.asset_id = media_assets\.id/i);
  assert.match(sql, /create policy "facs media is readable with its permitted post" on storage\.objects/i);
  assert.match(sql, /drop policy if exists "facs media is readable with its permitted post" on storage\.objects/i);
  assert.match(sql, /a\.state = 'ready' and public\.current_member_can_view_post\(p\.author_id, p\.status, p\.visibility\)/i);
});
