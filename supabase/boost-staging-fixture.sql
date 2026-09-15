-- STAGING QA ONLY. Run this file only after the reviewed
-- 202609150001_post_boosts.sql migration exists in the isolated staging
-- project. It uses the database now() clock and rolls back every row before
-- the query finishes; it does not change the production schema or data.
--
-- Before running: confirm the Supabase dashboard project ref is the staging
-- project. Do not replace now() with a client-supplied timestamp: the server
-- clock boundary is part of the Boost contract.

begin;

create temp table boost_fixture_posts (
  label text primary key,
  id uuid not null,
  author_id uuid not null,
  voter_id uuid not null
) on commit drop;
grant select on boost_fixture_posts to authenticated;

do $$
declare
  fixture_author uuid;
  fixture_voter uuid;
  fixture_post uuid;
begin
  select p.id into fixture_author
  from public.profiles p
  where p.role = 'member'
  order by p.id
  limit 1;

  select p.id into fixture_voter
  from public.profiles p
  where p.role = 'member' and p.id <> fixture_author
  order by p.id
  limit 1;

  if fixture_author is null or fixture_voter is null then
    raise exception 'Boost fixture needs two member profiles';
  end if;

  insert into public.posts (author_id, category, evaluation, question, visibility, status, comments_allowed, age_min, age_max, published_at)
  values (fixture_author, 'outfit', 'binary', 'Boost fixture eligible', 'public', 'published', true, null, null, now() - interval '30 minutes')
  returning id into fixture_post;
  insert into boost_fixture_posts values ('eligible', fixture_post, fixture_author, fixture_voter);

  insert into public.posts (author_id, category, evaluation, question, visibility, status, comments_allowed, age_min, age_max, published_at)
  values (fixture_author, 'outfit', 'binary', 'Boost fixture rated', 'public', 'published', true, null, null, now() - interval '30 minutes')
  returning id into fixture_post;
  insert into boost_fixture_posts values ('rated', fixture_post, fixture_author, fixture_voter);

  insert into public.posts (author_id, category, evaluation, question, visibility, status, comments_allowed, age_min, age_max, published_at)
  values (fixture_author, 'outfit', 'binary', 'Boost fixture expired', 'public', 'published', true, null, null, now() - interval '90 minutes')
  returning id into fixture_post;
  insert into boost_fixture_posts values ('expired', fixture_post, fixture_author, fixture_voter);

  insert into public.posts (author_id, category, evaluation, question, visibility, status, comments_allowed, age_min, age_max, published_at)
  values (fixture_author, 'outfit', 'binary', 'Boost fixture duplicate', 'public', 'published', true, null, null, now() - interval '30 minutes')
  returning id into fixture_post;
  insert into boost_fixture_posts values ('duplicate', fixture_post, fixture_author, fixture_voter);
end;
$$;

-- One non-author vote must remove only the rated fixture from candidates.
insert into public.votes (post_id, voter_id, choice, perceived_age)
select id, voter_id, 'yes'::public.vote_choice, null
from boost_fixture_posts
where label = 'rated';

-- Execute the browser-facing routines as the fixture author.
select set_config(
  'request.jwt.claim.sub',
  (select author_id::text from boost_fixture_posts limit 1),
  true
);
set local role authenticated;

-- Expected candidate rows: eligible=true, duplicate=true, rated=false,
-- expired=false. The one-hour boundary is evaluated by database now().
select f.label,
       exists (
         select 1
         from public.get_my_boost_candidates(50) c
         where c.post_id = f.id
       ) as is_candidate
from boost_fixture_posts f
order by f.label;

-- First request succeeds. A second request for the same post must raise
-- unique_violation (23505), proving permanent duplicate protection.
select *
from public.request_post_boost((select id from boost_fixture_posts where label = 'duplicate'));

do $$
declare
  duplicate_rejected boolean := false;
begin
  begin
    perform 1
    from public.request_post_boost((select id from boost_fixture_posts where label = 'duplicate'));
  exception when unique_violation then
    duplicate_rejected := true;
  end;
  if not duplicate_rejected then
    raise exception 'duplicate Boost request was not rejected';
  end if;
end;
$$;

-- The uploader must never receive their own Boost priority.
select exists (
  select 1
  from public.get_personalized_feed_post_ids(50, null) feed
  join boost_fixture_posts f on f.id = feed.post_id
  where f.label = 'duplicate' and feed.source = 'boosted'
) as uploader_receives_boosted;

-- Switch only the JWT subject to the other fixture member. The same active
-- Boost should now be prioritized for that viewer.
reset role;
select set_config(
  'request.jwt.claim.sub',
  (select voter_id::text from boost_fixture_posts limit 1),
  true
);
set local role authenticated;
select exists (
  select 1
  from public.get_personalized_feed_post_ids(50, null) feed
  join boost_fixture_posts f on f.id = feed.post_id
  where f.label = 'duplicate' and feed.source = 'boosted'
) as other_member_receives_boosted;

-- No fixture post, vote, or Boost row survives this rollback.
rollback;
