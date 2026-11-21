-- Member exchange + explicit, scoped external feedback. Existing posts keep their visibility.
create table public.feedback_tests (
 post_id uuid primary key references public.posts(id) on delete cascade,
 owner_id uuid not null references public.profiles(id) on delete cascade,
 stopped boolean not null default false, created_at timestamptz not null default now()
);
create table public.feedback_invites (
 id uuid primary key default gen_random_uuid(), post_id uuid not null references public.feedback_tests(post_id) on delete cascade,
 token_hash text not null unique check(token_hash ~ '^[a-f0-9]{64}$'), expires_at timestamptz not null,
 revoked_at timestamptz, created_at timestamptz not null default now()
);
create unique index feedback_one_live_link on public.feedback_invites(post_id) where revoked_at is null;
create table public.feedback_external_votes (
 id uuid primary key default gen_random_uuid(), invite_id uuid not null references public.feedback_invites(id) on delete cascade,
 visitor_hash text not null check(visitor_hash ~ '^[a-f0-9]{64}$'), choice public.vote_choice not null,
 note text check(note in ('clear','natural','lighting','background','crop')), created_at timestamptz not null default now(),
 unique(invite_id,visitor_hash)
);
create table public.feedback_vote_notes (
 post_id uuid not null, voter_id uuid not null, note text not null check(note in ('clear','natural','lighting','background','crop')),
 primary key(post_id,voter_id), foreign key(post_id,voter_id) references public.votes(post_id,voter_id) on delete cascade
);
create table public.feedback_budgets (
 day date not null default current_date, scope text not null, requests integer not null default 1,
 primary key(day,scope)
);
alter table public.feedback_tests enable row level security;
alter table public.feedback_invites enable row level security;
alter table public.feedback_external_votes enable row level security;
alter table public.feedback_vote_notes enable row level security;
alter table public.feedback_budgets enable row level security;
revoke all on public.feedback_tests,public.feedback_invites,public.feedback_external_votes,public.feedback_vote_notes,public.feedback_budgets from public,anon,authenticated;
grant all on public.feedback_tests,public.feedback_invites,public.feedback_external_votes,public.feedback_vote_notes,public.feedback_budgets to service_role;
-- No member/anonymous SELECT policies; all reads have bounded owner/token RPCs.
create function public.feedback_member_eligible(member uuid) returns boolean
language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.profiles where id=member and role='member'
 and lower(handle) not in ('master','facsteam','facs_team','mia_demo1','ethan_demo2','oliver_demo8','noah_demo4','grace_demo9','chloe_demo3','lucas_demo10','sofia_demo5','ava_demo7','liam_demo6') and lower(handle) not like 'qa\_%' escape '\');
$$;
create function public.feedback_exchange_balance(member uuid) returns bigint
language sql stable security definer set search_path=public as $$
 select greatest(0,
 (select count(*) from public.votes v where v.voter_id=member and public.feedback_member_eligible(v.voter_id))
 -(select count(*) from public.votes v join public.feedback_tests t on t.post_id=v.post_id where t.owner_id=member and public.feedback_member_eligible(v.voter_id)));
$$;
-- Only newly published ordinary-member photos join automatically; existing visibility is unchanged.
create function public.enroll_new_feedback_test()returns trigger language plpgsql security definer set search_path=public as $$
begin
 if old.status='draft' and new.status='published' and public.feedback_member_eligible(new.author_id) then
  insert into public.feedback_tests(post_id,owner_id)values(new.id,new.author_id) on conflict do nothing;
 end if;return new;end;$$;
create trigger enroll_new_feedback_test after update of status on public.posts for each row execute function public.enroll_new_feedback_test();
revoke all on function public.enroll_new_feedback_test() from public,anon,authenticated;
-- Fetch a bounded window from the existing personalized order. The page order
-- and visibility rules match get_personalized_feed_post_ids; the extra id is
-- used by the client only to determine whether another page exists.
create or replace function public.get_personalized_feed_post_page(
  page_size integer default 11,
  category_filter text default null,
  after_post_id uuid default null
)
returns table (post_id uuid, source text)
language sql stable security definer set search_path = public as $$
  with my_category_affinity as (
    select rated.category, count(*)::integer as score
    from public.votes my_vote
    join public.posts rated on rated.id = my_vote.post_id
    where my_vote.voter_id = auth.uid()
    group by rated.category
  ), candidates as (
    select
      p.id,
      p.published_at,
      case when exists(select 1 from public.feedback_tests t where t.post_id=p.id and not t.stopped) and p.author_id<>auth.uid() then least(3,1+public.feedback_exchange_balance(p.author_id)) else 0 end as exchange_rank,
      case when exists (
        select 1 from public.follows f
        where f.follower_id = auth.uid() and f.followed_id = p.author_id
      ) then 0 else 1 end as follow_rank,
      coalesce(affinity.score, 0) as affinity_score,
      case when exists (
        select 1
        from public.post_boosts b
        where b.post_id = p.id
          and b.status = 'active'
          and p.author_id <> auth.uid()
          and (
            select count(*)
            from public.votes boosted_votes
            where boosted_votes.post_id = p.id
              and boosted_votes.voter_id <> p.author_id
          ) < b.target_votes
      ) then 0 else 1 end as boost_rank,
      case when p.visibility = 'public' and p.published_at >= now() - interval '1 hour' then 0 else 1 end as fresh_public_rank,
      md5(p.id::text || auth.uid()::text || current_date::text) as daily_shuffle
    from public.posts p
    left join my_category_affinity affinity on affinity.category = p.category
    where public.current_member_can_view_post(p.author_id, p.status, p.visibility)
      and (category_filter is null or p.category = category_filter)
  ), ranked as (
    select id as post_id,
      case when boost_rank = 0 then 'boosted'
           when follow_rank = 0 then 'followed'
           when fresh_public_rank = 0 then 'new'
           when affinity_score > 0 then 'similar_interest'
           else 'discovery' end as source,
      row_number() over (
        order by
          exchange_rank desc,
          boost_rank asc,
          follow_rank asc,
          case when follow_rank = 0 then published_at end desc nulls last,
          fresh_public_rank asc,
          case when follow_rank = 1 and fresh_public_rank = 0 then published_at end desc nulls last,
          case when follow_rank = 1 and fresh_public_rank = 1 then affinity_score end desc,
          case when follow_rank = 1 and fresh_public_rank = 1 and affinity_score > 0 then published_at end desc nulls last,
          case when follow_rank = 1 and fresh_public_rank = 1 and affinity_score = 0 then daily_shuffle end asc,
          id asc
      ) as feed_position
    from candidates
  ), cursor_position as (
    select feed_position from ranked where post_id = after_post_id
  )
  select ranked.post_id, ranked.source
  from ranked
  where after_post_id is null
     or (exists (select 1 from cursor_position)
         and ranked.feed_position > (select min(feed_position) from cursor_position))
  order by ranked.feed_position
  limit least(greatest(coalesce(page_size, 11), 1), 21);
$$;


create function public.manage_feedback_test(target_post_id uuid,operation text,token_digest text default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare p public.posts; t public.feedback_tests; link_id uuid;
begin
 if auth.uid() is null then raise exception 'authentication required';end if;
 select * into p from public.posts where id=target_post_id for update;
 if p.id is null or p.author_id<>auth.uid() then raise exception 'not owned';end if;
 select * into t from public.feedback_tests where post_id=p.id;
 if operation='start' then
  if p.status<>'published' and not(p.status='archived' and t.stopped) then raise exception 'unavailable';end if;
  insert into public.feedback_tests(post_id,owner_id) values(p.id,auth.uid()) on conflict(post_id) do update set stopped=false;
  update public.posts set status='published' where id=p.id;
 elsif operation='stop' then
  if t.post_id is null or p.status<>'published' then raise exception 'unavailable';end if;
  update public.feedback_tests set stopped=true where post_id=p.id;
  update public.posts set status='archived' where id=p.id;
  update public.feedback_invites set revoked_at=now() where post_id=p.id and revoked_at is null;
 elsif operation='invite' then
  if t.post_id is null or t.stopped or p.status<>'published' or p.visibility<>'public' or p.evaluation<>'binary' then raise exception 'unavailable';end if;
  if not exists(select 1 from public.post_media pm join public.media_assets a on a.id=pm.asset_id where pm.post_id=p.id and pm.position=0 and a.state='ready' and a.media_type='image' and a.mime_type in ('image/jpeg','image/png','image/webp')) then raise exception 'image required';end if;
  if token_digest is null or token_digest !~ '^[a-f0-9]{64}$' then raise exception 'invalid token';end if;
  update public.feedback_invites set revoked_at=now() where post_id=p.id and revoked_at is null;
  insert into public.feedback_invites(post_id,token_hash,expires_at) values(p.id,token_digest,now()+interval '7 days') returning id into link_id;
 elsif operation='revoke' then
  update public.feedback_invites set revoked_at=now() where post_id=p.id and revoked_at is null;
 else raise exception 'unsupported operation';end if;
 return jsonb_build_object('ok',true);
end;$$;
create function public.save_feedback_note(target_post_id uuid,input_note text)
returns boolean language plpgsql security definer set search_path=public as $$
begin
 if not exists(select 1 from public.votes v join public.posts p on p.id=v.post_id where v.post_id=target_post_id and v.voter_id=auth.uid() and p.status='published' and public.current_member_can_view_post(p.author_id,p.status,p.visibility)) then raise exception 'vote required';end if;
 insert into public.feedback_vote_notes values(target_post_id,auth.uid(),input_note)
 on conflict(post_id,voter_id) do update set note=excluded.note;
 return true;
end;$$;
create function public.list_my_feedback_tests() returns jsonb
language sql stable security definer set search_path=public as $$
 select jsonb_build_object('balance',public.feedback_exchange_balance(auth.uid()),'posts',coalesce((
 select jsonb_agg(jsonb_build_object('id',q.id,'question',q.question,'category',q.category,'status',q.status,'managed',q.managed,'stopped',q.stopped,
 'memberVotes',q.member_votes,'inviteVotes',q.invite_votes,'inviteYes',q.invite_yes,'activeInvite',q.active_link,'notes',q.notes)) from (
 select p.id,p.question,p.category,p.status,t.post_id is not null as managed,coalesce(t.stopped,false) as stopped,
 (select count(*) from public.votes v where v.post_id=p.id) as member_votes,
 (select count(*) from public.feedback_external_votes v join public.feedback_invites i on i.id=v.invite_id where i.post_id=p.id) as invite_votes,
 (select count(*) from public.feedback_external_votes v join public.feedback_invites i on i.id=v.invite_id where i.post_id=p.id and v.choice='yes') as invite_yes,
 exists(select 1 from public.feedback_invites i where i.post_id=p.id and i.revoked_at is null and i.expires_at>now()) as active_link,
 (select coalesce(jsonb_object_agg(x.note,x.n),'{}'::jsonb) from(select note,count(*) n from public.feedback_vote_notes where post_id=p.id group by note)x) as notes
 from public.posts p left join public.feedback_tests t on t.post_id=p.id
 where p.author_id=auth.uid() and (p.status='published' or(p.status='archived' and t.stopped))
 order by p.published_at desc limit 50)q),'[]'::jsonb));
$$;
create function public.feedback_claim_budget(scope_key text,max_requests integer,units integer default 1) returns boolean
language plpgsql security definer set search_path=public as $$
declare n integer;
begin
 delete from public.feedback_budgets where day<current_date-2;
 insert into public.feedback_budgets(day,scope,requests) values(current_date,scope_key,greatest(1,units))
 on conflict(day,scope) do update set requests=feedback_budgets.requests+greatest(1,units) returning requests into n;
 return n<=max_requests;
end;$$;
create function public.read_feedback_invite(token_digest text) returns jsonb
language sql stable security definer set search_path=public as $$
 select jsonb_build_object('id',i.id,'postId',p.id,'question',p.question,'category',p.category,'storagePath',a.storage_path,'mime',a.mime_type,'size',a.byte_size)
 from public.feedback_invites i join public.feedback_tests t on t.post_id=i.post_id join public.posts p on p.id=t.post_id
 join public.post_media pm on pm.post_id=p.id and pm.position=0 join public.media_assets a on a.id=pm.asset_id
 where i.token_hash=token_digest and i.revoked_at is null and i.expires_at>now() and not t.stopped
 and p.status='published' and p.visibility='public' and p.evaluation='binary' and a.state='ready' and a.media_type='image'
 limit 1;
$$;
create function public.submit_feedback_invite(token_digest text,visitor_digest text,input_choice public.vote_choice,input_note text default null) returns boolean
language plpgsql security definer set search_path=public as $$
declare info jsonb; n integer;
begin
 select public.read_feedback_invite(token_digest) into info;
 if info is null then raise exception 'unavailable';end if;
 -- Serialize against stop/revoke and other submissions; recheck under the lock.
 perform 1 from public.posts where id=(info->>'postId')::uuid for update;
 select public.read_feedback_invite(token_digest) into info;
 if info is null then raise exception 'unavailable';end if;
 select count(*) into n from public.feedback_external_votes where invite_id=(info->>'id')::uuid;
 if n>=100 then raise exception 'limit';end if;
 insert into public.feedback_external_votes(invite_id,visitor_hash,choice,note) values((info->>'id')::uuid,visitor_digest,input_choice,input_note);
 return true;
end;$$;
create function public.admin_revoke_feedback_invite(target_post_id uuid) returns boolean
language plpgsql security definer set search_path=public as $$
begin
 if not public.current_member_is_staff() then raise exception 'forbidden';end if;
 perform 1 from public.posts where id=target_post_id for update;
 update public.feedback_invites set revoked_at=now() where post_id=target_post_id and revoked_at is null;
 return true;
end;$$;
revoke all on function public.feedback_member_eligible(uuid),public.feedback_exchange_balance(uuid),public.manage_feedback_test(uuid,text,text),public.save_feedback_note(uuid,text),public.list_my_feedback_tests(),public.get_personalized_feed_post_page(integer,text,uuid),public.feedback_claim_budget(text,integer,integer),public.read_feedback_invite(text),public.submit_feedback_invite(text,text,public.vote_choice,text),public.admin_revoke_feedback_invite(uuid) from public,anon,authenticated;
grant execute on function public.manage_feedback_test(uuid,text,text),public.save_feedback_note(uuid,text),public.list_my_feedback_tests(),public.get_personalized_feed_post_page(integer,text,uuid),public.admin_revoke_feedback_invite(uuid) to authenticated;
grant execute on function public.feedback_claim_budget(text,integer,integer),public.read_feedback_invite(text),public.submit_feedback_invite(text,text,public.vote_choice,text) to service_role;
create table public.feedback_invite_reports (
 invite_id uuid not null references public.feedback_invites(id) on delete cascade,
 visitor_hash text not null, reason text not null check(reason in ('privacy','harassment','other')),
 created_at timestamptz not null default now(), primary key(invite_id,visitor_hash)
);
alter table public.feedback_invite_reports enable row level security;
revoke all on public.feedback_invite_reports from public,anon,authenticated;
grant all on public.feedback_invite_reports to service_role;
create function public.report_feedback_invite(token_digest text,visitor_digest text,input_reason text)returns boolean
language plpgsql security definer set search_path=public as $$declare info jsonb;
begin select public.read_feedback_invite(token_digest) into info;if info is null then raise exception 'unavailable';end if;
 insert into public.feedback_invite_reports(invite_id,visitor_hash,reason)values((info->>'id')::uuid,visitor_digest,input_reason) on conflict do nothing;return true;end;$$;
create function public.list_feedback_invite_reports()returns jsonb language plpgsql security definer set search_path=public as $$declare result jsonb;
begin if not public.current_member_is_staff() then raise exception 'forbidden';end if;
 select coalesce(jsonb_agg(x),'[]'::jsonb) into result from(select i.post_id as "postId",r.reason,count(*) as count from public.feedback_invite_reports r join public.feedback_invites i on i.id=r.invite_id where i.revoked_at is null group by i.post_id,r.reason order by max(r.created_at) desc limit 20)x;return result;end;$$;
revoke all on function public.report_feedback_invite(text,text,text),public.list_feedback_invite_reports() from public,anon,authenticated;
grant execute on function public.report_feedback_invite(text,text,text) to service_role;
grant execute on function public.list_feedback_invite_reports() to authenticated;
notify pgrst,'reload schema';
