-- Save a member's public handle through one audited, self-only RPC.
-- This keeps duplicate, invalid, missing-profile, and permission failures
-- distinguishable to the client without exposing database internals.
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
  if exists (select 1 from public.profiles where handle = normalized_handle and id <> current_user_id) then
    raise exception using errcode = '23505', message = 'public_handle_taken';
  end if;

  update public.profiles
  set handle = normalized_handle
  where id = current_user_id and role = 'member'
  returning * into saved_profile;
  if not found then
    raise exception using errcode = '42501', message = 'profile_not_ready';
  end if;
  return jsonb_build_object('id', saved_profile.id, 'handle', saved_profile.handle, 'display_name', saved_profile.display_name);
end;
$$;

revoke all on function public.set_my_public_handle(text) from public;
grant execute on function public.set_my_public_handle(text) to authenticated;
