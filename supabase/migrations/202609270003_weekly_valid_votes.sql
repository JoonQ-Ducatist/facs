-- Closed-beta readiness metric. Raw votes remain private; staff receive only
-- the count of canonical, currently valid votes from the rolling seven days.
create or replace function public.get_weekly_valid_vote_count()
returns bigint
language plpgsql
stable
security definer
set search_path = public as $$
declare
  valid_vote_count bigint;
begin
  if auth.uid() is null or not public.current_member_is_staff() then
    raise exception using errcode = '42501', message = 'staff access required';
  end if;

  select count(*)
    into valid_vote_count
  from public.votes v
  join public.posts p on p.id = v.post_id
  where v.created_at >= now() - interval '7 days'
    and p.status = 'published'
    and p.author_id <> v.voter_id;

  return valid_vote_count;
end;
$$;

revoke all on function public.get_weekly_valid_vote_count() from public, anon;
grant execute on function public.get_weekly_valid_vote_count() to authenticated;

comment on function public.get_weekly_valid_vote_count() is
  'Returns only the rolling seven-day count of canonical votes on published posts to staff.';
