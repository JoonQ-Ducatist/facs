-- Profile identity and private-library contracts.
--
-- This migration keeps handle changes server-authoritative and gives a member
-- deterministic, complete lists for their own published posts and Scraps.

alter table public.profiles
  add column if not exists handle_changed_at timestamptz;

create or replace function public.set_my_public_handle(input_handle text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  current_user_id uuid := auth.uid();
  normalized_handle text;
  saved_profile public.profiles;
begin
  if current_user_id is null then
    raise exception using errcode = '42501', message = 'auth_required';
  end if;

  normalized_handle := lower(regexp_replace(trim(coalesce(input_handle, '')), '^@+', ''));
  if normalized_handle !~ '^[a-z0-9_]{3,30}$' or normalized_handle like 'member_%' then
    raise exception using errcode = '22023', message = 'invalid_public_handle';
  end if;

  select * into saved_profile
  from public.profiles
  where id = current_user_id and role = 'member'
  for update;
  if not found then
    raise exception using errcode = '42501', message = 'profile_not_ready';
  end if;

  -- Retrying an already saved value is idempotent. It must not extend the
  -- cooldown, including for accounts migrated from before this column existed.
  if saved_profile.handle = normalized_handle then
    return jsonb_build_object(
      'id', saved_profile.id,
      'handle', saved_profile.handle,
      'display_name', saved_profile.display_name,
      'handle_changed_at', saved_profile.handle_changed_at
    );
  end if;

  -- A generated member_* handle is the unconfigured state. Its first public
  -- handle is allowed; every later change uses the database clock cooldown.
  if saved_profile.handle_changed_at is not null
     and saved_profile.handle_changed_at > now() - interval '1 month' then
    raise exception using errcode = '22023', message = 'public_handle_change_cooldown';
  end if;

  if exists (select 1 from public.profiles where handle = normalized_handle and id <> current_user_id) then
    raise exception using errcode = '23505', message = 'public_handle_taken';
  end if;

  update public.profiles
     set handle = normalized_handle,
         handle_changed_at = now()
   where id = current_user_id
   returning * into saved_profile;

  return jsonb_build_object(
    'id', saved_profile.id,
    'handle', saved_profile.handle,
    'display_name', saved_profile.display_name,
    'handle_changed_at', saved_profile.handle_changed_at
  );
end;
$$;

revoke all on function public.set_my_public_handle(text) from public;
grant execute on function public.set_my_public_handle(text) to authenticated;

-- The profile uses this list instead of the personalized Feed page: it is
-- owner-only, includes all published posts up to an explicit page limit, and
-- has a stable newest-first order even where published_at ties.
create or replace function public.get_my_published_profile_post_ids(page_size integer default 50)
returns table (post_id uuid, published_at timestamptz)
language sql stable security definer set search_path = public as $$
  select p.id, p.published_at
  from public.posts p
  where auth.uid() is not null
    and p.author_id = auth.uid()
    and p.status = 'published'
  order by p.published_at desc nulls last, p.id desc
  limit least(greatest(coalesce(page_size, 50), 1), 100);
$$;

revoke all on function public.get_my_published_profile_post_ids(integer) from public;
grant execute on function public.get_my_published_profile_post_ids(integer) to authenticated;

-- A Scrap list is private and only returns posts that remain visible under the
-- same central block/follower/deletion rule as Feed and vote access.
create or replace function public.get_my_scrap_post_ids(page_size integer default 100)
returns table (post_id uuid, saved_at timestamptz)
language sql stable security definer set search_path = public as $$
  select s.post_id, s.created_at
  from public.scraps s
  join public.posts p on p.id = s.post_id
  where auth.uid() is not null
    and s.user_id = auth.uid()
    and public.current_member_can_view_post(p.author_id, p.status, p.visibility)
  order by s.created_at desc, p.published_at desc nulls last, p.id desc
  limit least(greatest(coalesce(page_size, 100), 1), 100);
$$;

revoke all on function public.get_my_scrap_post_ids(integer) from public;
grant execute on function public.get_my_scrap_post_ids(integer) to authenticated;

-- The original metadata policy only covered public posts. Profile and Scrap
-- detail hydration must also work for an allowed follower, while block and
-- deletion changes take effect immediately through the shared helper.
drop policy if exists "owners or published viewers read media metadata" on public.media_assets;
drop policy if exists "owners or permitted post viewers read media metadata" on public.media_assets;
create policy "owners or permitted post viewers read media metadata" on public.media_assets
  for select to authenticated using (
    owner_id = auth.uid()
    or exists (
      select 1
      from public.post_media pm
      join public.posts p on p.id = pm.post_id
      where pm.asset_id = media_assets.id
        and public.current_member_can_view_post(p.author_id, p.status, p.visibility)
    )
  );

-- Signed media reads use storage.objects as the final gate. Keep its rule in
-- lockstep with the metadata policy so followers can open a permitted Scrap
-- or Feed card while blocked/deleted posts remain unavailable.
drop policy if exists "facs media is readable with its post" on storage.objects;
drop policy if exists "facs media is readable with its permitted post" on storage.objects;
create policy "facs media is readable with its permitted post" on storage.objects
  for select to authenticated using (
    bucket_id = 'facs-media'
    and exists (
      select 1
      from public.media_assets a
      left join public.post_media pm on pm.asset_id = a.id
      left join public.posts p on p.id = pm.post_id
      where a.storage_path = name
        and (
          a.owner_id = auth.uid()
          or (a.state = 'ready' and public.current_member_can_view_post(p.author_id, p.status, p.visibility))
        )
    )
  );

comment on column public.profiles.handle_changed_at is
  'Server-clock time of the last actual public-handle change; unchanged retries do not update it.';
comment on function public.get_my_published_profile_post_ids(integer) is
  'Owner-only published profile posts, ordered by published_at DESC then id DESC.';
comment on function public.get_my_scrap_post_ids(integer) is
  'Current member private saved-post IDs, ordered by saved_at DESC and filtered through post visibility.';
