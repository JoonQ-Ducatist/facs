-- Keep the report-preview object check out of the public RPC schema. Storage
-- still needs a policy predicate, but members must not be able to invoke an
-- object-path probe through PostgREST.
create schema if not exists facs_private;
revoke all on schema facs_private from public;
grant usage on schema facs_private to authenticated;

create or replace function facs_private.staff_can_read_report_preview_object(object_name text)
returns boolean
language sql
stable
security definer
set search_path = public as $$
  select public.current_member_is_staff()
    and exists (
      select 1
      from public.reports r
      join public.posts p
        on r.target_type = 'post'
       and p.id = r.target_id
      join public.post_media pm on pm.post_id = p.id
      join public.media_assets a on a.id = pm.asset_id
      where a.storage_path = object_name
        and a.state = 'ready'
    );
$$;

revoke all on function facs_private.staff_can_read_report_preview_object(text) from public, anon;
grant execute on function facs_private.staff_can_read_report_preview_object(text) to authenticated;

drop policy if exists "staff read reported media previews" on storage.objects;
create policy "staff read reported media previews" on storage.objects
  for select to authenticated using (
    bucket_id = 'facs-media'
    and facs_private.staff_can_read_report_preview_object(name)
  );

drop function if exists public.staff_can_read_report_preview_object(text);
