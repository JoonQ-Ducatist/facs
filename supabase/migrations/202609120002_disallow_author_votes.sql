-- Post owners see their result immediately, but never contribute a vote to it.
-- This replaces the temporary MVP rule that allowed a single self-vote.
create or replace function public.validate_vote()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  post_evaluation public.evaluation_type;
  minimum_age smallint;
  maximum_age smallint;
  post_status public.post_status;
  post_author uuid;
  post_visibility public.post_visibility;
begin
  select evaluation, age_min, age_max, status, author_id, visibility
    into post_evaluation, minimum_age, maximum_age, post_status, post_author, post_visibility
    from public.posts where id = new.post_id;
  if not public.current_member_can_view_post(post_author, post_status, post_visibility) then
    raise exception 'this post is not available to the member';
  end if;
  if post_author = new.voter_id then raise exception 'authors cannot vote on their own posts'; end if;
  if post_evaluation = 'binary' and new.choice is null then raise exception 'binary posts require yes or no'; end if;
  if post_evaluation = 'numeric_age' and (new.perceived_age is null or new.perceived_age not between minimum_age and maximum_age) then
    raise exception 'age vote is outside the author-selected range';
  end if;
  return new;
end;
$$;

drop policy if exists "members cast one eligible vote" on public.votes;
create policy "members cast one eligible vote" on public.votes
  for insert to authenticated
  with check (
    voter_id = auth.uid()
    and exists (
      select 1 from public.posts p
      where p.id = post_id
        and p.author_id <> auth.uid()
        and public.current_member_can_view_post(p.author_id, p.status, p.visibility)
    )
  );
