-- Return aggregate-only voting results for a feed page in one request.
-- Individual vote rows and voter identities remain unreadable to browsers.
create or replace function public.get_published_post_aggregates(target_post_ids uuid[])
returns table (
  post_id uuid,
  evaluation public.evaluation_type,
  yes_count bigint,
  no_count bigint,
  average_age numeric,
  total_votes bigint,
  sample_status text
)
language sql stable security definer set search_path = public as $$
  with requested_posts as (
    select distinct unnest(coalesce(target_post_ids, array[]::uuid[])) as id
  ), allowed_posts as (
    select p.id, p.evaluation
    from public.posts p
    join requested_posts requested on requested.id = p.id
    where (p.status = 'published' and p.visibility = 'public') or p.author_id = auth.uid()
  ), aggregate_data as (
    select
      ap.id as post_id,
      ap.evaluation,
      count(v.id) as total_votes,
      count(v.id) filter (where v.choice = 'yes') as yes_count,
      count(v.id) filter (where v.choice = 'no') as no_count,
      round(avg(v.perceived_age)::numeric, 1) as average_age
    from allowed_posts ap
    left join public.votes v on v.post_id = ap.id
    group by ap.id, ap.evaluation
  )
  select
    ad.post_id,
    ad.evaluation,
    ad.yes_count,
    ad.no_count,
    ad.average_age,
    ad.total_votes,
    case when ad.total_votes < 10 then 'INSUFFICIENT'
         when ad.total_votes < 30 then 'EARLY_SIGNAL'
         when ad.total_votes < 100 then 'BASE_RESULT'
         else 'EXPANDED_SAMPLE' end
  from aggregate_data ad;
$$;

revoke all on function public.get_published_post_aggregates(uuid[]) from public;
grant execute on function public.get_published_post_aggregates(uuid[]) to authenticated;

comment on function public.get_published_post_aggregates(uuid[]) is
  'Returns feed-page aggregates only. Raw votes and voter identities stay private.';
