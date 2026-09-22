-- Guest sign-in imagery is a deliberately narrow discovery surface. It never
-- returns profiles, raw votes, private media, or a personalized feed order.
-- The bucket remains private; this policy only permits short-lived signed URLs
-- for already-published public image objects. The policy calls a small
-- security-definer adapter because anon cannot read the RLS-protected media
-- tables directly.

create or replace function public.can_read_public_media_object(object_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.media_assets asset
    join public.post_media link on link.asset_id = asset.id
    join public.posts post on post.id = link.post_id
    where asset.storage_path = object_name
      and asset.state = 'ready'
      and asset.media_type = 'image'
      and post.status = 'published'
      and post.visibility = 'public'
  );
$$;

revoke all on function public.can_read_public_media_object(text) from public;
grant execute on function public.can_read_public_media_object(text) to anon;

comment on function public.can_read_public_media_object(text) is
  'Storage policy adapter: returns only whether an opaque object path belongs to a published public ready image; never returns media or member data.';

drop policy if exists "anonymous visitors read published public media" on storage.objects;
create policy "anonymous visitors read published public media" on storage.objects
  for select to anon
  using (
    bucket_id = 'facs-media'
    and public.can_read_public_media_object(name)
  );

create or replace function public.get_auth_featured_public_photos(
  page_size integer default 5,
  candidate_pool_size integer default 20
)
returns table (
  post_id uuid,
  storage_path text,
  participation_count bigint
)
language sql
security definer
set search_path = public
as $$
  with ranked_candidates as (
    select
      post.id as post_id,
      featured_asset.storage_path,
      count(vote.id)::bigint as participation_count,
      post.published_at
    from public.posts post
    join lateral (
      select asset.id, asset.storage_path
      from public.post_media link
      join public.media_assets asset on asset.id = link.asset_id
      where link.post_id = post.id
        and asset.state = 'ready'
        and asset.media_type = 'image'
      order by link.position asc
      limit 1
    ) featured_asset on true
    left join public.votes vote on vote.post_id = post.id
    where post.status = 'published'
      and post.visibility = 'public'
    group by post.id, featured_asset.id, featured_asset.storage_path, post.published_at
    order by participation_count desc, post.published_at desc, post.id asc
    limit least(greatest(coalesce(candidate_pool_size, 20), 1), 30)
  )
  select post_id, storage_path, participation_count
  from ranked_candidates
  order by random()
  limit least(greatest(coalesce(page_size, 5), 1), 10);
$$;

revoke all on function public.get_auth_featured_public_photos(integer, integer) from public;
grant execute on function public.get_auth_featured_public_photos(integer, integer) to anon, authenticated;

comment on function public.get_auth_featured_public_photos(integer, integer) is
  'Guest authentication imagery: public published image only, ordered by aggregate participation and randomized inside the top candidate pool. No profile or vote identity is returned.';
