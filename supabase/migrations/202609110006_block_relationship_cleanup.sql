-- Complete the approved block policy: blocking immediately ends follows in
-- both directions and hides the blocked profile from ordinary member reads.

create or replace function public.validate_report_target()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.target_type = 'post' and not exists (
    select 1 from public.posts p
    where p.id = new.target_id
      and public.current_member_can_view_post(p.author_id, p.status, p.visibility)
  ) then
    raise exception 'report target is not available to this member';
  end if;
  return new;
end;
$$;

create or replace function public.remove_follows_for_block()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  delete from public.follows
  where (follower_id = new.blocker_id and followed_id = new.blocked_id)
     or (follower_id = new.blocked_id and followed_id = new.blocker_id);
  return new;
end;
$$;

create trigger blocks_remove_related_follows
  after insert on public.blocks
  for each row execute function public.remove_follows_for_block();

-- Cover relationships created before this trigger was introduced as well.
delete from public.follows f
using public.blocks b
where (f.follower_id = b.blocker_id and f.followed_id = b.blocked_id)
   or (f.follower_id = b.blocked_id and f.followed_id = b.blocker_id);

drop policy if exists "public profiles expose only signed-in members" on public.profiles;
create policy "members read unblocked profiles" on public.profiles
  for select to authenticated
  using (id = auth.uid() or not public.members_are_blocked(id, auth.uid()));

comment on function public.remove_follows_for_block() is 'A new block immediately removes Follow records in both directions.';
