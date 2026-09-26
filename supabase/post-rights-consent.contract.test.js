import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const sql = await readFile(new URL('./migrations/202609260001_post_rights_consents.sql', import.meta.url), 'utf8');

test('member rights consent is server-authored, versioned, and readable only by its member or staff', () => {
  assert.match(sql, /create table if not exists public\.member_rights_consents/i);
  assert.match(sql, /member_id uuid not null/i);
  assert.match(sql, /document_version text not null/i);
  assert.match(sql, /consented_at timestamptz not null default now\(\)/i);
  assert.match(sql, /primary key \(member_id, document_version\)/i);
  assert.match(sql, /member_id = auth\.uid\(\) or public\.current_member_is_staff\(\)/i);
  assert.match(sql, /revoke all on table public\.member_rights_consents from public, anon, authenticated/i);
  assert.match(sql, /get_my_rights_consent_status[\s\S]*?member_id = auth\.uid\(\)/i);
});

test('first publish records matching member consent before media creation and later publishes reuse it', () => {
  assert.match(sql, /if not exists \([\s\S]*?from public\.member_rights_consents[\s\S]*?input_rights_confirmed is not true/i);
  assert.match(sql, /insert into public\.member_rights_consents \(member_id, document_version\)/i);
  assert.match(sql, /on conflict \(member_id, document_version\) do nothing/i);
  assert.match(sql, /member_id = current_user_id and document_version = 'photo-rights-v1'/i);
  assert.match(sql, /publish_post_upload[\s\S]*rights consent required/i);
});

test('the former upload RPC signature remains a non-creating consent rejection', () => {
  assert.match(sql, /input_visibility public\.post_visibility\n\)\nreturns table[\s\S]*?raise exception using errcode = '22023', message = 'rights consent required'/i);
  assert.match(sql, /input_rights_confirmed boolean/i);
  assert.match(sql, /grant execute on function public\.create_post_upload_with_visibility\(text, public\.evaluation_type, text, smallint, smallint, jsonb, public\.post_visibility\) to authenticated/i);
});
