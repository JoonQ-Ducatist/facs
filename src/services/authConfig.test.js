import test from 'node:test';
import assert from 'node:assert/strict';
import { AUTH_CONFIG_ERROR, AUTH_PROVIDER, getAuthCallbackCode, getAuthCallbackFailure, getPublicAuthConfig } from './authConfig.js';

const baseEnvironment = {
  VITE_SUPABASE_URL: 'https://staging-ref.supabase.co',
  VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_example',
  VITE_APP_ORIGIN: 'https://facs-preview.example',
  VITE_AUTH_REDIRECT_URL: 'https://facs-preview.example/auth/callback',
};

test('public Auth config accepts a fixed same-origin HTTPS callback', () => {
  const config = getPublicAuthConfig(baseEnvironment);
  assert.equal(config.ok, true);
  assert.equal(config.redirectTo, 'https://facs-preview.example/auth/callback');
});

test('public Auth config allows the temporary anon-key alias during migration', () => {
  const environment = { ...baseEnvironment, VITE_SUPABASE_PUBLISHABLE_KEY: '', VITE_SUPABASE_ANON_KEY: 'legacy-public-key' };
  assert.equal(getPublicAuthConfig(environment).ok, true);
});

test('public Auth config rejects a dynamic cross-origin callback', () => {
  const config = getPublicAuthConfig({ ...baseEnvironment, VITE_AUTH_REDIRECT_URL: 'https://unexpected.example/callback' });
  assert.deepEqual(config, { ok: false, code: AUTH_CONFIG_ERROR.INVALID_REDIRECT_URL });
});

test('callback failures are surfaced without exposing provider error details', () => {
  assert.equal(getAuthCallbackFailure('?error=access_denied&error_description=private'), 'AUTH_CALLBACK_FAILED');
  assert.equal(getAuthCallbackFailure('?locale=ko'), null);
});

test('PKCE callback code is read only from the callback query string', () => {
  assert.equal(getAuthCallbackCode('?code=one-time-code&locale=ko'), 'one-time-code');
  assert.equal(getAuthCallbackCode('?locale=ko'), null);
});

test('only approved social providers are available before Apple enrollment', () => {
  assert.deepEqual(AUTH_PROVIDER, ['google', 'kakao']);
});
