begin;
-- No actor ID is added to anonymous telemetry. NULL means historical/unclassified.
alter table public.funnel_analytics_events add column if not exists is_internal boolean;
create or replace function public.analytics_account_is_internal(account_id uuid)
returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.profiles p where p.id=account_id and
 (p.role in('admin','moderator') or lower(p.handle) in('master','facsteam','facs_team','mia_demo1','ethan_demo2','chloe_demo3','noah_demo4','sofia_demo5','liam_demo6','ava_demo7','oliver_demo8','grace_demo9','lucas_demo10') or lower(p.handle) like 'qa\_%' escape '\'));
$$;
revoke all on function public.analytics_account_is_internal(uuid) from public,anon,authenticated;
create or replace function public.record_classified_analytics_event(input_event_name text,input_session_id uuid,input_post_id uuid default null,input_is_qa boolean default false)
returns void language plpgsql security definer set search_path=public as $$
declare internal_activity boolean:=coalesce(input_is_qa,false) or public.analytics_account_is_internal(auth.uid());
begin
 if input_event_name not in('visitor_opened','signup_completed','first_vote','upload_opened','media_selected','publish_attempted','upload_completed','result_viewed') then raise exception using errcode='22023',message='unsupported analytics event'; end if;
 if internal_activity then update public.funnel_analytics_events set is_internal=true where session_id=input_session_id; end if;
 insert into public.funnel_analytics_events(session_id,event_name,post_id,is_internal) values(input_session_id,input_event_name,input_post_id,internal_activity) on conflict do nothing;
end; $$;
revoke all on function public.record_classified_analytics_event(text,uuid,uuid,boolean) from public;
grant execute on function public.record_classified_analytics_event(text,uuid,uuid,boolean) to anon,authenticated;
-- Old clients also receive server-side authenticated staff exclusion.
create or replace function public.record_analytics_event(input_event_name text,input_session_id uuid,input_post_id uuid default null)
returns void language sql security definer set search_path=public as $$
 select public.record_classified_analytics_event(input_event_name,input_session_id,input_post_id,false);
$$;
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
  results_viewed bigint,
  unclassified_events bigint,
  excluded_internal_events bigint,
  exclusion_policy text
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
    (select count(*) from public.profiles where created_at >= window_start and not public.analytics_account_is_internal(id)),
    (select count(*) from public.posts where status = 'published' and published_at >= window_start and not public.analytics_account_is_internal(author_id)),
    (select count(*) from public.votes where created_at >= window_start and not public.analytics_account_is_internal(voter_id)),
    (select count(*) from public.comments where created_at >= window_start and deleted_at is null and not public.analytics_account_is_internal(author_id)),
    (select count(*) from public.reports where created_at >= window_start),
    (select count(*) from public.reports where reviewed_at >= window_start and status in ('resolved', 'dismissed')),
    (select count(*) from public.reports where status in ('received', 'triaged')),
    (select min(created_at) from public.reports where status in ('received', 'triaged')),
    (select count(distinct session_id) from public.funnel_analytics_events e where e.is_internal = false and not exists(select 1 from public.funnel_analytics_events x where x.session_id=e.session_id and x.is_internal=true) and occurred_at >= window_start),
    (select count(*) from public.funnel_analytics_events e where e.is_internal = false and not exists(select 1 from public.funnel_analytics_events x where x.session_id=e.session_id and x.is_internal=true) and event_name = 'signup_completed' and occurred_at >= window_start),
    (select count(*) from public.funnel_analytics_events e where e.is_internal = false and not exists(select 1 from public.funnel_analytics_events x where x.session_id=e.session_id and x.is_internal=true) and event_name = 'first_vote' and occurred_at >= window_start),
    (select count(*) from public.funnel_analytics_events e where e.is_internal = false and not exists(select 1 from public.funnel_analytics_events x where x.session_id=e.session_id and x.is_internal=true) and event_name = 'upload_opened' and occurred_at >= window_start),
    (select count(*) from public.funnel_analytics_events e where e.is_internal = false and not exists(select 1 from public.funnel_analytics_events x where x.session_id=e.session_id and x.is_internal=true) and event_name = 'media_selected' and occurred_at >= window_start),
    (select count(*) from public.funnel_analytics_events e where e.is_internal = false and not exists(select 1 from public.funnel_analytics_events x where x.session_id=e.session_id and x.is_internal=true) and event_name = 'publish_attempted' and occurred_at >= window_start),
    (select count(*) from public.funnel_analytics_events e where e.is_internal = false and not exists(select 1 from public.funnel_analytics_events x where x.session_id=e.session_id and x.is_internal=true) and event_name = 'upload_completed' and occurred_at >= window_start),
    (select count(*) from public.funnel_analytics_events e where e.is_internal = false and not exists(select 1 from public.funnel_analytics_events x where x.session_id=e.session_id and x.is_internal=true) and event_name = 'result_viewed' and occurred_at >= window_start),
    (select count(*) from public.funnel_analytics_events where occurred_at>=window_start and is_internal is null),
    (select count(*) from public.funnel_analytics_events where occurred_at>=window_start and is_internal=true),
    'internal-excluded-v1'::text;
end;
$$;

revoke all on function public.get_mvp_operational_metrics(integer) from public, anon;
grant execute on function public.get_mvp_operational_metrics(integer) to authenticated;


commit;
