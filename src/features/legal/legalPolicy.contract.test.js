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
  assert.match(policy, /Tweety and Company/);
  assert.match(policy, /개인정보 보호책임자: Joon \(Manager\)/);
  assert.match(policy, /Privacy Officer: Joon \(Manager\)/);
  assert.match(policy, /mailto:teamfactsmack@gmail\.com/);
  assert.doesNotMatch(policy, /joonkyou\.park@gmail\.com/);
  assert.match(policy, /teamfactsmack@gmail\.com/);
  assert.match(policy, /만 14세 이상/);
  assert.match(policy, /작성자가 게시물이나 댓글을 삭제하면 해당 원본을 제거합니다/);
  assert.match(policy, /When an author deletes a post or comment, its original record is removed/);
  assert.match(policy, /신고·검토 기록과 백업 사본은 별도로 남을 수 있습니다/);
  assert.match(policy, /열람·정정·삭제·처리정지/);
  assert.match(policy, /시행일: 2026년 10월 9일/);
  assert.match(policy, /Vercel이 요청의 IP 주소에서 제공하는 국가 코드/);
  assert.match(policy, /country code derived from the request IP address/);
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
