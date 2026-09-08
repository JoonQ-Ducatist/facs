import test from 'node:test';
import assert from 'node:assert/strict';
import { getOAuthRedirectUrl } from './authService.js';

test('OAuth redirects only after Supabase returns a complete HTTPS handoff URL', () => {
  assert.equal(getOAuthRedirectUrl({ url: 'https://accounts.example.com/authorize?state=opaque' }), 'https://accounts.example.com/authorize?state=opaque');
  assert.equal(getOAuthRedirectUrl({ url: 'http://accounts.example.com/authorize' }), null);
  assert.equal(getOAuthRedirectUrl({}), null);
});
