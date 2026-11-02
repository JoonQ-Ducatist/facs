-- Keep a small, identity-free visual history so older posts still feel active.
-- The source votes and result-visibility rules are unchanged.
begin;

drop policy if exists "members read recent visible-post live reactions"
  on public.post_live_reaction_events;
drop policy if exists "members read visible-post live reactions"
  on public.post_live_reaction_events;
create policy "members read visible-post live reactions"
  on public.post_live_reaction_events for select to authenticated
  using (public.can_view_post_live_reactions(post_id));

create or replace function public.record_post_live_reaction()
returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  post_evaluation public.evaluation_type;
  aggregate_yes bigint;
  aggregate_no bigint;
  aggregate_average numeric;
  aggregate_total bigint;
begin
  select evaluation into post_evaluation
  from public.posts
  where id = new.post_id;

  if post_evaluation is null then return new; end if;

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

  delete from public.post_live_reaction_events event
  where event.post_id = new.post_id
    and event.id in (
      select old_event.id
      from public.post_live_reaction_events old_event
      where old_event.post_id = new.post_id
      order by old_event.created_at desc, old_event.id desc
      offset 12
    );
  return new;
end;
$$;

-- Apply the same bounded contract to rows that already exist.
delete from public.post_live_reaction_events event
where event.id in (
  select old_event.id
  from public.post_live_reaction_events old_event
  where old_event.post_id = event.post_id
  order by old_event.created_at desc, old_event.id desc
  offset 12
);

select cron.unschedule(jobid)
from cron.job
where jobname = 'facs-purge-live-reactions';

drop function if exists public.purge_expired_post_live_reaction_events();

comment on table public.post_live_reaction_events is
  'Latest 12 anonymous presentation reactions per post; no voter identity is stored and post visibility remains enforced by RLS.';

commit;
