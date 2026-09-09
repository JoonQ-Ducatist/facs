# FACS authentication environments

## Development: local Supabase + Mailpit

Local authentication never sends a real email. Supabase CLI captures Magic
Links in Mailpit at `http://127.0.0.1:54324`.

1. Install and open Docker Desktop.
2. Run `npm run supabase:start` from the repository root.
3. Run `npm run supabase:status` and copy the local API URL and anon key into
   an ignored `.env.local` file as `VITE_SUPABASE_URL` and
   `VITE_SUPABASE_ANON_KEY`.
4. Set `VITE_APP_ORIGIN=http://127.0.0.1:5173` and
   `VITE_AUTH_REDIRECT_URL=http://127.0.0.1:5173/auth/callback`.
5. Run `npm run dev`, request a Magic Link, and open Mailpit to complete it.

The local project permits a 1 second resend interval and a high test-mail
limit. Those settings live only in `supabase/config.toml` and never affect
production.

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
