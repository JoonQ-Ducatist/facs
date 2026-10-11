-- Public MVP Boost: free exposure for the author's published post while it
-- has at most 10 ratings from other members. There is no time window and no
-- payment capture. The existing post_boosts primary key keeps this one-time.

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
    and not exists (
      select 1
      from public.post_boosts b
      where b.post_id = p.id
    )
  group by p.id, p.category, p.published_at
  having count(v.id) <= 10
  order by p.published_at desc
  limit least(greatest(coalesce(page_size, 20), 1), 50);
$$;

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

  select count(*)::bigint into other_vote_count
  from public.votes v
  where v.post_id = target_post_id
    and v.voter_id <> post_author_id;
  if other_vote_count > 10 then
    raise exception using errcode = '22023', message = 'boost requires at most 10 ratings';
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

comment on function public.get_my_boost_candidates(integer) is
  'Public MVP free Boost candidates: own published posts with at most 10 non-author ratings and no prior Boost; no time window.';
comment on function public.request_post_boost(uuid) is
  'Creates one free public MVP Boost after revalidating ownership, publication, and at most 10 non-author ratings.';
