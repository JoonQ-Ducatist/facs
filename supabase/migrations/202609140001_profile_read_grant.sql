-- The profile RLS policy is intentionally narrow, but Postgres privileges are
-- a separate gate. Allow authenticated members to read the rows that RLS
-- permits so the browser can hydrate the saved public handle after reload.
grant select on table public.profiles to authenticated;

-- Keep the relationship helper private: the policy invokes this narrow
-- boolean wrapper with definer rights, while members never receive direct
-- EXECUTE on members_are_blocked or current_member_is_staff.
create or replace function public.can_read_profile(target_profile uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select target_profile = auth.uid()
    or not exists (
      select 1
      from public.blocks b
      where (b.blocker_id = target_profile and b.blocked_id = auth.uid())
         or (b.blocker_id = auth.uid() and b.blocked_id = target_profile)
    );
$$;
revoke all on function public.can_read_profile(uuid) from public;
grant execute on function public.can_read_profile(uuid) to authenticated;

drop policy if exists "members read unblocked profiles" on public.profiles;
create policy "members read unblocked profiles" on public.profiles
  for select to authenticated
  using (public.can_read_profile(id));
