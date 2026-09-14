import test from 'node:test';
import assert from 'node:assert/strict';
import { canSubmitHandle, getHandleSuggestions, getPublicHandle, isConfiguredHandle, mapHandleSaveResult, normalizeHandle } from './profileService.js';

test('a public handle is normalized without carrying an @ prefix', () => {
  assert.equal(normalizeHandle(' @My_Look '), 'my_look');
  assert.equal(normalizeHandle('@user_b'), 'user_b');
});

test('profile header uses each persisted account handle as its single source of truth', () => {
  assert.equal(getPublicHandle({ handle: '@user_b' }), 'user_b');
  assert.equal(getPublicHandle({ handle: 'account_a' }), 'account_a');
  assert.notEqual(getPublicHandle({ handle: 'account_a' }), getPublicHandle({ handle: 'account_b' }));
  assert.equal(getPublicHandle({ handle: 'member_abc123' }), null);
});

test('valid handle can be submitted when availability is unknown, but invalid or occupied values stay blocked', () => {
  assert.equal(canSubmitHandle({ handle: '@user_b', available: null }), true);
  assert.equal(canSubmitHandle({ handle: 'user_b', available: true }), true);
  assert.equal(canSubmitHandle({ handle: 'user_b', available: false }), false);
  assert.equal(canSubmitHandle({ handle: 'ab', available: null }), false);
  assert.equal(canSubmitHandle({ handle: 'user_b', checking: true, available: null }), false);
});

test('profile save adapts the shared API envelope for success, duplicate, and permission failures', () => {
  assert.deepEqual(mapHandleSaveResult({ data: { id: 'a', handle: 'user_a' } }), { ok: true, data: { id: 'a', handle: 'user_a' } });
  assert.deepEqual(mapHandleSaveResult({ error: { code: 'VALIDATION_FAILED', message: 'duplicate' } }), { ok: false, message: 'duplicate' });
  assert.equal(mapHandleSaveResult({ data: { id: 'a', handle: 'member_placeholder' } }).ok, false);
});

test('generated member handles never unlock public posting', () => {
  assert.equal(isConfiguredHandle('member_27cf48e1'), false);
  assert.equal(isConfiguredHandle('my_look_daily'), true);
  assert.equal(isConfiguredHandle('한글아이디'), false);
});

test('starter handle suggestions are stable and use valid public-handle syntax', () => {
  const suggestions = getHandleSuggestions('member_27cf48e1');
  assert.deepEqual(suggestions, getHandleSuggestions('member_27cf48e1'));
  assert.equal(suggestions.every((handle) => isConfiguredHandle(handle)), true);
  assert.equal(new Set(suggestions).size, 3);
});
