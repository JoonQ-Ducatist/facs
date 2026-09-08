import test from 'node:test';
import assert from 'node:assert/strict';
import { validateSmtpReadiness } from './smtpReadiness.js';

test('SMTP readiness accepts Resend metadata without handling an API key', () => {
  assert.deepEqual(validateSmtpReadiness({ host: 'smtp.resend.com', username: 'resend', senderAddress: 'auth@mail.factsmack.com', verifiedDomain: 'mail.factsmack.com' }), { ok: true, errors: [] });
});

test('SMTP readiness rejects an unverified sender domain', () => {
  const result = validateSmtpReadiness({ host: 'smtp.resend.com', username: 'resend', senderAddress: 'auth@factsmack.com', verifiedDomain: 'mail.factsmack.com' });
  assert.equal(result.ok, false);
  assert.ok(result.errors.includes('sender_outside_verified_domain'));
});
