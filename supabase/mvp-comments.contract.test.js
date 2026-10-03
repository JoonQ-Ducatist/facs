import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const sql = await readFile(new URL('./migrations/202610030001_mvp_comments.sql', import.meta.url), 'utf8');

test('MVP comments keep browser writes behind authenticated RPCs', () => {
  for (const token of [
    'create table public.comments',
    'alter table public.comments enable row level security',
    'revoke all on table public.comments from public, anon, authenticated',
    'create_post_comment',
    'edit_own_comment',
    'delete_own_comment',
    'grant execute on function public.create_post_comment(uuid, text) to authenticated',
  ]) assert.match(sql, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
});

test('MVP comments enforce visible-post access, blocks, and soft deletion without an edit deadline', () => {
  for (const token of [
    'p.comments_allowed',
    'public.current_member_can_view_post',
    'public.members_are_blocked',
    "status = 'deleted'",
    'status = \'published\'',
    'list_post_comments',
  ]) assert.match(sql, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.doesNotMatch(sql, /interval '15 minutes'/);
});

test('MVP comments refresh the PostgREST schema cache after installing RPCs', () => {
  assert.match(sql, /notify pgrst, 'reload schema';/);
});
