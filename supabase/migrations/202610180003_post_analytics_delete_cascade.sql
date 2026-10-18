-- SET NULL collided with the session/event/COALESCE(post_id) unique index
-- after deleting multiple posts from one session, stranding media-less posts.
-- Remove only telemetry belonging to the deleted post, not unrelated events.
begin;

alter table public.funnel_analytics_events
  drop constraint funnel_analytics_events_post_id_fkey;
alter table public.funnel_analytics_events
  add constraint funnel_analytics_events_post_id_fkey
  foreign key (post_id) references public.posts(id) on delete cascade;

commit;
