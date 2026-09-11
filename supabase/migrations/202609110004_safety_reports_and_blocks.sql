-- Enforce the approved report/block policy at the database boundary.
-- A blocked relationship is bilateral for visibility and interaction even though
-- only one member creates the block record.

create type public.report_target_type as enum ('post', 'comment');
create type public.report_reason as enum (
  'spam',
  'hate',
  'harassment',
  'sexual_content',
  'privacy',
  'defamation',
  'social_norm_violation',
  'other'
);
create type public.report_status as enum ('received', 'triaged', 'resolved', 'dismissed');

create table public.blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint blocks_distinct_members check (blocker_id <> blocked_id)
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete restrict,
  target_type public.report_target_type not null,
  target_id uuid not null,
  reason public.report_reason not null,
  detail text check (char_length(trim(detail)) between 1 and 1000),
  status public.report_status not null default 'received',
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint reports_one_open_reason_per_member unique (reporter_id, target_type, target_id, reason)
);

create index blocks_blocked_idx on public.blocks (blocked_id, blocker_id);
create index reports_review_queue_idx on public.reports (status, created_at asc);
create index reports_target_idx on public.reports (target_type, target_id, created_at desc);

-- The helper is security definer so every policy and RPC can apply the same
-- relationship check without exposing block rows to another member.
create or replace function public.members_are_blocked(first_member uuid, second_member uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select first_member is not null
    and second_member is not null
    and first_member <> second_member
    and exists (
      select 1
      from public.blocks b
      where (b.blocker_id = first_member and b.blocked_id = second_member)
         or (b.blocker_id = second_member and b.blocked_id = first_member)
    );
$$;

create or replace function public.current_member_is_staff()
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('moderator', 'admin')
  );
$$;

create or replace function public.validate_report_target()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.target_type = 'post' and not exists (
    select 1 from public.posts p
    where p.id = new.target_id
      and ((p.status = 'published' and p.visibility = 'public') or p.author_id = new.reporter_id)
      and not public.members_are_blocked(p.author_id, new.reporter_id)
  ) then
    raise exception 'report target is not available to this member';
  end if;
  return new;
end;
$$;

create trigger reports_validate_target
  before insert on public.reports
  for each row execute function public.validate_report_target();

alter table public.blocks enable row level security;
alter table public.reports enable row level security;

create policy "members manage own blocks" on public.blocks
  for all to authenticated
  using (blocker_id = auth.uid())
  with check (blocker_id = auth.uid());

create policy "members read own reports" on public.reports
  for select to authenticated
  using (reporter_id = auth.uid() or public.current_member_is_staff());
create policy "members submit own reports" on public.reports
  for insert to authenticated
  with check (reporter_id = auth.uid() and status = 'received' and reviewed_by is null and reviewed_at is null);
create policy "staff review reports" on public.reports
  for update to authenticated
  using (public.current_member_is_staff())
  with check (public.current_member_is_staff());

-- Blocked members must disappear from each other's public content and cannot
-- interact through votes, scraps, aggregate RPCs, or related media rows.
drop policy if exists "published public posts are readable" on public.posts;
create policy "published public posts are readable" on public.posts
  for select using (
    ((status = 'published' and visibility = 'public') or author_id = auth.uid())
    and not public.members_are_blocked(author_id, auth.uid())
  );

drop policy if exists "post media follows readable post" on public.post_media;
create policy "post media follows readable post" on public.post_media
  for select using (exists (
    select 1 from public.posts p
    where p.id = post_id
      and ((p.status = 'published' and p.visibility = 'public') or p.author_id = auth.uid())
      and not public.members_are_blocked(p.author_id, auth.uid())
  ));

create or replace function public.validate_vote()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  post_evaluation public.evaluation_type;
  minimum_age smallint;
  maximum_age smallint;
  post_status public.post_status;
  post_author uuid;
begin
  select evaluation, age_min, age_max, status, author_id
    into post_evaluation, minimum_age, maximum_age, post_status, post_author
    from public.posts where id = new.post_id;
  if post_status <> 'published' then raise exception 'only published posts can receive votes'; end if;
  if public.members_are_blocked(post_author, new.voter_id) then raise exception 'blocked members cannot vote on this post'; end if;
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
      where p.id = post_id and not public.members_are_blocked(p.author_id, auth.uid())
    )
  );

drop policy if exists "members read accessible own scraps" on public.scraps;
create policy "members read accessible own scraps" on public.scraps
  for select to authenticated using (
    user_id = auth.uid() and exists (
      select 1 from public.posts p
      where p.id = post_id
        and ((p.status = 'published' and p.visibility = 'public') or p.author_id = auth.uid())
        and not public.members_are_blocked(p.author_id, auth.uid())
    )
  );
drop policy if exists "members create own scraps" on public.scraps;
create policy "members create own scraps" on public.scraps
  for insert to authenticated
  with check (
    user_id = auth.uid() and exists (
      select 1 from public.posts p
      where p.id = post_id and not public.members_are_blocked(p.author_id, auth.uid())
    )
  );

create or replace function public.get_post_aggregate(target_post_id uuid)
returns table (evaluation public.evaluation_type, yes_count bigint, no_count bigint, average_age numeric, total_votes bigint, sample_status text)
language sql stable security definer set search_path = public as $$
  with allowed_post as (
    select p.id, p.evaluation
    from public.posts p
    where p.id = target_post_id
      and ((p.status = 'published' and p.visibility = 'public') or p.author_id = auth.uid())
      and not public.members_are_blocked(p.author_id, auth.uid())
  ), aggregate_data as (
    select count(v.id) as total_votes,
      count(v.id) filter (where v.choice = 'yes') as yes_count,
      count(v.id) filter (where v.choice = 'no') as no_count,
      round(avg(v.perceived_age)::numeric, 1) as average_age
    from allowed_post ap left join public.votes v on v.post_id = ap.id
  )
  select ap.evaluation, ad.yes_count, ad.no_count, ad.average_age, ad.total_votes,
    case when ad.total_votes < 10 then 'INSUFFICIENT'
         when ad.total_votes < 30 then 'EARLY_SIGNAL'
         when ad.total_votes < 100 then 'BASE_RESULT'
         else 'EXPANDED_SAMPLE' end
  from allowed_post ap cross join aggregate_data ad;
$$;

create or replace function public.get_published_post_aggregates(target_post_ids uuid[])
returns table (post_id uuid, evaluation public.evaluation_type, yes_count bigint, no_count bigint, average_age numeric, total_votes bigint, sample_status text)
language sql stable security definer set search_path = public as $$
  with requested_posts as (
    select distinct unnest(coalesce(target_post_ids, array[]::uuid[])) as id
  ), allowed_posts as (
    select p.id, p.evaluation
    from public.posts p
    join requested_posts requested on requested.id = p.id
    where ((p.status = 'published' and p.visibility = 'public') or p.author_id = auth.uid())
      and not public.members_are_blocked(p.author_id, auth.uid())
  ), aggregate_data as (
    select ap.id as post_id, ap.evaluation,
      count(v.id) as total_votes,
      count(v.id) filter (where v.choice = 'yes') as yes_count,
      count(v.id) filter (where v.choice = 'no') as no_count,
      round(avg(v.perceived_age)::numeric, 1) as average_age
    from allowed_posts ap left join public.votes v on v.post_id = ap.id
    group by ap.id, ap.evaluation
  )
  select ad.post_id, ad.evaluation, ad.yes_count, ad.no_count, ad.average_age, ad.total_votes,
    case when ad.total_votes < 10 then 'INSUFFICIENT'
         when ad.total_votes < 30 then 'EARLY_SIGNAL'
         when ad.total_votes < 100 then 'BASE_RESULT'
         else 'EXPANDED_SAMPLE' end
  from aggregate_data ad;
$$;

revoke all on function public.members_are_blocked(uuid, uuid) from public;
revoke all on function public.current_member_is_staff() from public;
grant execute on function public.get_post_aggregate(uuid) to authenticated;
grant execute on function public.get_published_post_aggregates(uuid[]) to authenticated;

comment on table public.blocks is 'A member-created block hides both members from one another and prevents their interactions.';
comment on table public.reports is 'Private member reports reviewed only by the reporter or staff.';
