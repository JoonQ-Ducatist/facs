-- A member controls only their own public profile presentation. Profile images
-- live in a dedicated public bucket because they are intentionally displayed
-- anywhere the public profile is displayed; object paths contain only the UUID.

alter table public.profiles
  add column if not exists bio text not null default '' check (char_length(bio) <= 160);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profile-assets', 'profile-assets', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = true,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "profile owners upload avatars" on storage.objects;
create policy "profile owners upload avatars" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'profile-assets'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "profile owners update avatars" on storage.objects;
create policy "profile owners update avatars" on storage.objects
  for update to authenticated using (
    bucket_id = 'profile-assets'
    and (storage.foldername(name))[1] = auth.uid()::text
  ) with check (
    bucket_id = 'profile-assets'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "profile owners delete avatars" on storage.objects;
create policy "profile owners delete avatars" on storage.objects
  for delete to authenticated using (
    bucket_id = 'profile-assets'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create or replace function public.set_my_profile_presentation(input_bio text, input_avatar_path text)
returns jsonb
language plpgsql security definer set search_path = public, storage as $$
declare
  current_user_id uuid := auth.uid();
  normalized_bio text := trim(coalesce(input_bio, ''));
  normalized_avatar_path text := nullif(trim(coalesce(input_avatar_path, '')), '');
  saved_profile public.profiles;
begin
  if current_user_id is null then
    raise exception using errcode = '42501', message = 'auth_required';
  end if;
  if char_length(normalized_bio) > 160 then
    raise exception using errcode = '22023', message = 'invalid_profile_bio';
  end if;
  if normalized_avatar_path is not null and normalized_avatar_path !~ ('^' || current_user_id::text || '/[a-z0-9][a-z0-9._-]{0,127}$') then
    raise exception using errcode = '22023', message = 'invalid_avatar_path';
  end if;

  update public.profiles
     set bio = normalized_bio,
         avatar_path = normalized_avatar_path
   where id = current_user_id
   returning * into saved_profile;
  if not found then
    raise exception using errcode = '42501', message = 'profile_not_ready';
  end if;

  return jsonb_build_object(
    'id', saved_profile.id,
    'handle', saved_profile.handle,
    'display_name', saved_profile.display_name,
    'bio', saved_profile.bio,
    'avatar_path', saved_profile.avatar_path
  );
end;
$$;

revoke all on function public.set_my_profile_presentation(text, text) from public;
grant execute on function public.set_my_profile_presentation(text, text) to authenticated;
