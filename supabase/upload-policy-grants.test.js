import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), 'migrations');

test('upload policy grant migration is idempotent and does not redefine RLS', async () => {
  const sql = await readFile(resolve(root, '202609150002_authenticated_upload_policy_grants.sql'), 'utf8');
  assert.match(sql, /grant select on table public\.posts, public\.media_assets, public\.post_media\s+to authenticated/i);
  assert.match(sql, /grant insert on table public\.votes\s+to authenticated/i);
  assert.match(sql, /grant execute on function public\.current_member_can_view_post\(\s*uuid, public\.post_status, public\.post_visibility\s*\)\s+to authenticated/i);
  assert.match(sql, /grant execute on function public\.members_are_blocked\(uuid, uuid\)\s+to authenticated/i);
  assert.match(sql, /grant execute on function public\.current_member_is_staff\(\)\s+to authenticated/i);
  assert.doesNotMatch(sql, /create\s+policy|drop\s+policy|create\s+or\s+replace\s+function|alter\s+table/i);
});
