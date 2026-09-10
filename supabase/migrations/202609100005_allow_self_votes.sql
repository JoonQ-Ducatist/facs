-- Authors may add one genuine first-impression vote to their own published post.
-- The existing unique (post_id, voter_id) constraint remains the final one-vote rule.
create or replace function public.validate_vote()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  post_evaluation public.evaluation_type;
  minimum_age smallint;
  maximum_age smallint;
  post_status public.post_status;
begin
  select evaluation, age_min, age_max, status
    into post_evaluation, minimum_age, maximum_age, post_status
    from public.posts where id = new.post_id;
  if post_status <> 'published' then raise exception 'only published posts can receive votes'; end if;
  if post_evaluation = 'binary' and new.choice is null then raise exception 'binary posts require yes or no'; end if;
  if post_evaluation = 'numeric_age' and (new.perceived_age is null or new.perceived_age not between minimum_age and maximum_age) then
    raise exception 'age vote is outside the author-selected range';
  end if;
  return new;
end;
$$;
