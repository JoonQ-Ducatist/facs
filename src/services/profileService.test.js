import test from 'node:test';
import assert from 'node:assert/strict';
import { isConfiguredHandle, normalizeHandle } from './profileService.js';

test('a public handle is normalized without carrying an @ prefix', () => {
  assert.equal(normalizeHandle(' @My_Look '), 'my_look');
});

test('generated member handles never unlock public posting', () => {
  assert.equal(isConfiguredHandle('member_27cf48e1'), false);
  assert.equal(isConfiguredHandle('my_look_daily'), true);
  assert.equal(isConfiguredHandle('한글아이디'), false);
});
