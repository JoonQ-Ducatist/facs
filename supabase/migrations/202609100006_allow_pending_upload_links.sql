-- The upload preparation RPC creates a draft post, then pending media assets,
-- then their links before browser Storage uploads complete. Pending assets are
-- valid only while their owner post remains a draft; published posts still
-- require ready assets.
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
  if item_count >= 5 then raise exception 'a post may contain at most five media items'; end if;
  if video_count + (select case when media_type = 'video' then 1 else 0 end from public.media_assets where id = new.asset_id) > 1 then
    raise exception 'a post may contain at most one video'; end if;
  return new;
end;
$$;
