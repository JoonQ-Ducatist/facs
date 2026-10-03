import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const shareCard = await readFile(new URL('./ShareResultCard.jsx', import.meta.url), 'utf8');
const feed = await readFile(new URL('./FeedView.jsx', import.meta.url), 'utf8');

test('share result card is a separate accessible dialog with media and aggregate fields', () => {
  assert.match(shareCard, /role="dialog"/);
  assert.match(shareCard, /categoryLabel/);
  assert.match(shareCard, /Valid ratings/);
  assert.match(shareCard, /yesPercent/);
  assert.match(shareCard, /card\.ageEstimate/);
  assert.match(shareCard, /media\?\.url/);
});

test('feed opens the share card from the existing share action and preserves the parent share flow on confirmation', () => {
  assert.match(feed, /const \[sharePreviewOpen, setSharePreviewOpen\] = useState\(false\)/);
  assert.match(feed, /function handleShare\(\)/);
  assert.match(feed, /setSharePreviewOpen\(true\)/);
  assert.match(feed, /onShare=\{handleShare\}/);
  assert.match(feed, /function confirmShare\(\)[\s\S]*onShare\?\.\(card\)/);
  assert.match(feed, /<ShareResultCard locale=\{locale\}[\s\S]*onShare=\{confirmShare\}/);
  assert.match(shareCard, /onClick=\{onShare\}/);
});
