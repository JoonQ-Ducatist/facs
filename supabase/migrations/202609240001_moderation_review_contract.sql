-- Route report review through a validated RPC and retain an immutable audit
-- trail. Content visibility and media review remain separate follow-up work.

create table public.moderation_actions (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports(id) on delete restrict,
  actor_id uuid not null references public.profiles(id) on delete restrict,
  action text not null check (action = 'report_status_changed'),
  from_status public.report_status not null,
  to_status public.report_status not null,
  created_at timestamptz not null default now(),
  constraint moderation_actions_status_changed check (from_status <> to_status)
);

create index moderation_actions_report_created_idx
  on public.moderation_actions (report_id, created_at asc);

alter table public.moderation_actions enable row level security;

create or replace function public.reject_moderation_action_mutation()
returns trigger
language plpgsql
security invoker
set search_path = public as $$
begin
  raise exception using
    errcode = '42501',
    message = 'moderation actions are immutable';
end;
$$;

create trigger moderation_actions_are_immutable
  before update or delete on public.moderation_actions
  for each row execute function public.reject_moderation_action_mutation();

drop policy if exists "staff review reports" on public.reports;
revoke update on table public.reports from authenticated;

alter table public.reports
  drop constraint if exists reports_reviewed_by_fkey,
  add constraint reports_reviewed_by_fkey
    foreign key (reviewed_by) references public.profiles(id) on delete restrict,
  add constraint reports_review_metadata_matches_status check (
    (status = 'received' and reviewed_by is null and reviewed_at is null)
    or
    (status <> 'received' and reviewed_by is not null and reviewed_at is not null)
  );

create or replace function public.review_report(
  target_report_id uuid,
  next_status public.report_status
)
returns table (
  report_id uuid,
  report_status public.report_status,
  report_reviewed_by uuid,
  report_reviewed_at timestamptz
)
language plpgsql
security definer
set search_path = public as $$
declare
  current_user_id uuid := auth.uid();
  existing_report public.reports%rowtype;
begin
  if current_user_id is null or not public.current_member_is_staff() then
    raise exception using errcode = '42501', message = 'staff access required';
  end if;

  select * into existing_report
  from public.reports
  where id = target_report_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'report not found';
  end if;

  if not (
    (existing_report.status = 'received' and next_status = 'triaged')
    or
    (existing_report.status = 'triaged' and next_status in ('resolved', 'dismissed'))
  ) then
    raise exception using errcode = '22023', message = 'invalid report status transition';
  end if;

  update public.reports
  set status = next_status,
      reviewed_by = current_user_id,
      reviewed_at = now()
  where id = existing_report.id
  returning id, status, reviewed_by, reviewed_at
    into report_id, report_status, report_reviewed_by, report_reviewed_at;

  insert into public.moderation_actions (
    report_id,
    actor_id,
    action,
    from_status,
    to_status
  ) values (
    existing_report.id,
    current_user_id,
    'report_status_changed',
    existing_report.status,
    next_status
  );

  return next;
end;
$$;

create or replace function public.get_moderation_report_queue(
  status_filter public.report_status default null,
  page_size integer default 50
)
returns table (
  id uuid,
  reporter_id uuid,
  target_type public.report_target_type,
  target_id uuid,
  reason public.report_reason,
  detail text,
  status public.report_status,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public as $$
begin
  if auth.uid() is null or not public.current_member_is_staff() then
    raise exception using errcode = '42501', message = 'staff access required';
  end if;

  return query
  select
    r.id,
    r.reporter_id,
    r.target_type,
    r.target_id,
    r.reason,
    r.detail,
    r.status,
    r.reviewed_by,
    r.reviewed_at,
    r.created_at
  from public.reports r
  where status_filter is null or r.status = status_filter
  order by
    case r.status
      when 'received' then 0
      when 'triaged' then 1
      else 2
    end,
    r.created_at asc
  limit least(greatest(coalesce(page_size, 50), 1), 100);
end;
$$;

revoke all on table public.moderation_actions from public, anon, authenticated;
revoke all on function public.reject_moderation_action_mutation() from public, anon, authenticated;
revoke all on function public.review_report(uuid, public.report_status) from public, anon;
revoke all on function public.get_moderation_report_queue(public.report_status, integer) from public, anon;
grant execute on function public.review_report(uuid, public.report_status) to authenticated;
grant execute on function public.get_moderation_report_queue(public.report_status, integer) to authenticated;

comment on table public.moderation_actions is 'Immutable audit trail for staff moderation state changes.';
comment on function public.review_report(uuid, public.report_status) is 'Applies the approved report workflow and records the acting staff member.';
comment on function public.get_moderation_report_queue(public.report_status, integer) is 'Returns the private report queue to moderators and administrators only.';
