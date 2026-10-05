import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('upload visibility labels and descriptions follow the selected language', async () => {
  const upload = await readFile(new URL('./UploadView.jsx', import.meta.url), 'utf8');
  const app = await readFile(new URL('../../App.jsx', import.meta.url), 'utf8');

  assert.match(upload, /locale === 'en' \? '2\. Visibility' : '2\. 공개 범위'/);
  assert.match(upload, /aria-label=\{locale === 'en' \? 'Visibility' : '공개 범위'\}/);
  assert.match(upload, /locale === 'en' \? 'Public' : '전체 공개'/);
  assert.match(upload, /locale === 'en' \? 'Followers only' : '팔로워만'/);
  assert.match(upload, /locale === 'en' \? 'Anyone can see this post in the feed\.' : '피드에서 누구나 볼 수 있어요\.'/);
  assert.match(upload, /locale === 'en' \? 'Only you and your followers can see this post\.' : '나와 나를 팔로우한 사람만 볼 수 있어요\.'/);
  assert.match(app, /replacements\['3\. 어떤 점을 평가받고 싶나요\?'\] = '3\. What would you like feedback on\?'/);
});
