# Supabase migrations

`migrations/202609050001_core_mvp.sql` is the first server-side boundary for FACS.

It creates the minimum persistent model for authenticated profiles, posts, up to five owned media assets, one private vote per member, numeric-age ranges, and aggregate-only results. It also creates a private `facs-media` Storage bucket: browsers may upload only to their own ID prefix, and only authorized viewers can read post media. It does **not** create payment flow, a media-validation worker, a moderation queue, or an administrator console.

## Applying safely

Use a project-owner session, after reviewing the migration in the Supabase SQL editor or with the Supabase CLI. Do not paste a service-role key into this repository or a browser environment.

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

`VITE_AUTH_REDIRECT_URL` must be a fixed HTTPS callback on the same origin as `VITE_APP_ORIGIN`. Register that exact callback in Supabase Auth for the staging Preview deployment; do not derive redirects from `window.location.origin`, use a wildcard, or add OAuth client secrets to Vercel/browser variables. Configure Google, Apple, and Kakao client credentials only in the Supabase dashboard after the fixed Preview callback is approved.

The migration keeps `facs-media` private and grants no direct browser object policies. The next server step is an authenticated Edge Function that creates a pending `media_assets` row, validates ownership and limits, and returns a short-lived signed upload URL for a non-identifying `uploads/YYYY/MM/DD/...` path. A worker promotes an asset to `ready` only after media validation.

### Required staging verification before production

1. Test Magic Link, Google, Apple, and Kakao with two user-owned test accounts; do not use real customer accounts.
2. Confirm the callback accepts only the fixed staging Preview URL and shows a generic failure without provider error details.
3. Confirm a member cannot read raw votes, set their own role, cast a second vote, or access another member's pending media.
4. Confirm only authenticated users can execute `get_post_aggregate`; confirm public feed media is returned only through a future authorized signed-read path.
5. Record the migration version, test evidence, rollback owner, and Storage/Edge Function status before any production promotion.
