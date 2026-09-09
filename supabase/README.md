# Supabase migrations

`migrations/202609050001_core_mvp.sql` is the target server-side boundary for FACS.

It describes the eventual persistent model for authenticated profiles, posts, owned media assets, one private vote per member, numeric-age ranges, and aggregate-only results. It does **not** create payment flow, a media-validation worker, a moderation queue, or an administrator console.

## Current deployed scope

The active Supabase project intentionally has the reduced core required for the current voting integration: `profiles`, `posts`, `votes`, the one-vote constraint and RLS policies, plus `get_post_aggregate`. The browser must not rely on `media_assets`, `post_media`, or the `facs-media` bucket being present. Those remain a separately reviewed upload milestone.

`src/services/supabaseApi.js` only writes a vote or creates a draft post; it does not access Storage or media tables. Prototype feed cards stay local until an authenticated UUID-backed feed is delivered.

`listSupabasePublishedPosts` is the non-wired preparation for that delivery. It reads only public, published `posts` fields, returns an empty page when Supabase is unavailable or fails, and never reads profiles, raw votes, media tables, or Storage.

## Applying safely

Do not apply the full target migration to the active production project without a new schema-diff review: parts of the reduced core already exist. Use a project-owner session, inspect the live schema first, then prepare an additive migration for the next approved milestone. Do not paste a service-role key into this repository or a browser environment.

Before applying in production, run the SQL in a non-production project and verify:

1. a new Auth user receives a profile;
2. a member cannot set their own role, read raw votes, or vote twice;
3. only a post author can view an `actual_age` value;
4. numeric votes outside the authored range fail;
5. `get_post_aggregate` exposes only aggregate data;
6. a user cannot list another user's pending Storage objects or retrieve a non-public asset by guessing its path.

## Staging-first Auth and Storage checklist

Before any SQL is applied, create a staging Supabase project and configure only public browser values in the matching local or Vercel environment:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY` (or the temporary `VITE_SUPABASE_ANON_KEY` compatibility alias)
- `VITE_APP_ORIGIN`
- `VITE_AUTH_REDIRECT_URL`

`VITE_AUTH_REDIRECT_URL` must be a fixed HTTPS callback on the same origin as `VITE_APP_ORIGIN`. Register that exact callback in Supabase Auth for the staging Preview deployment; do not derive redirects from `window.location.origin`, use a wildcard, or add OAuth client secrets to Vercel/browser variables. Configure Google and Kakao client credentials only in the Supabase dashboard after the fixed Preview callback is approved. Apple sign-in stays disabled and hidden until the Apple Developer enrollment is active.

The migration keeps `facs-media` private and grants no direct browser object policies. The next server step is an authenticated Edge Function that creates a pending `media_assets` row, validates ownership and limits, and returns a short-lived signed upload URL for a non-identifying `uploads/YYYY/MM/DD/...` path. A worker promotes an asset to `ready` only after media validation.

### Required staging verification before the media milestone

1. Test Magic Link, Google, Apple, and Kakao with two user-owned test accounts; do not use real customer accounts.
2. Confirm the callback accepts only the fixed staging Preview URL and shows a generic failure without provider error details.
3. Confirm a member cannot read raw votes, set their own role, cast a second vote, or access another member's pending media.
4. Confirm only authenticated users can execute `get_post_aggregate`; confirm public feed media is returned only through a future authorized signed-read path.

## Live reaction events (separate approval)

`202609100001_live_reaction_events.sql` introduces a one-hour, anonymous presentation stream for Result screens. It emits the selected `Y`, `N`, or perceived-age number plus aggregate counters, but never a voter handle, email, account id, or raw vote row. Only a post author and a member who evaluated that exact post can subscribe. The server clock enforces the one-hour period.

Apply this migration only after approving the product policy that these anonymous individual values may be shown to the post author and eligible evaluators.
5. Record the migration version, test evidence, rollback owner, and Storage/Edge Function status before any production promotion.
