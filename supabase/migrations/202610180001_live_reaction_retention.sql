-- A live balloon is available for the first 24 hours after publication to
-- every signed-in member who may view the post. Followers-only and blocks
-- keep the existing post-visibility boundary; raw votes remain unreadable.
create or replace function public.can_view_post_live_reactions(target_post_id uuid)
returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists (
    select 1
    from public.posts p
    where p.id = target_post_id
      and public.current_member_can_view_post(p.author_id, p.status, p.visibility)
  );
$$;

revoke all on function public.can_view_post_live_reactions(uuid) from public;
grant execute on function public.can_view_post_live_reactions(uuid) to authenticated;

drop policy if exists "eligible members read short-lived live reactions"
  on public.post_live_reaction_events;
create policy "members read recent visible-post live reactions"
  on public.post_live_reaction_events for select to authenticated
  using (
    created_at >= now() - interval '24 hours'
    and public.can_view_post_live_reactions(post_id)
  );

create or replace function public.record_post_live_reaction()
returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  post_published_at timestamptz;
  post_evaluation public.evaluation_type;
  aggregate_yes bigint;
  aggregate_no bigint;
  aggregate_average numeric;
  aggregate_total bigint;
begin
  select published_at, evaluation
    into post_published_at, post_evaluation
    from public.posts
    where id = new.post_id;

  if post_published_at is null or post_published_at < now() - interval '24 hours' then
    return new;
  end if;

  select
    count(*) filter (where choice = 'yes'),
    count(*) filter (where choice = 'no'),
    avg(perceived_age),
    count(*)
  into aggregate_yes, aggregate_no, aggregate_average, aggregate_total
  from public.votes
  where post_id = new.post_id;

  insert into public.post_live_reaction_events (
    post_id, reaction, perceived_age, yes_count, no_count, average_age, total_votes
  ) values (
    new.post_id,
    case when post_evaluation = 'numeric_age' then 'age'::public.live_reaction_kind else new.choice::text::public.live_reaction_kind end,
    case when post_evaluation = 'numeric_age' then new.perceived_age else null end,
    aggregate_yes,
    aggregate_no,
    aggregate_average,
    aggregate_total
  );
  return new;
end;
$$;

comment on table public.post_live_reaction_events is
  'Temporary 24-hour live-balloon events visible to signed-in members who may view the post; no voter identity is stored.';

-- Remove only expired presentation events. Votes, posts and result aggregates
-- remain untouched; event rows become unreadable after 24 hours by RLS.
create or replace function public.purge_expired_post_live_reaction_events()
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  deleted_count integer;
begin
  delete from public.post_live_reaction_events
  where created_at < now() - interval '24 hours';

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

revoke all on function public.purge_expired_post_live_reaction_events()
  from public, anon, authenticated, service_role;

create index if not exists post_live_reaction_events_created_at_idx
  on public.post_live_reaction_events (created_at);

-- Reuse the existing free Supabase Cron capability. The job runs at 04:00 UTC
-- daily and deletes only rows older than 24 hours at that moment.
create extension if not exists pg_cron;

select cron.schedule(
  'facs-purge-live-reactions',
  '0 4 * * *',
  $$select public.purge_expired_post_live_reaction_events();$$
);
