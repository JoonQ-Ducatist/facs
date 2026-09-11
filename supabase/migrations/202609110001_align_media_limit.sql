-- The product accepts up to five images and one short video per post.
-- Keep the server-side limits aligned with that six-item UI contract.
create or replace function public.validate_post_media_link()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  post_owner uuid;
  post_state public.post_status;
  asset_owner uuid;
  asset_state text;
  item_count integer;
  video_count integer;
begin
  select author_id, status into post_owner, post_state from public.posts where id = new.post_id;
  select owner_id, state into asset_owner, asset_state from public.media_assets where id = new.asset_id;
  if post_owner is null or asset_owner is null or post_owner <> asset_owner then
    raise exception 'post media must be owned by the post author';
  end if;
  if asset_state not in ('pending', 'ready') or (asset_state = 'pending' and post_state <> 'draft') then
    raise exception 'post media must be ready unless its owner post is a draft';
  end if;
  select count(*), count(*) filter (where a.media_type = 'video') into item_count, video_count
  from public.post_media pm join public.media_assets a on a.id = pm.asset_id
  where pm.post_id = new.post_id and pm.asset_id <> new.asset_id;
  if item_count >= 6 then raise exception 'a post may contain at most five images and one video'; end if;
  if video_count + (select case when media_type = 'video' then 1 else 0 end from public.media_assets where id = new.asset_id) > 1 then
    raise exception 'a post may contain at most one video';
  end if;
  return new;
end;
$$;

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
  if jsonb_typeof(input_media) <> 'array' or jsonb_array_length(input_media) not between 1 and 6 then raise exception 'one to six media files are required'; end if;

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
