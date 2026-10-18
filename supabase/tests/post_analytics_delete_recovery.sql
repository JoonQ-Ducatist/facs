-- Run on staging only. Every fixture and deletion is rolled back.
begin;
do $$
declare
  owner_id uuid := (select id from public.profiles where handle = 'qa_uploader');
  first_post uuid := gen_random_uuid();
  second_post uuid := gen_random_uuid();
  session uuid := gen_random_uuid();
begin
  if owner_id is null then raise exception 'staging QA owner is missing'; end if;
  insert into public.posts (id, author_id, category, evaluation, question)
    values (first_post, owner_id, 'outfit', 'binary', '[ROLLBACK QA] first'),
           (second_post, owner_id, 'outfit', 'binary', '[ROLLBACK QA] second');
  insert into public.funnel_analytics_events (session_id, event_name, post_id)
    values (session, 'upload_completed', null),
           (session, 'upload_completed', first_post),
           (session, 'upload_completed', second_post);
  perform set_config('request.jwt.claims', json_build_object('sub', owner_id, 'role', 'authenticated')::text, true);
  perform public.delete_my_post(first_post);
  perform public.delete_my_post(second_post);
  if exists (select 1 from public.posts where id in (first_post, second_post)) then
    raise exception 'post deletion did not complete';
  end if;
  if (select count(*) from public.funnel_analytics_events where session_id = session) <> 1 then
    raise exception 'unrelated analytics event was removed or linked event was retained';
  end if;
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  begin
    perform public.delete_my_post(first_post);
    raise exception 'unauthenticated delete unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
  raise notice 'PASS: two same-session deletes; unrelated telemetry preserved; unauthenticated delete denied';
end $$;
rollback;
