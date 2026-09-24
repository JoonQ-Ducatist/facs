-- Keep Storage media visibility aligned with the post visibility helper.
-- Feed/RLS already allows a valid follower to read a followers-only post;
-- signed URLs must apply that same decision before returning its object.

create or replace function public.can_read_member_media_metadata(target_asset_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.media_assets a
    left join public.post_media pm on pm.asset_id = a.id
    left join public.posts p on p.id = pm.post_id
    where a.id = target_asset_id
      and (
        a.owner_id = auth.uid()
        or (
          a.state = 'ready'
          and public.current_member_can_view_post(p.author_id, p.status, p.visibility)
        )
      )
  );
$$;

revoke all on function public.can_read_member_media_metadata(uuid) from public, anon, authenticated;
grant execute on function public.can_read_member_media_metadata(uuid) to authenticated;

comment on function public.can_read_member_media_metadata(uuid) is
  'Media metadata policy adapter: returns only whether the current member may read one asset; it never exposes table rows.';

create or replace function public.can_read_member_media_object(object_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.media_assets a
    left join public.post_media pm on pm.asset_id = a.id
    left join public.posts p on p.id = pm.post_id
    where a.storage_path = object_name
      and public.can_read_member_media_metadata(a.id)
  );
$$;

revoke all on function public.can_read_member_media_object(text) from public, anon, authenticated;
grant execute on function public.can_read_member_media_object(text) to authenticated;

comment on function public.can_read_member_media_object(text) is
  'Storage policy adapter: returns only whether the current member may read an opaque media object path; it never exposes table rows.';

drop policy if exists "owners or published viewers read media metadata" on public.media_assets;
create policy "owners or permitted viewers read media metadata" on public.media_assets
  for select to authenticated using (public.can_read_member_media_metadata(id));

comment on policy "owners or permitted viewers read media metadata" on public.media_assets is
  'Owner media remains readable; other members receive only ready media attached to a post they can currently view, including valid followers.';

drop policy if exists "facs media is readable with its post" on storage.objects;
create policy "facs media is readable with its post" on storage.objects
  for select to authenticated using (
    bucket_id = 'facs-media'
    and public.can_read_member_media_object(name)
  );

comment on policy "facs media is readable with its post" on storage.objects is
  'Owner media remains readable; other members receive only ready media attached to a post they can currently view, including valid followers.';
