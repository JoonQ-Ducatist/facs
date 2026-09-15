-- FACS Boost eligibility and feed exposure.
--
-- A Boost is deliberately a server-side exposure request, not a payment
-- capture. Payment, refunds, and provider webhooks remain a separate
-- milestone. This migration only makes the eligibility and one-request
-- boundary deterministic for staging QA.

create table if not exists public.post_boosts (
  post_id uuid primary key references public.posts(id) on delete cascade,
  requester_id uuid not null references public.profiles(id) on delete cascade,
  target_votes smallint not null default 100 check (target_votes between 1 and 1000),
  status text not null default 'active' check (status in ('active', 'completed', 'cancelled')),
  requested_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists post_boosts_status_requested_idx
  on public.post_boosts (status, requested_at desc);

alter table public.post_boosts enable row level security;

drop policy if exists "members read own post boosts" on public.post_boosts;
create policy "members read own post boosts"
  on public.post_boosts for select to authenticated
  using (requester_id = auth.uid());

-- Candidate discovery is private to the uploader. The one-hour boundary and
-- vote count use the database clock and exclude the author defensively even
-- though the current vote trigger also rejects author votes.
create or replace function public.get_my_boost_candidates(page_size integer default 20)
returns table (
  post_id uuid,
  category text,
  published_at timestamptz,
  other_vote_count bigint,
  target_votes smallint
)
language sql stable security definer set search_path = public as $$
  select
    p.id,
    p.category,
    p.published_at,
    count(v.id)::bigint as other_vote_count,
    100::smallint as target_votes
  from public.posts p
  left join public.votes v
    on v.post_id = p.id
   and v.voter_id <> p.author_id
  where auth.uid() is not null
    and p.author_id = auth.uid()
    and p.status = 'published'
    and p.published_at is not null
    and p.published_at >= now() - interval '1 hour'
    and not exists (
      select 1
      from public.post_boosts b
      where b.post_id = p.id
    )
  group by p.id, p.category, p.published_at
  having count(v.id) = 0
  order by p.published_at desc
  limit least(greatest(coalesce(page_size, 20), 1), 50);
$$;

-- Records one exposure request. The post row lock serializes a concurrent
-- vote/Boost request for the same post, while the primary key prevents a
-- second request permanently.
create or replace function public.request_post_boost(target_post_id uuid)
returns table (
  post_id uuid,
  requester_id uuid,
  target_votes smallint,
  status text,
  requested_at timestamptz
)
language plpgsql security definer set search_path = public as $$
declare
  current_user_id uuid := auth.uid();
  post_author_id uuid;
  post_status public.post_status;
  post_published_at timestamptz;
  other_vote_count bigint;
begin
  if current_user_id is null then
    raise exception using errcode = '42501', message = 'authentication required';
  end if;

  select p.author_id, p.status, p.published_at
    into post_author_id, post_status, post_published_at
  from public.posts p
  where p.id = target_post_id
  for update;

  if not found or post_author_id <> current_user_id then
    raise exception using errcode = '42501', message = 'boost post not found';
  end if;
  if post_status <> 'published' or post_published_at is null then
    raise exception using errcode = '22023', message = 'boost requires a published post';
  end if;
  if post_published_at < now() - interval '1 hour' then
    raise exception using errcode = '22023', message = 'boost window expired';
  end if;

  select count(*)::bigint into other_vote_count
  from public.votes v
  where v.post_id = target_post_id
    and v.voter_id <> post_author_id;
  if other_vote_count > 0 then
    raise exception using errcode = '22023', message = 'boost requires zero ratings';
  end if;

  begin
    return query
      insert into public.post_boosts (post_id, requester_id, target_votes, status)
      values (target_post_id, current_user_id, 100, 'active')
      returning post_boosts.post_id,
        post_boosts.requester_id,
        post_boosts.target_votes,
        post_boosts.status,
        post_boosts.requested_at;
  exception when unique_violation then
    raise exception using errcode = '23505', message = 'boost already requested';
  end;
end;
$$;

revoke all on function public.get_my_boost_candidates(integer) from public;
grant execute on function public.get_my_boost_candidates(integer) to authenticated;
revoke all on function public.request_post_boost(uuid) from public;
grant execute on function public.request_post_boost(uuid) to authenticated;

-- Keep Boosted posts ahead of the existing followed/affinity/discovery tiers.
-- The author never receives their own Boost priority; visibility, block, and
-- followers rules still come from current_member_can_view_post.
create or replace function public.get_personalized_feed_post_ids(
  page_size integer default 20,
  category_filter text default null
)
returns table (post_id uuid, source text)
language sql stable security definer set search_path = public as $$
  with my_category_affinity as (
    select rated.category, count(*)::integer as score
    from public.votes my_vote
    join public.posts rated on rated.id = my_vote.post_id
    where my_vote.voter_id = auth.uid()
    group by rated.category
  ), candidates as (
    select
      p.id,
      p.published_at,
      case when exists (
        select 1 from public.follows f
        where f.follower_id = auth.uid() and f.followed_id = p.author_id
      ) then 0 else 1 end as follow_rank,
      coalesce(affinity.score, 0) as affinity_score,
      case when exists (
        select 1
        from public.post_boosts b
        where b.post_id = p.id
          and b.status = 'active'
          and p.author_id <> auth.uid()
          and (
            select count(*)
            from public.votes boosted_votes
            where boosted_votes.post_id = p.id
              and boosted_votes.voter_id <> p.author_id
          ) < b.target_votes
      ) then 0 else 1 end as boost_rank,
      md5(p.id::text || auth.uid()::text || current_date::text) as daily_shuffle
    from public.posts p
    left join my_category_affinity affinity on affinity.category = p.category
    where public.current_member_can_view_post(p.author_id, p.status, p.visibility)
      and (category_filter is null or p.category = category_filter)
  )
  select id,
    case when boost_rank = 0 then 'boosted'
         when follow_rank = 0 then 'followed'
         when affinity_score > 0 then 'similar_interest'
         else 'discovery' end
  from candidates
  order by
    boost_rank asc,
    follow_rank asc,
    case when follow_rank = 0 then published_at end desc nulls last,
    case when follow_rank = 1 then affinity_score end desc,
    case when follow_rank = 1 and affinity_score > 0 then published_at end desc nulls last,
    case when follow_rank = 1 and affinity_score = 0 then daily_shuffle end asc
  limit least(greatest(coalesce(page_size, 20), 1), 50);
$$;

revoke all on function public.get_personalized_feed_post_ids(integer, text) from public;
grant execute on function public.get_personalized_feed_post_ids(integer, text) to authenticated;

comment on table public.post_boosts is
  'One private exposure request per post. Payment capture is intentionally outside this migration.';
comment on function public.get_my_boost_candidates(integer) is
  'Private uploader candidates: published within one database-clock hour, zero non-author votes, no prior Boost.';
comment on function public.request_post_boost(uuid) is
  'Creates one server-validated Boost request for an uploader post; no payment is captured here.';
