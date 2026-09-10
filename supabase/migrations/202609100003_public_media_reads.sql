-- Published public posts may expose their ready media metadata to signed-in
-- members. Pending and owner-only media remain invisible to everyone else.

drop policy if exists "owners read their assets" on public.media_assets;
create policy "owners or published viewers read media metadata" on public.media_assets
  for select to authenticated using (
    owner_id = auth.uid()
    or (
      state = 'ready'
      and exists (
        select 1
        from public.post_media pm
        join public.posts p on p.id = pm.post_id
        where pm.asset_id = media_assets.id
          and p.status = 'published'
          and p.visibility = 'public'
      )
    )
  );
