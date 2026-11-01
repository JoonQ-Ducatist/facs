-- Optional growth features; ordinary uploads and existing voting contracts remain intact.
begin;
alter table public.posts add column if not exists comparison_mode text;
alter table public.posts add column if not exists allow_share_preview boolean not null default false;
alter table public.posts add constraint posts_comparison_mode_valid check (comparison_mode is null or (comparison_mode='A_B' and evaluation='binary'));

create or replace function public.enforce_comparison_media() returns trigger language plpgsql set search_path=public as $$
begin
 if new.comparison_mode='A_B' and new.status='published' and
    (select count(*)=2 and bool_and(a.media_type='image') from public.post_media m join public.media_assets a on a.id=m.asset_id where m.post_id=new.id) is not true then
  raise exception using errcode='22023',message='comparison requires exactly two photos';
 end if;
 return new;
end; $$;
create trigger posts_comparison_media_guard before insert or update of status,comparison_mode on public.posts for each row execute function public.enforce_comparison_media();

create or replace function public.create_post_upload_with_options(
 input_category text,input_evaluation public.evaluation_type,input_question text,input_age_min smallint,input_age_max smallint,input_media jsonb,input_visibility public.post_visibility,input_rights_confirmed boolean,input_rights_document_version text,
 input_comparison_mode text default null,input_allow_share_preview boolean default false
) returns table(post_id uuid,asset_id uuid,storage_path text,media_position smallint)
language plpgsql security definer set search_path=public,storage as $$
declare prepared record; created_id uuid;
begin
 if auth.uid() is null then raise exception 'authentication required'; end if;
 if input_comparison_mode is not null and input_comparison_mode<>'A_B' then raise exception 'unsupported comparison'; end if;
 if input_comparison_mode='A_B' and (input_evaluation<>'binary' or jsonb_array_length(input_media)<>2 or exists(select 1 from jsonb_array_elements(input_media) x where x->>'type'<>'image')) then raise exception using errcode='22023',message='comparison requires exactly two photos'; end if;
 if input_allow_share_preview and input_visibility<>'public' then raise exception 'public preview requires public visibility'; end if;
 for prepared in select * from public.create_post_upload_with_visibility(input_category,input_evaluation,input_question,input_age_min,input_age_max,input_media,input_visibility,input_rights_confirmed,input_rights_document_version) loop
  created_id:=prepared.post_id;post_id:=prepared.post_id;asset_id:=prepared.asset_id;storage_path:=prepared.storage_path;media_position:=prepared.media_position;return next;
 end loop;
 update public.posts set comparison_mode=input_comparison_mode,allow_share_preview=coalesce(input_allow_share_preview,false) where id=created_id and author_id=auth.uid() and status='draft';
end; $$;
revoke all on function public.create_post_upload_with_options(text,public.evaluation_type,text,smallint,smallint,jsonb,public.post_visibility,boolean,text,text,boolean) from public;
grant execute on function public.create_post_upload_with_options(text,public.evaluation_type,text,smallint,smallint,jsonb,public.post_visibility,boolean,text,text,boolean) to authenticated;

create or replace function public.get_waiting_feed_post_page(page_size integer default 11,category_filter text default null,after_post_id uuid default null)
returns table(post_id uuid,source text) language sql stable security definer set search_path=public as $$
 with boundary as(select p.published_at,p.id from public.posts p where p.id=after_post_id and public.current_member_can_view_post(p.author_id,p.status,p.visibility))
 select p.id,'awaiting_ratings'::text from public.posts p
 where auth.uid() is not null and p.author_id<>auth.uid() and p.status='published' and p.visibility='public'
 and public.current_member_can_view_post(p.author_id,p.status,p.visibility)
 and (category_filter is null or p.category=category_filter)
 and not exists(select 1 from public.votes v where v.post_id=p.id and v.voter_id=auth.uid())
 and (select count(*) from public.votes v where v.post_id=p.id and v.voter_id<>p.author_id)<=10
 and (after_post_id is null or exists(select 1 from boundary b where (p.published_at,p.id)<(b.published_at,b.id)))
 order by p.published_at desc,p.id desc limit least(greatest(coalesce(page_size,11),1),21);
$$;
revoke all on function public.get_waiting_feed_post_page(integer,text,uuid) from public;
grant execute on function public.get_waiting_feed_post_page(integer,text,uuid) to authenticated;

-- Only the server may see storage paths or delivery endpoints.
create or replace function public.get_public_share_preview(target_post_id uuid)
returns table(post_id uuid,question text,comparison_mode text,storage_path text,mime_type text,byte_size bigint)
language sql stable security definer set search_path=public as $$
 select p.id,p.question,p.comparison_mode,a.storage_path,a.mime_type,a.byte_size::bigint
 from public.posts p join public.post_media m on m.post_id=p.id and m.position=0 join public.media_assets a on a.id=m.asset_id
 where p.id=target_post_id and p.status='published' and p.visibility='public' and p.allow_share_preview
;
$$;
revoke all on function public.get_public_share_preview(uuid) from public,anon,authenticated;
grant execute on function public.get_public_share_preview(uuid) to service_role;

create table public.growth_request_budgets(day date not null,scope text not null,requests integer not null default 0,primary key(day,scope));
alter table public.growth_request_budgets enable row level security;
revoke all on public.growth_request_budgets from anon,authenticated;
create or replace function public.claim_public_preview_request() returns boolean language plpgsql security definer set search_path=public as $$
declare n integer;
begin
 insert into public.growth_request_budgets(day,scope,requests) values(current_date,'share-image',1)
 on conflict(day,scope) do update set requests=growth_request_budgets.requests+1 where growth_request_budgets.requests<50 returning requests into n;
 return n is not null;
end; $$;
revoke all on function public.claim_public_preview_request() from public,anon,authenticated;
grant execute on function public.claim_public_preview_request() to service_role;

create table public.push_subscriptions(
 id uuid primary key default gen_random_uuid(),member_id uuid not null references public.profiles(id) on delete cascade,
 endpoint_hash text not null unique,subscription jsonb not null,locale text not null default 'en' check(locale in('en','ko')),
 updated_at timestamptz not null default now()
);
alter table public.push_subscriptions enable row level security;
revoke all on public.push_subscriptions from anon,authenticated;
create table public.first_rating_notifications(
 post_id uuid primary key references public.posts(id) on delete cascade,author_id uuid not null references public.profiles(id) on delete cascade,
 state text not null check(state in('baseline','pending','sent')),claimed_at timestamptz not null default now()
);
alter table public.first_rating_notifications enable row level security;
revoke all on public.first_rating_notifications from anon,authenticated;
-- Do not notify about ratings received before this feature was installed.
insert into public.first_rating_notifications(post_id,author_id,state)
 select p.id,p.author_id,'baseline' from public.posts p where exists(select 1 from public.votes v where v.post_id=p.id and v.voter_id<>p.author_id) on conflict do nothing;
create or replace function public.claim_first_rating_notice(target_post_id uuid,verified_voter_id uuid)
returns uuid language plpgsql security definer set search_path=public as $$
declare owner_id uuid; claimed_id uuid;
begin
 select p.author_id into owner_id from public.posts p where p.id=target_post_id and p.status='published' and p.author_id<>verified_voter_id
 and exists(select 1 from public.votes v where v.post_id=p.id and v.voter_id=verified_voter_id)
 and not public.members_are_blocked(p.author_id,verified_voter_id)
 and (p.visibility='public' or exists(select 1 from public.follows f where f.follower_id=verified_voter_id and f.followed_id=p.author_id));
 if owner_id is null or not exists(select 1 from public.push_subscriptions s where s.member_id=owner_id) then return null; end if;
 insert into public.first_rating_notifications(post_id,author_id,state) values(target_post_id,owner_id,'pending')
 on conflict(post_id) do update set claimed_at=now() where first_rating_notifications.state='pending' and first_rating_notifications.claimed_at<now()-interval '15 minutes'
 returning author_id into claimed_id;
 return claimed_id;
end; $$;
revoke all on function public.claim_first_rating_notice(uuid,uuid) from public,anon,authenticated;
grant execute on function public.claim_first_rating_notice(uuid,uuid) to service_role;

create table public.growth_integration_cache(cache_key text primary key,payload jsonb not null,expires_at timestamptz not null,updated_at timestamptz not null default now());
alter table public.growth_integration_cache enable row level security;
revoke all on public.growth_integration_cache from anon,authenticated;

grant select,insert,update,delete on public.push_subscriptions,public.first_rating_notifications,public.growth_integration_cache,public.growth_request_budgets to service_role;

create or replace function public.get_growth_member_metrics(window_hours integer default 720)
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare since_time timestamptz:=now()-make_interval(hours=>least(greatest(coalesce(window_hours,720),1),720)); result jsonb;
begin
 if not exists(select 1 from public.profiles where id=auth.uid() and role='admin') then raise exception using errcode='42501',message='admin required'; end if;
 with members as(select id,created_at from public.profiles where role not in('admin','moderator') and handle is not null and lower(handle) not in('master','facsteam','facs_team','mia_demo1','ethan_demo2','chloe_demo3','noah_demo4','sofia_demo5','liam_demo6','ava_demo7','oliver_demo8','grace_demo9','lucas_demo10') and lower(handle) not like 'qa\_%' escape '\')
 select jsonb_build_object(
 'new_members',(select count(*) from members where created_at>=since_time),
 'uploaders',(select count(distinct p.author_id) from public.posts p join members m on m.id=p.author_id where p.status='published' and p.published_at>=since_time),
 'published_posts',(select count(*) from public.posts p join members m on m.id=p.author_id where p.status='published' and p.published_at>=since_time),
 'voters',(select count(distinct v.voter_id) from public.votes v join members m on m.id=v.voter_id where v.created_at>=since_time),
 'votes',(select count(*) from public.votes v join members m on m.id=v.voter_id where v.created_at>=since_time)) into result;
 return result;
end; $$;
revoke all on function public.get_growth_member_metrics(integer) from public;
grant execute on function public.get_growth_member_metrics(integer) to authenticated;

create or replace function public.purge_growth_metadata() returns void language sql security definer set search_path=public as $$
 delete from public.growth_request_budgets where day<current_date-7;
 delete from public.growth_integration_cache where expires_at<now()-interval '7 days';
 delete from public.push_subscriptions where updated_at<now()-interval '90 days';
$$;
revoke all on function public.purge_growth_metadata() from public,anon,authenticated;
grant execute on function public.purge_growth_metadata() to service_role;
-- Reuse the project's existing pg_cron extension; no extra external service.
select cron.schedule('facs-growth-metadata-daily','23 3 * * *','select public.purge_growth_metadata();');
commit;
