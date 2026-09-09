import test from 'node:test';
import assert from 'node:assert/strict';
import { getOAuthRedirectUrl } from './authService.js';
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
