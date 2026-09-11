import test from 'node:test';
import assert from 'node:assert/strict';
import { EMAIL_OTP_LENGTH, isCompleteEmailOtp, sanitizeEmailOtp } from './emailOtp.js';

test('email OTP contract matches the eight-digit Supabase email template', () => {
  assert.equal(EMAIL_OTP_LENGTH, 8);
  assert.equal(sanitizeEmailOtp('12a3456789'), '12345678');
  assert.equal(isCompleteEmailOtp('12345678'), true);
  assert.equal(isCompleteEmailOtp('1234567'), false);
});
