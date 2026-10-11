-- Let authenticated members restore only their own exposure-request status.
-- Row access remains constrained by "members read own post boosts" RLS.
grant select on table public.post_boosts to authenticated;

create or replace function public.get_my_active_boosted_post_ids(page_size integer default 50)
returns table (post_id uuid)
language sql stable security definer set search_path = public as $$
  select b.post_id
  from public.post_boosts b
  where b.requester_id = auth.uid()
    and b.status = 'active'
  order by b.requested_at desc
  limit least(greatest(page_size, 1), 100);
$$;

revoke all on function public.get_my_active_boosted_post_ids(integer) from public;
grant execute on function public.get_my_active_boosted_post_ids(integer) to authenticated;

comment on function public.get_my_active_boosted_post_ids(integer) is
  'Returns only the signed-in member active exposure-request post ids for UI recovery.';
