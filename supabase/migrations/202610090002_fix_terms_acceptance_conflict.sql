-- Avoid PL/pgSQL ambiguity between the RETURNS TABLE output variable
-- `terms_version` and the matching column in the conflict target.
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

revoke all on function public.accept_current_terms(text) from public, anon;
grant execute on function public.accept_current_terms(text) to authenticated;
