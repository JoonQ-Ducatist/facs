import test from 'node:test';
import assert from 'node:assert/strict';
import { isLocalQaAccountMode } from './localQaAccounts.js';

test('local QA account mode requires a localhost URL, development, and explicit query flag', () => {
  assert.equal(isLocalQaAccountMode('http://127.0.0.1:5173', '?qaAccounts=1', true), true);
  assert.equal(isLocalQaAccountMode('http://localhost:5173', '?qaAccounts=1', true), true);
  assert.equal(isLocalQaAccountMode('https://product-test-example.vercel.app', '?qaAccounts=1', true), false);
  assert.equal(isLocalQaAccountMode('http://127.0.0.1:5173', '', true), false);
  assert.equal(isLocalQaAccountMode('http://127.0.0.1:5173', '?qaAccounts=1', false), false);
});
