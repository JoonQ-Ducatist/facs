begin;

create table public.comment_appreciations (
  comment_id uuid primary key references public.comments(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.comment_appreciations enable row level security;
revoke all on public.comment_appreciations from public, anon, authenticated;
grant select, insert, delete on public.comment_appreciations to authenticated;
grant all on public.comment_appreciations to service_role;

-- The existing comments SELECT policy also checks visibility and blocks.
create policy "read appreciation on visible comments"
  on public.comment_appreciations for select to authenticated using (
    exists (select 1 from public.comments c where c.id = comment_appreciations.comment_id and c.status = 'published')
  );

create policy "post author thanks another commenter"
  on public.comment_appreciations for insert to authenticated with check (
    exists (
      select 1 from public.comments c join public.posts p on p.id = c.post_id
      where c.id = comment_appreciations.comment_id and c.status = 'published'
        and p.author_id = auth.uid() and c.author_id <> auth.uid()
    )
  );

create policy "post author removes appreciation"
  on public.comment_appreciations for delete to authenticated using (
    exists (
      select 1 from public.comments c join public.posts p on p.id = c.post_id
      where c.id = comment_appreciations.comment_id and c.status = 'published'
        and p.author_id = auth.uid() and c.author_id <> auth.uid()
    )
  );

commit;
