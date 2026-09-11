-- Let a signed-in member restore only their own completed evaluations after a refresh.
-- The response deliberately excludes vote choice, age, timestamps, and all other users.
create or replace function public.get_my_voted_post_ids(target_post_ids uuid[])
returns table (post_id uuid)
language sql stable security definer set search_path = public as $$
  select distinct v.post_id
  from public.votes v
  join public.posts p on p.id = v.post_id
  join unnest(coalesce(target_post_ids, array[]::uuid[])) requested(id) on requested.id = v.post_id
  where v.voter_id = auth.uid()
    and ((p.status = 'published' and p.visibility = 'public') or p.author_id = auth.uid());
$$;

revoke all on function public.get_my_voted_post_ids(uuid[]) from public;
grant execute on function public.get_my_voted_post_ids(uuid[]) to authenticated;

comment on function public.get_my_voted_post_ids(uuid[]) is
  'Returns only the authenticated member''s completed post IDs for UI vote state restoration.';
