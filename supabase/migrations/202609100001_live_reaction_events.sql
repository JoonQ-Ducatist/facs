-- FACt.Smack live reaction events.
-- This is an intentionally short-lived, anonymous presentation stream. It
-- never stores a voter id, email, handle, IP address, or other identity data.

create type public.live_reaction_kind as enum ('yes', 'no', 'age');

create table public.post_live_reaction_events (
  id bigint generated always as identity primary key,
  post_id uuid not null references public.posts(id) on delete cascade,
  reaction public.live_reaction_kind not null,
  perceived_age smallint,
  yes_count bigint not null check (yes_count >= 0),
  no_count bigint not null check (no_count >= 0),
  average_age numeric,
  total_votes bigint not null check (total_votes > 0),
  created_at timestamptz not null default now(),
  constraint live_reaction_age_value check (
    (reaction = 'age' and perceived_age between 18 and 99)
    or (reaction in ('yes', 'no') and perceived_age is null)
  )
);

create index post_live_reaction_events_post_created_idx
  on public.post_live_reaction_events (post_id, created_at desc);

alter table public.post_live_reaction_events enable row level security;
alter table public.post_live_reaction_events replica identity full;

-- The permission check is deliberately a security-definer function because
-- raw vote rows stay unreadable to browser roles. It returns only a boolean.
create or replace function public.can_view_post_live_reactions(target_post_id uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.posts p
    where p.id = target_post_id
      and (p.author_id = auth.uid() or exists (
        select 1 from public.votes v
        where v.post_id = p.id and v.voter_id = auth.uid()
      ))
  );
$$;

revoke all on function public.can_view_post_live_reactions(uuid) from public;
grant execute on function public.can_view_post_live_reactions(uuid) to authenticated;

-- Only the author and people who have evaluated this exact post can receive
-- a short-lived event. The evaluator identity is never selected or emitted.
create policy "eligible members read short-lived live reactions"
  on public.post_live_reaction_events for select to authenticated
  using (
    created_at >= now() - interval '1 hour'
    and public.can_view_post_live_reactions(post_id)
  );

create or replace function public.record_post_live_reaction()
returns trigger
language plpgsql security definer set search_path = public as $$
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

  -- The database clock, not a browser timestamp, owns the one-hour window.
  if post_published_at is null or post_published_at < now() - interval '1 hour' then
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

create trigger vote_creates_live_reaction
  after insert on public.votes
  for each row execute function public.record_post_live_reaction();

alter publication supabase_realtime add table public.post_live_reaction_events;

comment on table public.post_live_reaction_events is
  'Anonymous, one-hour presentation events. Y/N/age values are intentionally visible only to the post author and an evaluator of the same post.';
