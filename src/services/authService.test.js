import test from 'node:test';
import assert from 'node:assert/strict';
import { AUTH_ACTION_ERROR, getOAuthRedirectUrl, verifyEmailOtp } from './authService.js';
import { withAuthPersistenceRedirect } from './supabaseClient.js';

test('OAuth redirects only after Supabase returns a complete HTTPS handoff URL', () => {
  assert.equal(getOAuthRedirectUrl({ url: 'https://accounts.example.com/authorize?state=opaque' }), 'https://accounts.example.com/authorize?state=opaque');
  assert.equal(getOAuthRedirectUrl({ url: 'http://accounts.example.com/authorize' }), null);
  assert.equal(getOAuthRedirectUrl({}), null);
});

test('session-only choice is retained in the authentication callback URL', () => {
  assert.equal(
    withAuthPersistenceRedirect('https://www.factsmack.com/auth/callback', false),
    'https://www.factsmack.com/auth/callback?facs_remember=0',
  );
  assert.equal(
    withAuthPersistenceRedirect('https://www.factsmack.com/auth/callback', true),
    'https://www.factsmack.com/auth/callback',
  );
});

test('email authentication exposes stable, user-safe failure codes', () => {
  assert.equal(AUTH_ACTION_ERROR.EMAIL_RATE_LIMITED, 'AUTH_EMAIL_RATE_LIMITED');
  assert.equal(AUTH_ACTION_ERROR.EMAIL_CODE_INVALID, 'AUTH_EMAIL_CODE_INVALID');
  assert.equal(AUTH_ACTION_ERROR.EMAIL_REDIRECT_REJECTED, 'AUTH_EMAIL_REDIRECT_REJECTED');
  assert.equal(AUTH_ACTION_ERROR.SIGN_OUT_FAILED, 'AUTH_SIGN_OUT_FAILED');
});

test('email code verification supports a legacy magic-link code only after the current type fails', async () => {
  const calls = [];
  const client = {
    auth: {
      verifyOtp: async (payload) => {
        calls.push(payload.type);
        return payload.type === 'magiclink' ? { error: null } : { error: { status: 400 } };
      },
    },
  };
  const result = await verifyEmailOtp(client, 'member@example.com', '123456');
  assert.deepEqual(calls, ['email', 'magiclink']);
  assert.equal(result.ok, true);
});

test('email code verification never treats an invalid code as valid', async () => {
  const client = { auth: { verifyOtp: async () => ({ error: { status: 400 } }) } };
  const result = await verifyEmailOtp(client, 'member@example.com', '000000');
  assert.equal(result.code, AUTH_ACTION_ERROR.EMAIL_CODE_INVALID);
});
