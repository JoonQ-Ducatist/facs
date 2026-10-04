import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const policy = await readFile(new URL('./LegalPolicyDialog.jsx', import.meta.url), 'utf8');
const app = await readFile(new URL('../../App.jsx', import.meta.url), 'utf8');
const auth = await readFile(new URL('../auth/AuthEntryView.jsx', import.meta.url), 'utf8');

test('legal policy dialog provides terms, privacy, and safety notices in Korean and English', () => {
  for (const key of ['terms', 'privacy', 'safety', 'ko:', 'en:', 'role="dialog"']) assert.match(policy, new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
});

test('all policy notices show the confirmed operator, public MVP scope, and approved age and request rules', () => {
  assert.match(policy, /tweety and company/);
  assert.match(policy, /mailto:joonkyou\.park@gmail\.com/);
  assert.match(policy, /만 14세 이상/);
  assert.match(policy, /소프트 삭제/);
  assert.match(policy, /열람·정정·삭제·처리정지/);
  assert.match(policy, /공개 MVP 운영 초안/);
  assert.doesNotMatch(policy, /Closed Beta/);
});

test('all policy notices are reachable from authentication and policy dialogs are reachable in the app shell', () => {
  assert.match(auth, /onOpenPolicy/);
  assert.match(auth, /onOpenPolicy\?\.\('terms'\)/);
  assert.match(auth, /onOpenPolicy\?\.\('privacy'\)/);
  assert.match(auth, /onOpenPolicy\?\.\('safety'\)/);
  assert.match(app, /<LegalPolicyDialog/);
  assert.match(app, /onOpenPolicy=\{setPolicyOpen\}/);
});
