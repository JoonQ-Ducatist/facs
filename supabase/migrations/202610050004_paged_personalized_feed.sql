-- Fetch a bounded window from the existing personalized order. The page order
-- and visibility rules match get_personalized_feed_post_ids; the extra id is
-- used by the client only to determine whether another page exists.
create or replace function public.get_personalized_feed_post_page(
  page_size integer default 11,
  category_filter text default null,
  after_post_id uuid default null
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
      case when p.visibility = 'public' and p.published_at >= now() - interval '1 hour' then 0 else 1 end as fresh_public_rank,
      md5(p.id::text || auth.uid()::text || current_date::text) as daily_shuffle
    from public.posts p
    left join my_category_affinity affinity on affinity.category = p.category
    where public.current_member_can_view_post(p.author_id, p.status, p.visibility)
      and (category_filter is null or p.category = category_filter)
  ), ranked as (
    select id as post_id,
      case when boost_rank = 0 then 'boosted'
           when follow_rank = 0 then 'followed'
           when fresh_public_rank = 0 then 'new'
           when affinity_score > 0 then 'similar_interest'
           else 'discovery' end as source,
      row_number() over (
        order by
          boost_rank asc,
          follow_rank asc,
          case when follow_rank = 0 then published_at end desc nulls last,
          fresh_public_rank asc,
          case when follow_rank = 1 and fresh_public_rank = 0 then published_at end desc nulls last,
          case when follow_rank = 1 and fresh_public_rank = 1 then affinity_score end desc,
          case when follow_rank = 1 and fresh_public_rank = 1 and affinity_score > 0 then published_at end desc nulls last,
          case when follow_rank = 1 and fresh_public_rank = 1 and affinity_score = 0 then daily_shuffle end asc,
          id asc
      ) as feed_position
    from candidates
  ), cursor_position as (
    select feed_position from ranked where post_id = after_post_id
  )
  select ranked.post_id, ranked.source
  from ranked
  where after_post_id is null
     or (exists (select 1 from cursor_position)
         and ranked.feed_position > (select min(feed_position) from cursor_position))
  order by ranked.feed_position
  limit least(greatest(coalesce(page_size, 11), 1), 21);
$$;

revoke all on function public.get_personalized_feed_post_page(integer, text, uuid) from public;
grant execute on function public.get_personalized_feed_post_page(integer, text, uuid) to authenticated;

comment on function public.get_personalized_feed_post_page(integer, text, uuid) is
  'Returns a bounded cursor page in the existing personalized feed order for authenticated members.';
