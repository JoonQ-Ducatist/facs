-- RLS decides which events a member can read, but the authenticated role
-- also needs table-level SELECT for PostgREST and Realtime delivery.
-- This table contains anonymous reaction and aggregate fields only.
revoke select on public.post_live_reaction_events from anon;
grant select on public.post_live_reaction_events to authenticated;
