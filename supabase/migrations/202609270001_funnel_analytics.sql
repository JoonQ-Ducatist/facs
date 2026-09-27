-- Minimal product-funnel telemetry. No account identifier, content, media URL,
-- email, IP value, client timestamp, or arbitrary property payload is stored.
create table if not exists public.funnel_analytics_events (
  id bigint generated always as identity primary key,
  session_id uuid not null,
  event_name text not null check (event_name in (
    'visitor_opened', 'signup_completed', 'first_vote', 'upload_completed', 'result_viewed'
  )),
  post_id uuid null references public.posts(id) on delete set null,
  occurred_at timestamptz not null default now()
);

create index if not exists funnel_analytics_events_occurred_at_idx
  on public.funnel_analytics_events (occurred_at desc);
create index if not exists funnel_analytics_events_session_idx
  on public.funnel_analytics_events (session_id, occurred_at);
create unique index if not exists funnel_analytics_events_once_per_session_idx
  on public.funnel_analytics_events (session_id, event_name, coalesce(post_id, '00000000-0000-0000-0000-000000000000'::uuid));

alter table public.funnel_analytics_events enable row level security;
revoke all on table public.funnel_analytics_events from public, anon, authenticated;

create or replace function public.record_analytics_event(
  input_event_name text,
  input_session_id uuid,
  input_post_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public as $$
begin
  if input_event_name not in ('visitor_opened', 'signup_completed', 'first_vote', 'upload_completed', 'result_viewed') then
    raise exception using errcode = '22023', message = 'unsupported analytics event';
  end if;

  insert into public.funnel_analytics_events (session_id, event_name, post_id)
  values (input_session_id, input_event_name, input_post_id)
  on conflict do nothing;
end;
$$;

revoke all on function public.record_analytics_event(text, uuid, uuid) from public;
grant execute on function public.record_analytics_event(text, uuid, uuid) to anon, authenticated;
