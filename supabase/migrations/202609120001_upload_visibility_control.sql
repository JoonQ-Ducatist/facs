-- Keep the current upload protocol intact while allowing an approved visibility
-- value to be fixed before any media object is accepted or published.
create function public.create_post_upload_with_visibility(
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
declare
  prepared record;
  created_post_id uuid;
begin
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

revoke all on function public.create_post_upload_with_visibility(text, public.evaluation_type, text, smallint, smallint, jsonb, public.post_visibility) from public;
grant execute on function public.create_post_upload_with_visibility(text, public.evaluation_type, text, smallint, smallint, jsonb, public.post_visibility) to authenticated;
