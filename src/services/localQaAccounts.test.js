import test from 'node:test';
import assert from 'node:assert/strict';
import { isLocalQaAccountMode } from './localQaAccounts.js';

test('local QA account mode requires local browser, local Supabase, development, and explicit query flag', () => {
  const localSupabase = 'http://127.0.0.1:54321';
  assert.equal(isLocalQaAccountMode('http://127.0.0.1:5173', '?qaAccounts=1', true, localSupabase), true);
  assert.equal(isLocalQaAccountMode('http://localhost:5173', '?qaAccounts=1', true, localSupabase), true);
  assert.equal(isLocalQaAccountMode('https://product-test-example.vercel.app', '?qaAccounts=1', true, localSupabase), false);
  assert.equal(isLocalQaAccountMode('http://127.0.0.1:5173', '?qaAccounts=1', true, 'https://project.supabase.co'), false);
  assert.equal(isLocalQaAccountMode('http://127.0.0.1:5173', '', true, localSupabase), false);
  assert.equal(isLocalQaAccountMode('http://127.0.0.1:5173', '?qaAccounts=1', false, localSupabase), false);
});
