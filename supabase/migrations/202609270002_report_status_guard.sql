-- Keep report intake separate from operational review state. Members can
-- submit a reason for a visible post, but only staff RPCs may inspect a report,
-- transition it, or inspect the immutable audit trail.
drop policy if exists "members read own reports" on public.reports;
drop policy if exists "members submit own reports" on public.reports;
revoke all on table public.reports from public, anon, authenticated;

create or replace function public.submit_post_report(
  target_post_id uuid,
  input_reason public.report_reason
)
returns uuid
language plpgsql
security definer
set search_path = public as $$
declare
  current_user_id uuid := auth.uid();
  created_report_id uuid;
begin
  if current_user_id is null then
    raise exception using errcode = '42501', message = 'authentication required';
  end if;

  insert into public.reports (reporter_id, target_type, target_id, reason)
  values (current_user_id, 'post', target_post_id, input_reason)
  returning id into created_report_id;

  return created_report_id;
end;
$$;

create or replace function public.get_moderation_report_audit(target_report_id uuid)
returns table (
  report_id uuid,
  reason public.report_reason,
  current_status public.report_status,
  report_created_at timestamptz,
  reviewed_at timestamptz,
  action text,
  from_status public.report_status,
  to_status public.report_status,
  action_at timestamptz
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
    r.reason,
    r.status,
    r.created_at,
    r.reviewed_at,
    a.action,
    a.from_status,
    a.to_status,
    a.created_at
  from public.reports r
  left join public.moderation_actions a on a.report_id = r.id
  where r.id = target_report_id
  order by a.created_at asc nulls first;
end;
$$;

revoke all on function public.submit_post_report(uuid, public.report_reason) from public, anon;
grant execute on function public.submit_post_report(uuid, public.report_reason) to authenticated;
revoke all on function public.get_moderation_report_audit(uuid) from public, anon;
grant execute on function public.get_moderation_report_audit(uuid) to authenticated;

comment on function public.submit_post_report(uuid, public.report_reason) is
  'Accepts a member report without exposing or accepting operational review state.';
comment on function public.get_moderation_report_audit(uuid) is
  'Returns report reason and immutable review status history to staff only.';
