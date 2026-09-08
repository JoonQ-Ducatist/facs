# SMTP readiness

The verified transactional domain is `mail.factsmack.com`. When the separately approved SMTP step begins, use the following non-secret values in the Supabase dashboard:

- Host: `smtp.resend.com`
- Port: `465`
- Username: `resend`
- Sender: `auth@mail.factsmack.com`

Create a Resend **Sending access** API key only at the moment it is needed. Paste it directly into the Supabase SMTP password field; never add it to Vercel, browser variables, source code, tests, logs, or documentation.

Before saving, verify `validateSmtpReadiness` passes for the non-secret metadata. After saving, send a single user-owned test Magic Link and inspect the delivery result in Resend and Supabase Auth logs. Do not use customer addresses for this check.
