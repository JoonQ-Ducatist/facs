import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const sql = await readFile(new URL('./migrations/202609270001_funnel_analytics.sql', import.meta.url), 'utf8');

test('funnel analytics stores only anonymous session, allowed event, optional post, and server time', () => {
  assert.match(sql, /create table if not exists public\.funnel_analytics_events/i);
  assert.match(sql, /session_id uuid not null/i);
  assert.match(sql, /event_name text not null check/i);
  assert.match(sql, /post_id uuid null references public\.posts/i);
  assert.match(sql, /occurred_at timestamptz not null default now\(\)/i);
  assert.match(sql, /unique index if not exists funnel_analytics_events_once_per_session_idx/i);
  assert.match(sql, /'visitor_opened'.*'signup_completed'.*'first_vote'.*'upload_completed'.*'result_viewed'/is);
  assert.doesNotMatch(sql.replace(/^--.*$/gm, ''), /email|ip_address|image_url|properties jsonb/i);
});

test('analytics table is private and browser writes use the narrow RPC boundary', () => {
  assert.match(sql, /enable row level security/i);
  assert.match(sql, /revoke all on table public\.funnel_analytics_events from public, anon, authenticated/i);
  assert.match(sql, /security definer/i);
  assert.match(sql, /insert into public\.funnel_analytics_events \(session_id, event_name, post_id\)/i);
  assert.match(sql, /on conflict do nothing/i);
  assert.match(sql, /grant execute on function public\.record_analytics_event\(text, uuid, uuid\) to anon, authenticated/i);
});
