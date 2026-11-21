-- Surface the existing invitation notes separately from member notes.
create or replace function public.list_my_feedback_tests() returns jsonb
language sql stable security definer set search_path=public as $$
 select jsonb_build_object('balance',public.feedback_exchange_balance(auth.uid()),'posts',coalesce((
 select jsonb_agg(jsonb_build_object('id',q.id,'question',q.question,'category',q.category,'status',q.status,'managed',q.managed,'stopped',q.stopped,
 'memberVotes',q.member_votes,'inviteVotes',q.invite_votes,'inviteYes',q.invite_yes,'activeInvite',q.active_link,'notes',q.notes,'inviteNotes',q.invite_notes)) from (
 select p.id,p.question,p.category,p.status,t.post_id is not null as managed,coalesce(t.stopped,false) as stopped,
 (select count(*) from public.votes v where v.post_id=p.id) as member_votes,
 (select count(*) from public.feedback_external_votes v join public.feedback_invites i on i.id=v.invite_id where i.post_id=p.id) as invite_votes,
 (select count(*) from public.feedback_external_votes v join public.feedback_invites i on i.id=v.invite_id where i.post_id=p.id and v.choice='yes') as invite_yes,
 exists(select 1 from public.feedback_invites i where i.post_id=p.id and i.revoked_at is null and i.expires_at>now()) as active_link,
 (select coalesce(jsonb_object_agg(x.note,x.n),'{}'::jsonb) from(select note,count(*) n from public.feedback_vote_notes where post_id=p.id group by note)x) as notes,
 (select coalesce(jsonb_object_agg(x.note,x.n),'{}'::jsonb) from(select v.note,count(*) n from public.feedback_external_votes v join public.feedback_invites i on i.id=v.invite_id where i.post_id=p.id and v.note is not null group by v.note)x) as invite_notes
 from public.posts p left join public.feedback_tests t on t.post_id=p.id
 where p.author_id=auth.uid() and (p.status='published' or(p.status='archived' and t.stopped))
 order by p.published_at desc limit 50)q),'[]'::jsonb));
$$;

notify pgrst,'reload schema';
