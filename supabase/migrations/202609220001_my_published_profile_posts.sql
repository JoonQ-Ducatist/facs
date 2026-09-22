-- The Profile library must never depend on the personalized Feed ordering.
-- This owner-scoped RPC returns all of the signed-in member's published posts.
create or replace function public.get_my_published_profile_post_ids(page_size integer default 100)
returns table (post_id uuid)
language sql stable security definer set search_path = public as $$
  select p.id
  from public.posts p
  where auth.uid() is not null
    and p.author_id = auth.uid()
    and p.status = 'published'
  order by p.published_at desc nulls last, p.id desc
  limit least(greatest(coalesce(page_size, 100), 1), 100);
$$;

revoke all on function public.get_my_published_profile_post_ids(integer) from public;
grant execute on function public.get_my_published_profile_post_ids(integer) to authenticated;
