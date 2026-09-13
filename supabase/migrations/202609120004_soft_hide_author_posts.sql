-- A member's "delete" action is a reversible product-level hide. The original
-- post, media, evaluations, and audit information stay retained in the DB.
alter table public.posts
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references public.profiles(id) on delete restrict;

-- A deleted post is invisible to everyone, including its author. Other states
-- keep the existing author/follower visibility behaviour.
create or replace function public.current_member_can_view_post(
  target_author_id uuid,
  target_status public.post_status,
  target_visibility public.post_visibility
)
returns boolean
language sql stable security definer set search_path = public as $$
  select target_status <> 'deleted'
    and (
      target_author_id = auth.uid()
      or (
        target_status = 'published'
        and not public.members_are_blocked(target_author_id, auth.uid())
        and (
          target_visibility = 'public'
          or exists (
            select 1 from public.follows f
            where f.followed_id = target_author_id
              and f.follower_id = auth.uid()
          )
        )
      )
    );
$$;

-- Removes the accidental local-development draft of a physical-delete RPC.
drop function if exists public.delete_my_post(uuid);

create or replace function public.hide_my_post(target_post_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'authentication required';
  end if;

  update public.posts
     set status = 'deleted',
         deleted_at = now(),
         deleted_by = current_user_id
   where id = target_post_id
     and author_id = current_user_id
     and status <> 'deleted';

  if not found then
    raise exception 'post not found or not owned';
  end if;

  return true;
end;
$$;

revoke all on function public.hide_my_post(uuid) from public;
grant execute on function public.hide_my_post(uuid) to authenticated;
