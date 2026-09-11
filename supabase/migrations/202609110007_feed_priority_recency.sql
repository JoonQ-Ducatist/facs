-- Within each recommendation tier, new content should arrive before older
-- content. Randomization is reserved only for the discovery fallback.

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
  order by
    follow_rank asc,
    case when follow_rank = 0 then published_at end desc nulls last,
    case when follow_rank = 1 then affinity_score end desc,
    case when follow_rank = 1 and affinity_score > 0 then published_at end desc nulls last,
    case when follow_rank = 1 and affinity_score = 0 then daily_shuffle end asc
  limit least(greatest(coalesce(page_size, 20), 1), 50);
$$;

comment on function public.get_personalized_feed_post_ids(integer, text) is 'Newest followed posts first, then newest private category-affinity posts, then daily discovery shuffle.';
