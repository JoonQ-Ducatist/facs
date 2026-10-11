-- RLS decides which private scrap rows a member may access, but PostgREST also
-- requires table privileges before it can evaluate those policies. Earlier
-- sample cards used local browser storage, so this omission surfaced only once
-- the Feed moved to real UUID-backed posts.
grant select, insert, delete on table public.scraps to authenticated;

comment on table public.scraps is
  'Private bookmarks. Authenticated table privileges are constrained by owner-scoped RLS policies.';
