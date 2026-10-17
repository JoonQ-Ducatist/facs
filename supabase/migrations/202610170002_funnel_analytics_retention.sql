-- Keep first-party, session-scoped funnel events for 30 days. This does not
-- touch posts, media, ratings, comments, accounts, or the reporting workflow.
create or replace function public.purge_expired_funnel_analytics_events()
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  deleted_count integer;
begin
  delete from public.funnel_analytics_events
  where occurred_at < now() - interval '30 days';

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

revoke all on function public.purge_expired_funnel_analytics_events()
  from public, anon, authenticated, service_role;

-- Supabase Cron runs inside Postgres, without an external or paid scheduler.
create extension if not exists pg_cron;

select cron.schedule(
  'facs-purge-funnel-analytics',
  '0 3 * * *',
  $$select public.purge_expired_funnel_analytics_events();$$
);

-- Apply the same limit to rows already present when this migration lands.
select public.purge_expired_funnel_analytics_events();
