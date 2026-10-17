-- Retention purge is separate from member-owned content deletion.
-- Only the postgres owner may purge terminal reports and their audit rows.

create table public.moderation_retention_holds (
  report_id uuid primary key references public.reports(id) on delete cascade,
  reason text not null check (char_length(trim(reason)) between 1 and 500),
  placed_at timestamptz not null default now(),
  released_at timestamptz,
  constraint moderation_retention_hold_release_order check (released_at is null or released_at >= placed_at)
);

alter table public.moderation_retention_holds enable row level security;
revoke all on table public.moderation_retention_holds from public, anon, authenticated, service_role;

create index reports_retention_purge_idx
  on public.reports (reviewed_at, id)
  where status in ('resolved', 'dismissed');

-- The existing immutability rule still rejects every client update/delete.
-- Its sole exception is a transaction-local purge by the database owner.
create or replace function public.reject_moderation_action_mutation()
returns trigger
language plpgsql
security invoker
set search_path = public as $$
begin
  if tg_op = 'DELETE'
     and session_user = 'postgres'
     and current_user = 'postgres'
     and current_setting('facs.moderation_retention_purge', true) = 'on' then
    return old;
  end if;

  raise exception using
    errcode = '42501',
    message = 'moderation actions are immutable';
end;
$$;

create or replace function public.purge_expired_moderation_reports(batch_size integer default 500)
returns integer
language plpgsql
security invoker
set search_path = public as $$
declare
  candidate record;
  purged_count integer := 0;
begin
  if session_user <> 'postgres' or current_user <> 'postgres' then
    raise exception using errcode = '42501', message = 'database owner required';
  end if;
  if batch_size is null or batch_size < 1 or batch_size > 500 then
    raise exception using errcode = '22023', message = 'invalid purge batch size';
  end if;

  perform set_config('facs.moderation_retention_purge', 'on', true);

  for candidate in
    select r.id
    from public.reports r
    left join public.moderation_retention_holds h on h.report_id = r.id
    where r.status in ('resolved', 'dismissed')
      and r.reviewed_at is not null
      and (h.report_id is null or h.released_at is not null)
      and greatest(r.reviewed_at, coalesce(h.released_at, r.reviewed_at)) <= now() - interval '1 year'
    order by r.reviewed_at, r.id
    limit batch_size
    for update of r skip locked
  loop
    delete from public.moderation_actions where report_id = candidate.id;
    delete from public.reports where id = candidate.id;
    purged_count := purged_count + 1;
  end loop;

  perform set_config('facs.moderation_retention_purge', 'off', true);
  return purged_count;
end;
$$;

revoke all on function public.purge_expired_moderation_reports(integer) from public, anon, authenticated, service_role;
grant execute on function public.purge_expired_moderation_reports(integer) to postgres;

comment on function public.purge_expired_moderation_reports(integer) is
  'Owner-only batch purge of terminal reports one year after final review or release of a recorded hold; schedule separately after validation.';
