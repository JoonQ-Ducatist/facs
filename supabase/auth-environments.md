# FACS authentication environments

## Development: local Supabase + Mailpit

Local authentication never sends a real email. Supabase CLI captures Magic
Links in Mailpit at `http://127.0.0.1:54324`.

1. Install Docker Desktop once. It is started automatically by `npm run dev:local`.
2. Run `npm run supabase:status` and copy the local API URL and anon key into
   an ignored `.env.local` file as `VITE_SUPABASE_URL` and
   `VITE_SUPABASE_ANON_KEY`.
3. Set `VITE_APP_ORIGIN=http://127.0.0.1:5173` and
   `VITE_AUTH_REDIRECT_URL=http://127.0.0.1:5173/auth/callback`.
4. Run `npm run dev:local`. It starts Docker Desktop when needed, then local
   Supabase, Mailpit, and FACS in that order.
5. Request a Magic Link and open Mailpit to complete it.

The local project permits a 1 second resend interval and a high test-mail
limit. Those settings live only in `supabase/config.toml` and never affect
production.

## RLS QA: isolated remote staging project

Use this path when RLS, Auth, follow, or visibility behavior must be tested
against Supabase Postgres rather than the local emulator. It is a local-only
browser configuration: do not put these values in Vercel, `main`, a preview
environment, or a committed file.

### Approval gate and project readiness

Creating a separate Supabase project, applying migrations, inviting test
accounts, or changing Auth providers requires project-owner approval. Confirm
the project is on the free plan, has no paid add-ons, and is isolated from the
production project. Record only the project reference and migration version in
the QA report; never record keys, passwords, or test email addresses.

Before any SQL is applied, the owner should confirm:

1. the staging project is a separate project reference;
2. the project is paused or deleted after QA if it is no longer needed;
3. Auth redirect URLs include only the local callback used for this test;
4. the migration list and rollback owner are known;
5. the two tester accounts are user-owned test accounts, not customer accounts.

### Safe local-only environment switch

`.env.local` is ignored by Git. Back up the current local file outside Git,
replace only the four public browser values below with the **staging** project
values, then restart Vite. Do not set a production URL while running the RLS
suite and do not add a service-role key.

```dotenv
VITE_SUPABASE_URL=https://<staging-project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<staging-publishable-key>
VITE_APP_ORIGIN=http://127.0.0.1:5173
VITE_AUTH_REDIRECT_URL=http://127.0.0.1:5173/auth/callback
```

The exact same-origin callback must be registered in the staging project's
Supabase Auth URL configuration. Verify the switch before opening the app by
checking that the URL project reference is the staging reference and that the
running process was restarted after editing `.env.local`. Do not print the
publishable key in logs or screenshots.

### A/B RLS verification plan

Run the matrix with two authenticated test sessions, called **A** and **B** in
notes. Do not write their email addresses into the repository or QA artifact.

| Area | A should be able to | B / anonymous must not be able to |
|---|---|---|
| Auth/profile | sign in, read/update only A's profile fields allowed by policy | read private account fields or change A's role/identity |
| Posts/media | read A's own drafts/private posts and permitted public posts | read A's draft/private post or guess a non-public media object |
| Votes | cast one eligible vote and receive aggregate/result state | read raw votes, voter identity, or cast a duplicate vote |
| Follows | create/delete only A-owned follow rows; view allowed relationship state | create self-follow, mutate A/B's other rows, or infer vote identity |
| Visibility | see public posts and explicitly permitted followed/private content | see blocked, hidden, pending, or unrelated private content |

Capture only pass/fail, safe error class, project reference, migration version,
and timestamp. A browser UI success is not sufficient evidence for RLS: each
case must be checked through the authenticated Supabase client/API response.

### Verification and complete rollback

1. Stop the dev server before changing `.env.local`.
2. Save the staging-only file outside the repository, then start the app with
   the staging values and run the matrix above.
3. Stop the app, restore the previous local environment file, and restart.
4. Confirm the app points to the previous local/approved project reference and
   that no staging key remains in the shell, terminal history, screenshots, or
   Vercel settings.
5. If the staging project was created only for this suite, the owner decides
   whether to pause or delete it from the Supabase dashboard. That action is a
   separate approval gate and is never automated by this repository.

No production migration, production Auth setting, Vercel variable, or operating
database is changed by this procedure.

## Production: Resend SMTP

The Supabase built-in email provider is not suitable for FACS production. In
Supabase Dashboard, configure Authentication > Email > SMTP Settings with:

- Host: `smtp.resend.com`
- Port: `465` (SSL)
- Username: `resend`
- Password: a Resend Sending access API key, entered only in the dashboard
- Sender: `auth@mail.factsmack.com`
- Sender name: `FACt.Smack`

Confirm `mail.factsmack.com` is verified in Resend before saving. Never place
the SMTP password in Vercel, browser variables, source code, or this file.

Then use Authentication > Rate Limits to set the email-sent project limit to
`120` per hour for the MVP, and retain practical IP verification limits. This
removes Supabase's built-in 2-emails-per-hour ceiling while preserving abuse
protection. Keep the per-user Magic Link resend interval at 60 seconds in
production; real repeated-flow testing belongs in local Mailpit rather than
the customer-facing sender.

Before launch, use a non-team email address to request one Magic Link and
verify: delivery, callback, session creation, Feed landing, and session
persistence after a refresh.
