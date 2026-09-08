import test from 'node:test';
import assert from 'node:assert/strict';
import { SCRAP_ERROR } from './scrapsApi.js';

test('Scraps exposes only generic client-safe failures', () => {
  assert.deepEqual(Object.values(SCRAP_ERROR), ['AUTH_REQUIRED', 'SCRAPS_UNAVAILABLE']);
});
