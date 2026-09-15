-- Restore the browser-role privileges required by the existing upload and RLS
-- policies. GRANT is idempotent; this migration does not alter policy or
-- security-definer function definitions.

grant select on table public.posts, public.media_assets, public.post_media
  to authenticated;

grant insert on table public.votes
  to authenticated;

grant execute on function public.current_member_can_view_post(
  uuid, public.post_status, public.post_visibility
) to authenticated;

grant execute on function public.members_are_blocked(uuid, uuid)
  to authenticated;

grant execute on function public.current_member_is_staff()
  to authenticated;
