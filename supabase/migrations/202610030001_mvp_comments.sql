-- MVP comments are intentionally flat. Replies and comment moderation UI ship
-- later, after the primary create/edit/delete flow has real-user evidence.

create type public.comment_status as enum ('published', 'deleted', 'hidden');

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete restrict,
  body text not null check (char_length(trim(body)) between 1 and 500),
  status public.comment_status not null default 'published',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz
);

create index comments_post_visible_idx on public.comments (post_id, created_at asc)
  where status = 'published';
create index comments_author_created_idx on public.comments (author_id, created_at desc);

create trigger comments_touch_updated_at
  before update on public.comments
  for each row execute function public.touch_updated_at();

alter table public.comments enable row level security;
revoke all on table public.comments from public, anon, authenticated;

-- A visible comment follows the same post audience and bilateral block rules as
-- the feed. Deleted and hidden records remain available only to trusted RPCs.
create policy "members read visible comments on visible posts" on public.comments
  for select to authenticated using (
    status = 'published'
    and not public.members_are_blocked(author_id, auth.uid())
    and exists (
      select 1 from public.posts p
      where p.id = post_id
        and public.current_member_can_view_post(p.author_id, p.status, p.visibility)
    )
  );
grant select on table public.comments to authenticated;

create or replace function public.create_post_comment(
  target_post_id uuid,
  input_body text
)
returns table (
  id uuid,
  post_id uuid,
  author_id uuid,
  body text,
  created_at timestamptz,
  updated_at timestamptz,
  edited_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  normalized_body text := trim(input_body);
begin
  if current_user_id is null then
    raise exception using errcode = '42501', message = 'authentication required';
  end if;

  if char_length(coalesce(normalized_body, '')) not between 1 and 500 then
    raise exception using errcode = '22023', message = 'comment must be between 1 and 500 characters';
  end if;

  if not exists (
    select 1
    from public.posts p
    where p.id = target_post_id
      and p.status = 'published'
      and p.comments_allowed
      and public.current_member_can_view_post(p.author_id, p.status, p.visibility)
      and not public.members_are_blocked(p.author_id, current_user_id)
  ) then
    raise exception using errcode = '42501', message = 'comments are not available for this post';
  end if;

  return query
  insert into public.comments (post_id, author_id, body)
  values (target_post_id, current_user_id, normalized_body)
  returning comments.id, comments.post_id, comments.author_id, comments.body,
    comments.created_at, comments.updated_at, comments.edited_at;
end;
$$;

create or replace function public.edit_own_comment(
  target_comment_id uuid,
  input_body text
)
returns table (
  id uuid,
  body text,
  updated_at timestamptz,
  edited_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  normalized_body text := trim(input_body);
begin
  if current_user_id is null then
    raise exception using errcode = '42501', message = 'authentication required';
  end if;

  if char_length(coalesce(normalized_body, '')) not between 1 and 500 then
    raise exception using errcode = '22023', message = 'comment must be between 1 and 500 characters';
  end if;

  return query
  update public.comments c
  set body = normalized_body, edited_at = now()
  where c.id = target_comment_id
    and c.author_id = current_user_id
    and c.status = 'published'
  returning c.id, c.body, c.updated_at, c.edited_at;

  if not found then
    raise exception using errcode = '42501', message = 'comment is unavailable';
  end if;
end;
$$;

create or replace function public.delete_own_comment(target_comment_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception using errcode = '42501', message = 'authentication required';
  end if;

  update public.comments
  set status = 'deleted', deleted_at = now()
  where id = target_comment_id
    and author_id = current_user_id
    and status = 'published';

  if not found then
    raise exception using errcode = '42501', message = 'comment is unavailable';
  end if;
end;
$$;

create or replace function public.list_post_comments(
  target_post_id uuid,
  page_size integer default 50,
  before_created_at timestamptz default null
)
returns table (
  id uuid,
  post_id uuid,
  author_id uuid,
  author_handle text,
  body text,
  created_at timestamptz,
  updated_at timestamptz,
  edited_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'authentication required';
  end if;

  if page_size not between 1 and 50 then
    raise exception using errcode = '22023', message = 'page size must be between 1 and 50';
  end if;

  if not exists (
    select 1 from public.posts p
    where p.id = target_post_id
      and p.status = 'published'
      and public.current_member_can_view_post(p.author_id, p.status, p.visibility)
  ) then
    raise exception using errcode = '42501', message = 'post is not available to this member';
  end if;

  return query
  select c.id, c.post_id, c.author_id, pr.handle, c.body,
    c.created_at, c.updated_at, c.edited_at
  from public.comments c
  join public.profiles pr on pr.id = c.author_id
  where c.post_id = target_post_id
    and c.status = 'published'
    and not public.members_are_blocked(c.author_id, auth.uid())
    and (before_created_at is null or c.created_at < before_created_at)
  order by c.created_at desc, c.id desc
  limit page_size;
end;
$$;

revoke all on function public.create_post_comment(uuid, text) from public, anon;
revoke all on function public.edit_own_comment(uuid, text) from public, anon;
revoke all on function public.delete_own_comment(uuid) from public, anon;
revoke all on function public.list_post_comments(uuid, integer, timestamptz) from public, anon;
grant execute on function public.create_post_comment(uuid, text) to authenticated;
grant execute on function public.edit_own_comment(uuid, text) to authenticated;
grant execute on function public.delete_own_comment(uuid) to authenticated;
grant execute on function public.list_post_comments(uuid, integer, timestamptz) to authenticated;

comment on table public.comments is
  'Flat MVP comments. Member deletion is soft; hidden and deleted rows are not readable through browser RLS.';
comment on function public.edit_own_comment(uuid, text) is
  'A comment author may edit one published comment at any time before deletion.';

-- Make newly-created comment RPCs available to PostgREST immediately after migration.
notify pgrst, 'reload schema';
