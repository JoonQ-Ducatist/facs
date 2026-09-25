-- A post author can manage or hide their own content, but cannot submit a
-- member report about it. Keep report visibility aligned with the shared
-- public/follower/block-aware post access contract.

create or replace function public.validate_report_target()
returns trigger
language plpgsql
security definer
set search_path = public as $$
begin
  if new.target_type = 'post' and not exists (
    select 1
    from public.posts p
    where p.id = new.target_id
      and p.author_id <> new.reporter_id
      and public.current_member_can_view_post(p.author_id, p.status, p.visibility)
  ) then
    raise exception 'report target is not available to this member';
  end if;
  return new;
end;
$$;

comment on function public.validate_report_target() is 'Allows reports only for another member''s currently visible post.';
