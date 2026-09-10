-- Server-backed private Scraps for real posts. Sample feed cards use an
-- explicitly separate local-only fallback until those cards become posts.

create table if not exists public.scraps (
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

create index if not exists scraps_user_created_idx on public.scraps (user_id, created_at desc);
alter table public.scraps enable row level security;

drop policy if exists "members read accessible own scraps" on public.scraps;
create policy "members read accessible own scraps" on public.scraps for select to authenticated using (
  user_id = auth.uid() and exists (
    select 1 from public.posts p
    where p.id = post_id
      and ((p.status = 'published' and p.visibility = 'public') or p.author_id = auth.uid())
  )
);

drop policy if exists "members create own scraps" on public.scraps;
create policy "members create own scraps" on public.scraps for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "members remove own scraps" on public.scraps;
create policy "members remove own scraps" on public.scraps for delete to authenticated using (user_id = auth.uid());
