import test from 'node:test';
import assert from 'node:assert/strict';
import { EMAIL_OTP_LENGTH, isCompleteEmailOtp, sanitizeEmailOtp } from './emailOtp.js';

test('email OTP contract matches the six-digit Supabase email template', () => {
  assert.equal(EMAIL_OTP_LENGTH, 6);
  assert.equal(sanitizeEmailOtp('12a3456789'), '123456');
  assert.equal(isCompleteEmailOtp('123456'), true);
  assert.equal(isCompleteEmailOtp('12345'), false);
});
