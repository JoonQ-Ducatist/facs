-- FACt.Smack / FACS core MVP data boundary.
-- Apply with the Supabase CLI or SQL editor using a project-owner connection.
-- This migration intentionally grants no browser role elevated access.

create extension if not exists pgcrypto;

create type public.facs_role as enum ('member', 'moderator', 'admin');
create type public.post_visibility as enum ('public', 'followers');
create type public.post_status as enum ('draft', 'submitted', 'under_review', 'published', 'archived', 'deleted');
create type public.evaluation_type as enum ('binary', 'numeric_age');
create type public.vote_choice as enum ('yes', 'no');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  handle text not null unique check (handle ~ '^[a-z0-9_]{3,30}$'),
  display_name text check (char_length(display_name) between 1 and 50),
  avatar_path text,
  role public.facs_role not null default 'member',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete restrict,
  category text not null check (category in ('perceived_age', 'outfit', 'profile', 'date', 'fitness', 'work')),
  evaluation public.evaluation_type not null,
  question text not null check (char_length(trim(question)) between 2 and 200),
  visibility public.post_visibility not null default 'public',
  status public.post_status not null default 'draft',
  comments_allowed boolean not null default true,
  age_min smallint,
  age_max smallint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  constraint posts_evaluation_matches_category check (
    (category = 'perceived_age' and evaluation = 'numeric_age')
    or (category <> 'perceived_age' and evaluation = 'binary')
  ),
  constraint posts_age_range check (
    (evaluation = 'numeric_age' and age_min between 18 and 99 and age_max between 18 and 99 and age_min < age_max)
    or (evaluation = 'binary' and age_min is null and age_max is null)
  )
);

-- Private, optional information is deliberately outside the public post row.
create table public.post_private_details (
  post_id uuid primary key references public.posts(id) on delete cascade,
  actual_age smallint check (actual_age between 18 and 99),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete restrict,
  storage_path text not null unique,
  media_type text not null check (media_type in ('image', 'video')),
  mime_type text not null,
  byte_size integer not null check (byte_size > 0 and byte_size <= 15728640),
  duration_ms integer check (duration_ms is null or duration_ms between 1 and 10000),
  state text not null default 'pending' check (state in ('pending', 'ready', 'rejected', 'deleted')),
  created_at timestamptz not null default now(),
  constraint media_video_duration check ((media_type = 'image' and duration_ms is null) or (media_type = 'video' and duration_ms is not null))
);

create table public.post_media (
  post_id uuid not null references public.posts(id) on delete cascade,
  asset_id uuid not null references public.media_assets(id) on delete restrict,
  position smallint not null check (position between 0 and 5),
  primary key (post_id, asset_id),
  unique (post_id, position)
);

create table public.votes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  voter_id uuid not null references public.profiles(id) on delete restrict,
  choice public.vote_choice,
  perceived_age smallint,
  created_at timestamptz not null default now(),
  constraint votes_one_per_voter unique (post_id, voter_id),
  constraint votes_one_evaluation_value check (
    (choice is not null and perceived_age is null) or (choice is null and perceived_age between 18 and 99)
  )
);

-- A Scrap is a private per-account bookmark. Post deletion automatically removes
-- its scraps, so inaccessible or deleted posts cannot remain in a user's list.
create table public.scraps (
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

create index posts_feed_idx on public.posts (status, visibility, category, published_at desc);
create index posts_author_idx on public.posts (author_id, created_at desc);
create index media_assets_owner_idx on public.media_assets (owner_id, created_at desc);
create index votes_post_idx on public.votes (post_id, created_at desc);
create index scraps_user_created_idx on public.scraps (user_id, created_at desc);

create or replace function public.touch_updated_at()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch_updated_at before update on public.profiles for each row execute function public.touch_updated_at();
create trigger posts_touch_updated_at before update on public.posts for each row execute function public.touch_updated_at();
create trigger post_private_details_touch_updated_at before update on public.post_private_details for each row execute function public.touch_updated_at();

-- Auth is the source of identity. A profile is created without trusting browser input.
create or replace function public.create_profile_for_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  requested_handle text;
  generated_handle text;
begin
  requested_handle := nullif(lower(trim(new.raw_user_meta_data ->> 'handle')), '');
  generated_handle := case
    when requested_handle ~ '^[a-z0-9_]{3,30}$' then requested_handle
    else 'member_' || substr(replace(new.id::text, '-', ''), 1, 10)
  end;
  insert into public.profiles (id, handle, display_name)
  values (new.id, generated_handle, nullif(new.raw_user_meta_data ->> 'display_name', ''));
  return new;
exception when unique_violation then
  -- A user-supplied handle may already exist. Do not fail Auth signup; fall back
  -- to a deterministic per-user handle that does not reveal email or provider data.
  insert into public.profiles (id, handle, display_name)
  values (new.id, 'member_' || substr(replace(new.id::text, '-', ''), 1, 10), nullif(new.raw_user_meta_data ->> 'display_name', ''));
  return new;
end;
$$;

create trigger auth_user_creates_profile
  after insert on auth.users
  for each row execute procedure public.create_profile_for_new_user();

-- Auth may already contain test users created before this migration.
insert into public.profiles (id, handle, display_name)
select u.id,
  'member_' || substr(replace(u.id::text, '-', ''), 1, 10),
  nullif(u.raw_user_meta_data ->> 'display_name', '')
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id)
on conflict (id) do nothing;

-- Prevent a client from attaching another user's media or exceeding the MVP media rule.
create or replace function public.validate_post_media_link()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  post_owner uuid;
  asset_owner uuid;
  item_count integer;
  video_count integer;
begin
  select author_id into post_owner from public.posts where id = new.post_id;
  select owner_id into asset_owner from public.media_assets where id = new.asset_id and state = 'ready';
  if post_owner is null or asset_owner is null or post_owner <> asset_owner then
    raise exception 'post media must be a ready asset owned by the post author';
  end if;
  select count(*), count(*) filter (where a.media_type = 'video') into item_count, video_count
  from public.post_media pm join public.media_assets a on a.id = pm.asset_id
  where pm.post_id = new.post_id and pm.asset_id <> new.asset_id;
  if item_count >= 5 then raise exception 'a post may contain at most five media items'; end if;
  if video_count + (select case when media_type = 'video' then 1 else 0 end from public.media_assets where id = new.asset_id) > 1 then
    raise exception 'a post may contain at most one video';
  end if;
  return new;
end;
$$;

create trigger post_media_is_owned_and_limited
  before insert on public.post_media
  for each row execute function public.validate_post_media_link();

-- Validate evaluation data against the post without exposing individual votes.
create or replace function public.validate_vote()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  post_evaluation public.evaluation_type;
  minimum_age smallint;
  maximum_age smallint;
  post_author uuid;
  post_status public.post_status;
begin
  select evaluation, age_min, age_max, author_id, status
    into post_evaluation, minimum_age, maximum_age, post_author, post_status
    from public.posts where id = new.post_id;
  if post_status <> 'published' then raise exception 'only published posts can receive votes'; end if;
  if post_author = new.voter_id then raise exception 'authors cannot vote on their own posts'; end if;
  if post_evaluation = 'binary' and new.choice is null then raise exception 'binary posts require yes or no'; end if;
  if post_evaluation = 'numeric_age' and (new.perceived_age is null or new.perceived_age not between minimum_age and maximum_age) then
    raise exception 'age vote is outside the author-selected range';
  end if;
  return new;
end;
$$;

create trigger vote_matches_post before insert on public.votes for each row execute function public.validate_vote();

alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.post_private_details enable row level security;
alter table public.media_assets enable row level security;
alter table public.post_media enable row level security;
alter table public.votes enable row level security;
alter table public.scraps enable row level security;

create policy "public profiles expose only signed-in members" on public.profiles for select to authenticated using (true);
-- Browser clients can edit only their own member profile. Role changes are server/admin-only.
create policy "members update only their own member profile" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid() and role = 'member');

create policy "published public posts are readable" on public.posts for select using ((status = 'published' and visibility = 'public') or author_id = auth.uid());
create policy "members create their own posts" on public.posts for insert to authenticated with check (author_id = auth.uid() and status = 'draft');
create policy "authors edit unpublished posts" on public.posts for update to authenticated using (author_id = auth.uid() and status in ('draft', 'submitted')) with check (author_id = auth.uid() and status in ('draft', 'submitted'));
create policy "authors read private age detail" on public.post_private_details for select to authenticated using (exists (select 1 from public.posts p where p.id = post_id and p.author_id = auth.uid()));
create policy "authors write private age detail" on public.post_private_details for all to authenticated using (exists (select 1 from public.posts p where p.id = post_id and p.author_id = auth.uid())) with check (exists (select 1 from public.posts p where p.id = post_id and p.author_id = auth.uid()));

create policy "owners read their assets" on public.media_assets for select to authenticated using (owner_id = auth.uid());
-- Browsers can register only a pending upload. A trusted media worker promotes it to ready.
create policy "owners register pending assets" on public.media_assets for insert to authenticated with check (owner_id = auth.uid() and state = 'pending');
create policy "owners delete their pending assets" on public.media_assets for delete to authenticated using (owner_id = auth.uid() and state = 'pending');
create policy "post media follows readable post" on public.post_media for select using (exists (select 1 from public.posts p where p.id = post_id and ((p.status = 'published' and p.visibility = 'public') or p.author_id = auth.uid())));
create policy "authors attach their own media" on public.post_media for insert to authenticated with check (exists (select 1 from public.posts p where p.id = post_id and p.author_id = auth.uid()));
create policy "authors detach their own media" on public.post_media for delete to authenticated using (exists (select 1 from public.posts p where p.id = post_id and p.author_id = auth.uid()));

-- No SELECT policy on votes: voter identity and individual evaluation remain private.
create policy "members cast one eligible vote" on public.votes for insert to authenticated with check (voter_id = auth.uid());

-- Scraps are private, have no folders/share surface, and only return posts the
-- current user can still access through the same public/author visibility rule.
create policy "members read accessible own scraps" on public.scraps for select to authenticated using (
  user_id = auth.uid() and exists (
    select 1 from public.posts p
    where p.id = post_id
      and ((p.status = 'published' and p.visibility = 'public') or p.author_id = auth.uid())
  )
);
create policy "members create own scraps" on public.scraps for insert to authenticated with check (user_id = auth.uid());
create policy "members remove own scraps" on public.scraps for delete to authenticated using (user_id = auth.uid());

-- Aggregate RPC exposes counts only, never voter identities or raw values.
create or replace function public.get_post_aggregate(target_post_id uuid)
returns table (evaluation public.evaluation_type, yes_count bigint, no_count bigint, average_age numeric, total_votes bigint, sample_status text)
language sql stable security definer set search_path = public as $$
  with allowed_post as (
    select p.id, p.evaluation
    from public.posts p
    where p.id = target_post_id
      and ((p.status = 'published' and p.visibility = 'public') or p.author_id = auth.uid())
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

revoke all on function public.get_post_aggregate(uuid) from public;
grant execute on function public.get_post_aggregate(uuid) to authenticated;

comment on table public.votes is 'Raw evaluations are intentionally unreadable by users; use get_post_aggregate for results.';

-- Private Storage: browser clients never receive a broad insert/select policy.
-- A future authenticated Edge Function will issue a short-lived signed upload URL
-- only after it creates a pending media_assets row. This preserves the required
-- non-identifying uploads/YYYY/MM/DD/... object key and avoids client-side paths
-- that embed auth.uid(), email, or handle values.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('facs-media', 'facs-media', false, 15728640, array['image/jpeg', 'image/png', 'image/webp', 'video/mp4'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
