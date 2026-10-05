-- The existing aggregate-only operations RPC becomes a 30-day window source
-- for the admin dashboard. It never returns event, account, or content rows.
create or replace function public.get_mvp_operational_metrics(
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
    (select count(*) from public.funnel_analytics_events where event_name = 'upload_completed' and occurred_at >= window_start),
    (select count(*) from public.funnel_analytics_events where event_name = 'result_viewed' and occurred_at >= window_start);
end;
$$;

comment on function public.get_mvp_operational_metrics(integer) is
  'Admin-only, aggregate MVP metrics for a 1-720 hour window; no account, content, or event rows.';
