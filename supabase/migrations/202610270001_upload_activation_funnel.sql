-- Measure only the anonymous upload milestones needed to find where members
-- stop. No account ID, file name, question, media URL, or arbitrary property
-- is accepted. The existing 30-day purge applies to these rows unchanged.
alter table public.funnel_analytics_events
  drop constraint if exists funnel_analytics_events_event_name_check;

alter table public.funnel_analytics_events
  add constraint funnel_analytics_events_event_name_check check (event_name in (
    'visitor_opened', 'signup_completed', 'first_vote',
    'upload_opened', 'media_selected', 'publish_attempted',
    'upload_completed', 'result_viewed'
  ));

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
  if input_event_name not in (
    'visitor_opened', 'signup_completed', 'first_vote',
    'upload_opened', 'media_selected', 'publish_attempted',
    'upload_completed', 'result_viewed'
  ) then
    raise exception using errcode = '22023', message = 'unsupported analytics event';
  end if;

  insert into public.funnel_analytics_events (session_id, event_name, post_id)
  values (input_session_id, input_event_name, input_post_id)
  on conflict do nothing;
end;
$$;

revoke all on function public.record_analytics_event(text, uuid, uuid) from public;
grant execute on function public.record_analytics_event(text, uuid, uuid) to anon, authenticated;

drop function if exists public.get_mvp_operational_metrics(integer);

create function public.get_mvp_operational_metrics(
  window_hours integer default 24
)
returns table (
  window_started_at timestamptz,
  generated_at timestamptz,
  new_members bigint,
  published_posts bigint,
  votes bigint,
  comments bigint,
  reports_received bigint,
  reports_processed bigint,
  open_reports bigint,
  oldest_open_report_at timestamptz,
  unique_visitors bigint,
  signups_completed bigint,
  first_votes bigint,
  upload_opens bigint,
  media_selections bigint,
  publish_attempts bigint,
  uploads_completed bigint,
  results_viewed bigint
)
language plpgsql stable security definer set search_path = public as $$
declare
  current_user_id uuid := auth.uid();
  safe_window_hours integer;
  window_start timestamptz;
begin
  if current_user_id is null or not exists (
    select 1 from public.profiles where id = current_user_id and role = 'admin'
  ) then raise exception using errcode = '42501', message = 'admin access required'; end if;
  safe_window_hours := least(greatest(coalesce(window_hours, 24), 1), 720);
  window_start := now() - make_interval(hours => safe_window_hours);
  return query select
    window_start, now(),
    (select count(*) from public.profiles where created_at >= window_start),
    (select count(*) from public.posts where status = 'published' and published_at >= window_start),
    (select count(*) from public.votes where created_at >= window_start),
    (select count(*) from public.comments where created_at >= window_start and deleted_at is null),
    (select count(*) from public.reports where created_at >= window_start),
    (select count(*) from public.reports where reviewed_at >= window_start and status in ('resolved', 'dismissed')),
    (select count(*) from public.reports where status in ('received', 'triaged')),
    (select min(created_at) from public.reports where status in ('received', 'triaged')),
    (select count(distinct session_id) from public.funnel_analytics_events where occurred_at >= window_start),
    (select count(*) from public.funnel_analytics_events where event_name = 'signup_completed' and occurred_at >= window_start),
    (select count(*) from public.funnel_analytics_events where event_name = 'first_vote' and occurred_at >= window_start),
    (select count(*) from public.funnel_analytics_events where event_name = 'upload_opened' and occurred_at >= window_start),
    (select count(*) from public.funnel_analytics_events where event_name = 'media_selected' and occurred_at >= window_start),
    (select count(*) from public.funnel_analytics_events where event_name = 'publish_attempted' and occurred_at >= window_start),
    (select count(*) from public.funnel_analytics_events where event_name = 'upload_completed' and occurred_at >= window_start),
    (select count(*) from public.funnel_analytics_events where event_name = 'result_viewed' and occurred_at >= window_start);
end;
$$;

revoke all on function public.get_mvp_operational_metrics(integer) from public, anon;
grant execute on function public.get_mvp_operational_metrics(integer) to authenticated;

comment on function public.get_mvp_operational_metrics(integer) is
  'Admin-only aggregate MVP and upload activation metrics for a 1-720 hour window; no account, content, media, or event rows.';
