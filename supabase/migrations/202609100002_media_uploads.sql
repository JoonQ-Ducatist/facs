-- FACt.Smack media uploads for the already-deployed core schema.
-- This migration is additive because the production project predates the
-- repository's initial migration history.

create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete restrict,
  storage_path text not null unique,
  media_type text not null check (media_type in ('image', 'video')),
  mime_type text not null,
  byte_size integer not null check (byte_size > 0 and byte_size <= 15728640),
  duration_ms integer check (duration_ms is null or duration_ms between 1 and 10000),
  state text not null default 'pending' check (state in ('pending', 'ready', 'deleted')),
  created_at timestamptz not null default now(),
  constraint media_video_duration check (
    (media_type = 'image' and duration_ms is null)
    or (media_type = 'video' and duration_ms is not null)
  )
);

create table if not exists public.post_media (
  post_id uuid not null references public.posts(id) on delete cascade,
  asset_id uuid not null references public.media_assets(id) on delete restrict,
  position smallint not null check (position between 0 and 5),
  primary key (post_id, asset_id),
  unique (post_id, position)
);

create index if not exists media_assets_owner_idx on public.media_assets (owner_id, created_at desc);
create index if not exists post_media_post_idx on public.post_media (post_id, position);

alter table public.media_assets enable row level security;
alter table public.post_media enable row level security;

drop policy if exists "owners read their assets" on public.media_assets;
create policy "owners read their assets" on public.media_assets
  for select to authenticated using (owner_id = auth.uid());

drop policy if exists "post media follows readable post" on public.post_media;
create policy "post media follows readable post" on public.post_media
  for select to authenticated using (
    exists (
      select 1 from public.posts p
      where p.id = post_id
        and ((p.status = 'published' and p.visibility = 'public') or p.author_id = auth.uid())
    )
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'facs-media',
  'facs-media',
  false,
  15728640,
  array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime']
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "facs owners upload pending media" on storage.objects;
create policy "facs owners upload pending media" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'facs-media'
    and exists (
      select 1 from public.media_assets a
      where a.storage_path = name
        and a.owner_id = auth.uid()
        and a.state = 'pending'
    )
  );

drop policy if exists "facs media is readable with its post" on storage.objects;
create policy "facs media is readable with its post" on storage.objects
  for select to authenticated using (
    bucket_id = 'facs-media'
    and exists (
      select 1
      from public.media_assets a
      left join public.post_media pm on pm.asset_id = a.id
      left join public.posts p on p.id = pm.post_id
      where a.storage_path = name
        and (a.owner_id = auth.uid() or (a.state = 'ready' and p.status = 'published' and p.visibility = 'public'))
    )
  );

drop policy if exists "facs owners remove pending media" on storage.objects;
create policy "facs owners remove pending media" on storage.objects
  for delete to authenticated using (
    bucket_id = 'facs-media'
    and exists (
      select 1 from public.media_assets a
      where a.storage_path = name
        and a.owner_id = auth.uid()
        and a.state = 'pending'
    )
  );

create or replace function public.create_post_upload(
  input_category text,
  input_evaluation public.evaluation_type,
  input_question text,
  input_age_min smallint,
  input_age_max smallint,
  input_media jsonb
)
returns table (post_id uuid, asset_id uuid, storage_path text, media_position smallint)
language plpgsql security definer set search_path = public, storage as $$
declare
  current_user_id uuid := auth.uid();
  created_post_id uuid := gen_random_uuid();
  media_item jsonb;
  item_index integer := 0;
  created_asset_id uuid;
  item_type text;
  item_mime text;
  item_size integer;
  item_duration integer;
  object_path text;
  image_count integer := 0;
  video_count integer := 0;
begin
  if current_user_id is null then raise exception 'authentication required'; end if;
  if input_category not in ('perceived_age', 'outfit', 'profile', 'date', 'fitness', 'work') then raise exception 'unsupported category'; end if;
  if char_length(trim(input_question)) not between 2 and 200 then raise exception 'question must be 2 to 200 characters'; end if;
  if (input_evaluation = 'numeric_age' and (input_category <> 'perceived_age' or input_age_min not between 18 and 99 or input_age_max not between 18 and 99 or input_age_min >= input_age_max))
     or (input_evaluation = 'binary' and (input_category = 'perceived_age' or input_age_min is not null or input_age_max is not null)) then
    raise exception 'evaluation does not match category';
  end if;
  if jsonb_typeof(input_media) <> 'array' or jsonb_array_length(input_media) not between 1 and 5 then raise exception 'one to five media files are required'; end if;

  insert into public.posts (id, author_id, category, evaluation, question, status, visibility, comments_allowed, age_min, age_max)
  values (created_post_id, current_user_id, input_category, input_evaluation, trim(input_question), 'draft', 'public', true, input_age_min, input_age_max);

  for media_item in select value from jsonb_array_elements(input_media)
  loop
    item_type := media_item ->> 'type';
    item_mime := media_item ->> 'mimeType';
    item_size := (media_item ->> 'byteSize')::integer;
    item_duration := nullif(media_item ->> 'durationMs', '')::integer;
    if item_type not in ('image', 'video') or item_size not between 1 and 15728640 then raise exception 'invalid media metadata'; end if;
    if item_type = 'image' then image_count := image_count + 1; end if;
    if item_type = 'video' then
      video_count := video_count + 1;
      if item_duration not between 1 and 10000 then raise exception 'video duration must be between 1ms and 10s'; end if;
    end if;
    if image_count > 5 or video_count > 1 then raise exception 'too many media files'; end if;

    created_asset_id := gen_random_uuid();
    object_path := format('uploads/%s/%s/%s/%s', to_char(now() at time zone 'utc', 'YYYY'), to_char(now() at time zone 'utc', 'MM'), to_char(now() at time zone 'utc', 'DD'), created_asset_id);
    insert into public.media_assets (id, owner_id, storage_path, media_type, mime_type, byte_size, duration_ms)
    values (created_asset_id, current_user_id, object_path, item_type, item_mime, item_size, item_duration);
    insert into public.post_media (post_id, asset_id, position) values (created_post_id, created_asset_id, item_index);
    post_id := created_post_id;
    asset_id := created_asset_id;
    storage_path := object_path;
    media_position := item_index;
    return next;
    item_index := item_index + 1;
  end loop;
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

revoke all on function public.create_post_upload(text, public.evaluation_type, text, smallint, smallint, jsonb) from public;
revoke all on function public.publish_post_upload(uuid) from public;
grant execute on function public.create_post_upload(text, public.evaluation_type, text, smallint, smallint, jsonb) to authenticated;
grant execute on function public.publish_post_upload(uuid) to authenticated;
