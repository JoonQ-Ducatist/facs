import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultQuestion } from './defaultQuestion.js';
import fs from 'node:fs';
import { transform } from 'esbuild';
test('English default questions cover binary and age ratings', () => {
  assert.equal(defaultQuestion('en', 'BINARY'), 'Does this photo make a good impression?');
  assert.equal(defaultQuestion('en', 'NUMERIC_AGE'), 'How old do I look?');
});
test('Korean default questions retain their existing wording', () => {
  assert.equal(defaultQuestion('ko', 'BINARY'), '호감과 신뢰감을 평가해 주세요.');
  assert.equal(defaultQuestion('ko', 'NUMERIC_AGE'), '사람들은 저를 몇 살로 볼까요?');
});
test('dormant comparison question keeps both language variants', () => {
  assert.equal(defaultQuestion('en', 'BINARY', 'A_B'), 'Which photo do you prefer: A or B?');
  assert.equal(defaultQuestion('ko', 'BINARY', 'A_B'), 'A와 B 중 어떤 사진이 더 좋은가요?');
});
test('profile removes static score and changed JSX parses', async () => {
  const source = fs.readFileSync(new URL('../profile/ProfileView.jsx', import.meta.url), 'utf8');
  assert.ok(!source.includes('94.6') && !source.includes('FACt.Smack Score:'));
  await transform(source, {loader:'jsx', jsx:'automatic'});
});
test('media labels follow the actual media type', async () => {
  const source = fs.readFileSync(new URL('../feed/FeedView.jsx', import.meta.url), 'utf8');
  assert.ok(!source.includes('LIVE STREAM'));
  assert.ok(source.includes("isVideo ? (locale === 'en' ? 'VIDEO' : '영상')"));
  for (const file of ['../feed/FeedView.jsx', './UploadView.jsx']) await transform(fs.readFileSync(new URL(file, import.meta.url), 'utf8'), {loader:'jsx',jsx:'automatic'});
});
