import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const sql = await readFile(new URL('./migrations/202610090003_hard_delete_member_content.sql', import.meta.url), 'utf8');
const coreSql = await readFile(new URL('./migrations/202609050001_core_mvp.sql', import.meta.url), 'utf8');
const commentSql = await readFile(new URL('./migrations/202610030001_mvp_comments.sql', import.meta.url), 'utf8');
const boostSql = await readFile(new URL('./migrations/202609150001_post_boosts.sql', import.meta.url), 'utf8');
const reportsSql = await readFile(new URL('./migrations/202609110004_safety_reports_and_blocks.sql', import.meta.url), 'utf8');
const moderationSql = await readFile(new URL('./migrations/202609240001_moderation_review_contract.sql', import.meta.url), 'utf8');

test('post deletion requires ownership and completed Storage removal before removing linked rows', () => {
  assert.match(sql, /post_owner <> auth\.uid\(\)/);
  assert.match(sql, /post media ownership is invalid/);
  assert.match(sql, /a\.owner_id <> auth\.uid\(\)/);
  assert.match(sql, /join storage\.objects o on o\.bucket_id = 'facs-media' and o\.name = a\.storage_path/);
  assert.match(sql, /join storage\.objects o/);
  assert.match(sql, /post media deletion incomplete/);
  assert.doesNotMatch(sql, /delete from public\.reports/);
  assert.match(sql, /delete from public\.posts p/);
  assert.match(sql, /delete from public\.media_assets a/);
  assert.match(sql, /client update required for permanent deletion/);
  assert.match(sql, /create or replace function public\.hide_my_post/);
  assert.doesNotMatch(sql, /update public\.posts[\s\S]*?status = 'deleted'/);
});

test('post-linked ratings, scraps, comments, and boosts cascade with the post', () => {
  for (const migration of [coreSql, commentSql, boostSql]) {
    assert.match(migration, /references public\.posts\(id\) on delete cascade/);
  }
  assert.match(coreSql, /create table public\.post_media[\s\S]*?post_id uuid not null references public\.posts\(id\) on delete cascade/);
  assert.match(coreSql, /create table public\.votes[\s\S]*?post_id uuid not null references public\.posts\(id\) on delete cascade/);
  assert.match(coreSql, /create table public\.scraps[\s\S]*?post_id uuid not null references public\.posts\(id\) on delete cascade/);
  assert.match(commentSql, /create table public\.comments[\s\S]*?post_id uuid not null references public\.posts\(id\) on delete cascade/);
  assert.match(boostSql, /create table if not exists public\.post_boosts[\s\S]*?post_id uuid primary key references public\.posts\(id\) on delete cascade/);
});

test('comment deletion removes its row while retaining separate audit records', () => {
  assert.match(sql, /comment_owner <> auth\.uid\(\)/);
  assert.doesNotMatch(sql, /delete from public\.moderation_actions/);
  assert.match(sql, /delete from public\.comments c where c\.id = target_comment_id/);
  assert.doesNotMatch(sql, /set status = 'deleted'/);
});

test('report and moderation history stay independent when a reported post is removed', () => {
  assert.match(reportsSql, /target_id uuid not null/);
  assert.doesNotMatch(reportsSql, /target_id uuid[^\n]*references public\.posts/);
  assert.match(moderationSql, /report_id uuid not null references public\.reports\(id\) on delete restrict/);
  assert.doesNotMatch(sql, /delete from public\.reports/);
  assert.doesNotMatch(sql, /delete from public\.moderation_actions/);
});
