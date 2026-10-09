-- Store one immutable acceptance receipt per member and terms version.
create table if not exists public.member_terms_acceptances (
  member_id uuid not null references public.profiles(id) on delete cascade,
  terms_version text not null check (terms_version = 'terms-20261009-v1'),
  locale text not null check (locale in ('ko', 'en')),
  accepted_at timestamptz not null default now(),
  primary key (member_id, terms_version)
);

alter table public.member_terms_acceptances enable row level security;
revoke all on table public.member_terms_acceptances from public, anon, authenticated;
grant select on table public.member_terms_acceptances to authenticated;

drop policy if exists "members read their own terms acceptance" on public.member_terms_acceptances;
create policy "members read their own terms acceptance" on public.member_terms_acceptances
  for select to authenticated using (member_id = auth.uid());

create or replace function public.get_my_terms_acceptance_status()
returns table (terms_version text, locale text, accepted_at timestamptz)
language sql stable security definer set search_path = public as $$
  select acceptance.terms_version, acceptance.locale, acceptance.accepted_at
  from public.member_terms_acceptances acceptance
  where acceptance.member_id = auth.uid()
    and acceptance.terms_version = 'terms-20261009-v1'
  limit 1;
$$;

create or replace function public.accept_current_terms(input_locale text)
returns table (terms_version text, locale text, accepted_at timestamptz)
language plpgsql security definer set search_path = public as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then raise exception 'authentication required'; end if;
  if input_locale not in ('ko', 'en') then raise exception 'unsupported locale'; end if;

  insert into public.member_terms_acceptances (member_id, terms_version, locale)
  values (current_user_id, 'terms-20261009-v1', input_locale)
  on conflict on constraint member_terms_acceptances_pkey do nothing;

  return query
    select acceptance.terms_version, acceptance.locale, acceptance.accepted_at
    from public.member_terms_acceptances acceptance
    where acceptance.member_id = current_user_id
      and acceptance.terms_version = 'terms-20261009-v1';
end;
$$;

revoke all on function public.get_my_terms_acceptance_status() from public, anon;
grant execute on function public.get_my_terms_acceptance_status() to authenticated;
revoke all on function public.accept_current_terms(text) from public, anon;
grant execute on function public.accept_current_terms(text) to authenticated;
