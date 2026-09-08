/**
 * Validates only non-secret SMTP metadata before an administrator connects Supabase.
 * The API key itself must be entered only in the Supabase dashboard and is never
 * accepted, stored, or logged by the application.
 */
export function validateSmtpReadiness({ host, username, senderAddress, verifiedDomain } = {}) {
  const errors = [];
  if (host !== 'smtp.resend.com') errors.push('invalid_host');
  if (username !== 'resend') errors.push('invalid_username');
  if (!verifiedDomain) errors.push('domain_not_verified');
  const senderDomain = typeof senderAddress === 'string' ? senderAddress.split('@')[1] : null;
  if (!senderAddress || senderDomain !== verifiedDomain) errors.push('sender_outside_verified_domain');
  return { ok: errors.length === 0, errors };
}
