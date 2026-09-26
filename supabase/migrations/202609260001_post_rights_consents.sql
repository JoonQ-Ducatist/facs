-- A member confirms the current photo-rights notice once per document version.
-- The browser may request that first confirmation but never provides the member
-- identity or timestamp; both stay server-authored and auditable.
create table if not exists public.member_rights_consents (
  member_id uuid not null references public.profiles(id) on delete restrict,
  document_version text not null check (document_version = 'photo-rights-v1'),
  consented_at timestamptz not null default now(),
  primary key (member_id, document_version)
);

alter table public.member_rights_consents enable row level security;
revoke all on table public.member_rights_consents from public, anon, authenticated;
grant select on table public.member_rights_consents to authenticated;

drop policy if exists "members and staff read member rights consents" on public.member_rights_consents;
create policy "members and staff read member rights consents" on public.member_rights_consents
  for select to authenticated using (
    member_id = auth.uid() or public.current_member_is_staff()
  );

create or replace function public.get_my_rights_consent_status()
returns table (document_version text, consented_at timestamptz)
language sql stable security definer set search_path = public as $$
  select consent.document_version, consent.consented_at
  from public.member_rights_consents consent
  where consent.member_id = auth.uid()
    and consent.document_version = 'photo-rights-v1'
  limit 1;
$$;

-- Keep older browser bundles on the former seven-argument signature long
-- enough to receive the domain error rather than a missing-RPC error. It is a
-- non-creating compatibility boundary and cannot bypass the consent check.
create or replace function public.create_post_upload_with_visibility(
  input_category text,
  input_evaluation public.evaluation_type,
  input_question text,
  input_age_min smallint,
  input_age_max smallint,
  input_media jsonb,
  input_visibility public.post_visibility
)
returns table (post_id uuid, asset_id uuid, storage_path text, media_position smallint)
language plpgsql security definer set search_path = public, storage as $$
begin
  raise exception using errcode = '22023', message = 'rights consent required';
end;
$$;

create or replace function public.create_post_upload_with_visibility(
  input_category text,
  input_evaluation public.evaluation_type,
  input_question text,
  input_age_min smallint,
  input_age_max smallint,
  input_media jsonb,
  input_visibility public.post_visibility,
  input_rights_confirmed boolean,
  input_rights_document_version text
)
returns table (post_id uuid, asset_id uuid, storage_path text, media_position smallint)
language plpgsql security definer set search_path = public, storage as $$
declare
  prepared record;
  created_post_id uuid;
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then raise exception 'authentication required'; end if;
  if not exists (
    select 1 from public.member_rights_consents
    where member_id = current_user_id and document_version = 'photo-rights-v1'
  ) then
    if input_rights_confirmed is not true or input_rights_document_version <> 'photo-rights-v1' then
      raise exception using errcode = '22023', message = 'rights consent required';
    end if;
    insert into public.member_rights_consents (member_id, document_version)
    values (current_user_id, input_rights_document_version)
    on conflict (member_id, document_version) do nothing;
  end if;
  if not exists (
    select 1 from public.member_rights_consents
    where member_id = current_user_id and document_version = 'photo-rights-v1'
  ) then
    raise exception using errcode = '22023', message = 'rights consent required';
  end if;
  if input_visibility not in ('public', 'followers') then raise exception 'unsupported visibility'; end if;
  for prepared in select * from public.create_post_upload(
    input_category, input_evaluation, input_question, input_age_min, input_age_max, input_media
  ) loop
    created_post_id := prepared.post_id;
    post_id := prepared.post_id;
    asset_id := prepared.asset_id;
    storage_path := prepared.storage_path;
    media_position := prepared.media_position;
    return next;
  end loop;
  update public.posts
    set visibility = input_visibility
    where id = created_post_id and author_id = auth.uid() and status = 'draft';
end;
$$;

create or replace function public.publish_post_upload(target_post_id uuid)
returns public.posts
language plpgsql security definer set search_path = public, storage as $$
declare
  current_user_id uuid := auth.uid();
  ready_count integer;
  missing_count integer;
  published_post public.posts;
begin
  if current_user_id is null then raise exception 'authentication required'; end if;
  if not exists (select 1 from public.posts where id = target_post_id and author_id = current_user_id and status = 'draft') then
    raise exception 'draft post not found';
  end if;
  if not exists (
    select 1 from public.member_rights_consents
    where member_id = current_user_id and document_version = 'photo-rights-v1'
  ) then
    raise exception using errcode = '22023', message = 'rights consent required';
  end if;
  select count(*), count(*) filter (where o.id is null)
    into ready_count, missing_count
    from public.post_media pm
    join public.media_assets a on a.id = pm.asset_id
    left join storage.objects o on o.bucket_id = 'facs-media' and o.name = a.storage_path
    where pm.post_id = target_post_id and a.owner_id = current_user_id;
  if ready_count = 0 or missing_count > 0 then raise exception 'all selected files must finish uploading'; end if;
  update public.media_assets a set state = 'ready'
    from public.post_media pm
    where pm.asset_id = a.id and pm.post_id = target_post_id and a.owner_id = current_user_id;
  update public.posts set status = 'published', published_at = now()
    where id = target_post_id and author_id = current_user_id
    returning * into published_post;
  return published_post;
end;
$$;

revoke all on function public.create_post_upload_with_visibility(text, public.evaluation_type, text, smallint, smallint, jsonb, public.post_visibility, boolean, text) from public;
grant execute on function public.create_post_upload_with_visibility(text, public.evaluation_type, text, smallint, smallint, jsonb, public.post_visibility, boolean, text) to authenticated;
revoke all on function public.create_post_upload_with_visibility(text, public.evaluation_type, text, smallint, smallint, jsonb, public.post_visibility) from public;
grant execute on function public.create_post_upload_with_visibility(text, public.evaluation_type, text, smallint, smallint, jsonb, public.post_visibility) to authenticated;
revoke all on function public.get_my_rights_consent_status() from public, anon;
grant execute on function public.get_my_rights_consent_status() to authenticated;
