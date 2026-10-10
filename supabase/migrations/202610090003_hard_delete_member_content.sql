-- Member deletion removes the content row and its owned Storage objects.
-- Storage objects must be removed through the Storage API before finalizing.

-- Reports and immutable moderation history remain separate from the content.

create or replace function public.get_my_post_deletion_assets(target_post_id uuid)
returns table (storage_path text)
language plpgsql
security definer
set search_path = public, storage
as $$
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'authentication required';
  end if;

  if not exists (
    select 1 from public.posts p
    where p.id = target_post_id and p.author_id = auth.uid()
  ) then
    raise exception using errcode = '42501', message = 'post is unavailable';
  end if;

  if exists (
    select 1 from public.post_media pm
    join public.media_assets a on a.id = pm.asset_id
    where pm.post_id = target_post_id and a.owner_id <> auth.uid()
  ) then
    raise exception using errcode = '22023', message = 'post media ownership is invalid';
  end if;

  return query
  select a.storage_path
  from public.post_media pm
  join public.media_assets a on a.id = pm.asset_id
  join storage.objects o on o.bucket_id = 'facs-media' and o.name = a.storage_path
  where pm.post_id = target_post_id
    and not exists (
      select 1 from public.post_media other_link
      where other_link.asset_id = pm.asset_id and other_link.post_id <> target_post_id
    )
  order by pm.position;
end;
$$;

-- Supabase Storage requires SELECT as well as DELETE for remove(). Existing
-- owner read policies supply SELECT; this policy is limited to linked media.
drop policy if exists "authors delete own post media" on storage.objects;
create policy "authors delete own post media" on storage.objects
  for delete to authenticated using (
    bucket_id = 'facs-media'
    and exists (
      select 1
      from public.media_assets a
      join public.post_media pm on pm.asset_id = a.id
      join public.posts p on p.id = pm.post_id
      where a.storage_path = name
        and a.owner_id = auth.uid()
        and p.author_id = auth.uid()
    )
  );

create or replace function public.delete_my_post(target_post_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, storage
as $$
declare
  post_owner uuid;
  asset_ids uuid[];
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'authentication required';
  end if;

  select p.author_id into post_owner
  from public.posts p
  where p.id = target_post_id
  for update;

  if post_owner is null or post_owner <> auth.uid() then
    raise exception using errcode = '42501', message = 'post is unavailable';
  end if;

  -- Do not remove database ownership records while an object still exists.
  if exists (
    select 1
    from public.post_media pm
    join public.media_assets a on a.id = pm.asset_id
    join storage.objects o on o.bucket_id = 'facs-media' and o.name = a.storage_path
    where pm.post_id = target_post_id
      and not exists (
        select 1 from public.post_media other_link
        where other_link.asset_id = pm.asset_id and other_link.post_id <> target_post_id
      )
  ) then
    raise exception using errcode = '22023', message = 'post media deletion incomplete';
  end if;

  select array_agg(pm.asset_id) into asset_ids
  from public.post_media pm
  where pm.post_id = target_post_id;

  delete from public.posts p where p.id = target_post_id;
  delete from public.media_assets a
  where a.id = any(coalesce(asset_ids, '{}'::uuid[]))
    and not exists (select 1 from public.post_media pm where pm.asset_id = a.id);
  return true;
end;
$$;

create or replace function public.delete_own_comment(target_comment_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  comment_owner uuid;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'authentication required';
  end if;

  select c.author_id into comment_owner
  from public.comments c
  where c.id = target_comment_id and c.status = 'published'
  for update;

  if comment_owner is null or comment_owner <> auth.uid() then
    raise exception using errcode = '42501', message = 'comment is unavailable';
  end if;

  delete from public.comments c where c.id = target_comment_id;
end;
$$;

revoke all on function public.get_my_post_deletion_assets(uuid) from public, anon;
revoke all on function public.delete_my_post(uuid) from public, anon;
revoke all on function public.delete_own_comment(uuid) from public, anon;
grant execute on function public.get_my_post_deletion_assets(uuid) to authenticated;
grant execute on function public.delete_my_post(uuid) to authenticated;
grant execute on function public.delete_own_comment(uuid) to authenticated;

-- Keep the legacy endpoint during the frontend rollout, but never allow it to
-- perform the former soft delete. Cached clients get a clear retry failure
-- until the hard-delete client is available instead of silently retaining data.
create or replace function public.hide_my_post(target_post_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'authentication required';
  end if;

  raise exception using errcode = 'P0001', message = 'client update required for permanent deletion';
end;
$$;

revoke all on function public.hide_my_post(uuid) from public, anon;
grant execute on function public.hide_my_post(uuid) to authenticated;
notify pgrst, 'reload schema';
