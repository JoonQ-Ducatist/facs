-- A moderator may inspect only the reported post's public author context and
-- first ready media asset. This does not change general post or media access.

create or replace function public.staff_can_read_report_preview_object(object_name text)
returns boolean
language sql
stable
security definer
set search_path = public as $$
  select public.current_member_is_staff()
    and exists (
      select 1
      from public.reports r
      join public.posts p
        on r.target_type = 'post'
       and p.id = r.target_id
      join public.post_media pm on pm.post_id = p.id
      join public.media_assets a on a.id = pm.asset_id
      where a.storage_path = object_name
        and a.state = 'ready'
    );
$$;

revoke all on function public.staff_can_read_report_preview_object(text) from public, anon, authenticated;

drop policy if exists "staff read reported media previews" on storage.objects;
create policy "staff read reported media previews" on storage.objects
  for select to authenticated using (
    bucket_id = 'facs-media'
    and public.staff_can_read_report_preview_object(name)
  );

create or replace function public.get_moderation_post_preview(target_report_id uuid)
returns table (
  report_id uuid,
  post_id uuid,
  question text,
  category text,
  author_handle text,
  visibility public.post_visibility,
  published_at timestamptz,
  preview_asset_id uuid,
  preview_storage_path text,
  preview_media_type text
)
language plpgsql
stable
security definer
set search_path = public as $$
begin
  if auth.uid() is null or not public.current_member_is_staff() then
    raise exception using errcode = '42501', message = 'staff access required';
  end if;

  return query
  select
    r.id,
    p.id,
    p.question,
    p.category,
    author.handle,
    p.visibility,
    p.published_at,
    preview.id,
    preview.storage_path,
    preview.media_type
  from public.reports r
  join public.posts p
    on r.target_type = 'post'
   and p.id = r.target_id
  join public.profiles author on author.id = p.author_id
  left join lateral (
    select a.id, a.storage_path, a.media_type
    from public.post_media pm
    join public.media_assets a on a.id = pm.asset_id
    where pm.post_id = p.id
      and a.state = 'ready'
    order by pm.position asc
    limit 1
  ) preview on true
  where r.id = target_report_id;

  if not found then
    raise exception using errcode = 'P0002', message = 'reported post not found';
  end if;
end;
$$;

revoke all on function public.get_moderation_post_preview(uuid) from public, anon;
grant execute on function public.get_moderation_post_preview(uuid) to authenticated;

comment on function public.get_moderation_post_preview(uuid) is
  'Returns staff-only reported post preview context without reporter identity.';
