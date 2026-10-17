import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const policy = await readFile(new URL('./LegalPolicyDialog.jsx', import.meta.url), 'utf8');
const app = await readFile(new URL('../../App.jsx', import.meta.url), 'utf8');
const auth = await readFile(new URL('../auth/AuthEntryView.jsx', import.meta.url), 'utf8');
const profile = await readFile(new URL('../profile/ProfileView.jsx', import.meta.url), 'utf8');
const guestPhotoRule = await readFile(new URL('../../../supabase/migrations/202609220002_auth_featured_public_photos.sql', import.meta.url), 'utf8');
const postVisibilityRule = await readFile(new URL('../../../supabase/migrations/202609110005_follows_and_personalized_feed.sql', import.meta.url), 'utf8');

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
  assert.match(policy, /신고·검토 기록은 콘텐츠와 별도로 보관하며 최종 처리일부터 1년이 지난 뒤 월별 정기 파기에서 삭제합니다/);
  assert.match(policy, /Report and review records are kept separately from content and deleted in the monthly retention purge after one year from final review/);
  assert.match(policy, /자체 퍼널 분석 이벤트는 30일이 지나면 매일 정기 파기합니다/);
  assert.match(policy, /First-party funnel analytics events are purged daily once they are older than 30 days/);
  assert.match(policy, /GA4의 향상된 측정이 켜져 있어 페이지 조회·스크롤·외부 링크 클릭·사이트 검색·삽입 동영상 상호작용·파일 다운로드·양식 상호작용/);
  assert.match(policy, /GA4 Enhanced Measurement is enabled: page views, scrolls, outbound link clicks, site searches, embedded video interactions, file downloads, and form interactions/);
  assert.match(policy, /GA4 사용자·이벤트 수준 데이터의 보존 설정은 각각 2개월/);
  assert.match(policy, /GA4 user- and event-level data retention is set to two months each/);
  assert.match(policy, /새 활동이 있어도 사용자 데이터 보존기간을 다시 시작하지 않습니다/);
  assert.match(policy, /new activity does not reset user-data retention/);
  assert.doesNotMatch(policy, /백업 사본은 별도로 남을 수 있습니다|backup copies, may remain separately/);
  assert.match(policy, /열람·정정·삭제·처리정지/);
  assert.match(policy, /시행일: 2026년 10월 9일/);
  assert.match(policy, /type === 'privacy'.*시행일: 2026년 10월 17일.*Effective: October 17, 2026/);
  assert.match(policy, /Vercel이 요청의 IP 주소에서 제공하는 국가 코드/);
  assert.match(policy, /country code derived from the request IP address/);
  assert.match(policy, /쿠키\(_ga 등\)/);
  assert.match(policy, /cookies \(including _ga\)/);
  assert.match(policy, /임시 분석 세션 식별자/);
  assert.match(policy, /temporary analytics session identifier/);
  assert.doesNotMatch(policy, /서비스 분석 이벤트와 임시 세션 식별자|product analytics events, and a temporary session identifier/);
  assert.doesNotMatch(policy, /익명 이용 흐름|anonymous usage journeys/);
  for (const phrase of ['프로필 사진', '스크랩', '브라우저 저장', '사진·영상 권리 확인', 'profile photos', 'scraps', 'Browser storage', 'rights confirmation']) assert.match(policy, new RegExp(phrase));
  assert.doesNotMatch(policy, /Closed Beta/);
});

test('all policy notices are reachable from authentication and policy dialogs are reachable in the app shell', () => {
  assert.match(auth, /onOpenPolicy/);
  assert.match(auth, /onOpenPolicy\?\.\('terms'\)/);
  assert.match(auth, /onOpenPolicy\?\.\('privacy'\)/);
  assert.match(auth, /onOpenPolicy\?\.\('safety'\)/);
  assert.match(app, /<LegalPolicyDialog/);
  assert.match(app, /onOpenPolicy=\{setPolicyOpen\}/);
  assert.match(profile, /onOpenPolicy\?\.\('safety'\)/);
  assert.match(profile, /onOpenPolicy\?\.\('privacy'\)/);
  assert.match(profile, /onOpenPolicy\?\.\('terms'\)/);
  assert.match(profile, /Safety & reports/);
  assert.match(profile, /개인정보처리방침/);
});

test('privacy notice describes guest photo selection and member-only visibility', () => {
  assert.match(guestPhotoRule, /post\.visibility = 'public'/);
  assert.match(guestPhotoRule, /grant execute on function public\.get_auth_featured_public_photos\(integer, integer\) to anon, authenticated/);
  assert.match(postVisibilityRule, /target_visibility = 'public'/);
  assert.match(postVisibilityRule, /f\.follower_id = auth\.uid\(\)/);
  assert.match(policy, /전체 공개 게시물의 사진 한 장이 로그인 전 화면에 작성자 정보 없이 표시될 수도 있습니다/);
  assert.match(policy, /One image from a public post may also appear on the signed-out screen without author details/);
  assert.doesNotMatch(policy, /공개 아이디만 표시합니다|Other members see your chosen public handle/);
});
