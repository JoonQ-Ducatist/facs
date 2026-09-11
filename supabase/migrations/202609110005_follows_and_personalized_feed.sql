-- Keep evaluations anonymous while allowing an explicit, one-way Follow graph.
-- Feed affinity is computed inside the database from category activity only;
-- neither raw votes nor another member's preference profile leave the server.

create table public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  followed_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followed_id),
  constraint follows_distinct_members check (follower_id <> followed_id)
);

create index follows_followed_idx on public.follows (followed_id, follower_id);

alter table public.follows enable row level security;

create policy "members manage own follows" on public.follows
  for all to authenticated
  using (follower_id = auth.uid())
  with check (
    follower_id = auth.uid()
    and not public.members_are_blocked(follower_id, followed_id)
  );

-- This helper is the single visibility rule for direct reads, votes, scraps,
-- feed ordering and aggregate RPCs. A followers-only post is visible only to
-- its author or an active follower, and block state always wins.
create or replace function public.current_member_can_view_post(
  target_author_id uuid,
  target_status public.post_status,
  target_visibility public.post_visibility
)
returns boolean
language sql stable security definer set search_path = public as $$
  select target_author_id = auth.uid()
    or (
      target_status = 'published'
      and not public.members_are_blocked(target_author_id, auth.uid())
      and (
        target_visibility = 'public'
        or exists (
          select 1 from public.follows f
          where f.follower_id = auth.uid() and f.followed_id = target_author_id
        )
      )
    );
$$;

drop policy if exists "published public posts are readable" on public.posts;
create policy "members read permitted posts" on public.posts
  for select using (public.current_member_can_view_post(author_id, status, visibility));

drop policy if exists "post media follows readable post" on public.post_media;
create policy "post media follows readable post" on public.post_media
  for select using (exists (
    select 1 from public.posts p
    where p.id = post_id
      and public.current_member_can_view_post(p.author_id, p.status, p.visibility)
  ));

create or replace function public.validate_vote()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  post_evaluation public.evaluation_type;
  minimum_age smallint;
  maximum_age smallint;
  post_status public.post_status;
  post_author uuid;
  post_visibility public.post_visibility;
begin
  select evaluation, age_min, age_max, status, author_id, visibility
    into post_evaluation, minimum_age, maximum_age, post_status, post_author, post_visibility
    from public.posts where id = new.post_id;
  if not public.current_member_can_view_post(post_author, post_status, post_visibility) then
    raise exception 'this post is not available to the member';
  end if;
  if post_evaluation = 'binary' and new.choice is null then raise exception 'binary posts require yes or no'; end if;
  if post_evaluation = 'numeric_age' and (new.perceived_age is null or new.perceived_age not between minimum_age and maximum_age) then
    raise exception 'age vote is outside the author-selected range';
  end if;
  return new;
end;
$$;

drop policy if exists "members cast one eligible vote" on public.votes;
create policy "members cast one eligible vote" on public.votes
  for insert to authenticated
  with check (
    voter_id = auth.uid()
    and exists (
      select 1 from public.posts p
      where p.id = post_id
        and public.current_member_can_view_post(p.author_id, p.status, p.visibility)
    )
  );

drop policy if exists "members read accessible own scraps" on public.scraps;
create policy "members read accessible own scraps" on public.scraps
  for select to authenticated using (
    user_id = auth.uid() and exists (
      select 1 from public.posts p
      where p.id = post_id
        and public.current_member_can_view_post(p.author_id, p.status, p.visibility)
    )
  );
drop policy if exists "members create own scraps" on public.scraps;
create policy "members create own scraps" on public.scraps
  for insert to authenticated
  with check (
    user_id = auth.uid() and exists (
      select 1 from public.posts p
      where p.id = post_id
        and public.current_member_can_view_post(p.author_id, p.status, p.visibility)
    )
  );

create or replace function public.can_view_post_live_reactions(target_post_id uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.posts p
    where p.id = target_post_id
      and public.current_member_can_view_post(p.author_id, p.status, p.visibility)
      and (p.author_id = auth.uid() or exists (
        select 1 from public.votes v
        where v.post_id = p.id and v.voter_id = auth.uid()
      ))
  );
$$;

create or replace function public.get_post_aggregate(target_post_id uuid)
returns table (evaluation public.evaluation_type, yes_count bigint, no_count bigint, average_age numeric, total_votes bigint, sample_status text)
language sql stable security definer set search_path = public as $$
  with allowed_post as (
    select p.id, p.evaluation
    from public.posts p
    where p.id = target_post_id
      and public.current_member_can_view_post(p.author_id, p.status, p.visibility)
  ), aggregate_data as (
    select count(v.id) as total_votes,
      count(v.id) filter (where v.choice = 'yes') as yes_count,
      count(v.id) filter (where v.choice = 'no') as no_count,
      round(avg(v.perceived_age)::numeric, 1) as average_age
    from allowed_post ap left join public.votes v on v.post_id = ap.id
  )
  select ap.evaluation, ad.yes_count, ad.no_count, ad.average_age, ad.total_votes,
    case when ad.total_votes < 10 then 'INSUFFICIENT'
         when ad.total_votes < 30 then 'EARLY_SIGNAL'
         when ad.total_votes < 100 then 'BASE_RESULT'
         else 'EXPANDED_SAMPLE' end
  from allowed_post ap cross join aggregate_data ad;
$$;

create or replace function public.get_published_post_aggregates(target_post_ids uuid[])
returns table (post_id uuid, evaluation public.evaluation_type, yes_count bigint, no_count bigint, average_age numeric, total_votes bigint, sample_status text)
language sql stable security definer set search_path = public as $$
  with requested_posts as (
    select distinct unnest(coalesce(target_post_ids, array[]::uuid[])) as id
  ), allowed_posts as (
    select p.id, p.evaluation
    from public.posts p
    join requested_posts requested on requested.id = p.id
    where public.current_member_can_view_post(p.author_id, p.status, p.visibility)
  ), aggregate_data as (
    select ap.id as post_id, ap.evaluation,
      count(v.id) as total_votes,
      count(v.id) filter (where v.choice = 'yes') as yes_count,
      count(v.id) filter (where v.choice = 'no') as no_count,
      round(avg(v.perceived_age)::numeric, 1) as average_age
    from allowed_posts ap left join public.votes v on v.post_id = ap.id
    group by ap.id, ap.evaluation
  )
  select ad.post_id, ad.evaluation, ad.yes_count, ad.no_count, ad.average_age, ad.total_votes,
    case when ad.total_votes < 10 then 'INSUFFICIENT'
         when ad.total_votes < 30 then 'EARLY_SIGNAL'
         when ad.total_votes < 100 then 'BASE_RESULT'
         else 'EXPANDED_SAMPLE' end
  from aggregate_data ad;
$$;

create or replace function public.get_my_voted_post_ids(target_post_ids uuid[])
returns table (post_id uuid)
language sql stable security definer set search_path = public as $$
  select distinct v.post_id
  from public.votes v
  join public.posts p on p.id = v.post_id
  join unnest(coalesce(target_post_ids, array[]::uuid[])) requested(id) on requested.id = v.post_id
  where v.voter_id = auth.uid()
    and public.current_member_can_view_post(p.author_id, p.status, p.visibility);
$$;

-- Feed order: followed authors first, then categories the member recently
-- evaluates most, then a deterministic daily shuffle for discovery.
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
      case when exists (
        select 1 from public.follows f
        where f.follower_id = auth.uid() and f.followed_id = p.author_id
      ) then 0 else 1 end as follow_rank,
      coalesce(affinity.score, 0) as affinity_score,
      md5(p.id::text || auth.uid()::text || current_date::text) as daily_shuffle
    from public.posts p
    left join my_category_affinity affinity on affinity.category = p.category
    where public.current_member_can_view_post(p.author_id, p.status, p.visibility)
      and (category_filter is null or p.category = category_filter)
  )
  select id,
    case when follow_rank = 0 then 'followed'
         when affinity_score > 0 then 'similar_interest'
         else 'discovery' end
  from candidates
  order by follow_rank asc, affinity_score desc, daily_shuffle asc
  limit least(greatest(coalesce(page_size, 20), 1), 50);
$$;

revoke all on function public.current_member_can_view_post(uuid, public.post_status, public.post_visibility) from public;
grant execute on function public.get_post_aggregate(uuid) to authenticated;
grant execute on function public.get_published_post_aggregates(uuid[]) to authenticated;
grant execute on function public.get_my_voted_post_ids(uuid[]) to authenticated;
grant execute on function public.get_personalized_feed_post_ids(integer, text) to authenticated;

comment on table public.follows is 'One-way member follows. Follow records never reveal vote identities.';
comment on function public.get_personalized_feed_post_ids(integer, text) is 'Followed authors first, then private category-affinity ranking, then daily discovery shuffle.';
