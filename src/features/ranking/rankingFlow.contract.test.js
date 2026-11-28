import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const featureRoot = dirname(fileURLToPath(import.meta.url));

test('ranking uses each published card once and retains its source id when navigating to Feed', async () => {
  const source = await readFile(resolve(featureRoot, 'RankingView.jsx'), 'utf8');
  assert.match(source, /const pageCards = ranked\.slice\(page \* 10, page \* 10 \+ 10\);/);
  assert.match(source, /<li key=\{card\.id\}>/);
  assert.match(source, /onOpen\(\{ id: card\.id \}\)/);
  assert.doesNotMatch(source, /Array\.from\(\{ length: 100 \}/);
  assert.match(source, /\/ \{ranked\.length\}/);
});

test('ranking empty state switches directly between Korean and English copy', async () => {
  const source = await readFile(resolve(featureRoot, 'RankingView.jsx'), 'utf8');
  const appSource = await readFile(resolve(featureRoot, '../../App.jsx'), 'utf8');
  assert.match(source, /function RankingView\(\{ locale = 'ko', cards, categories, onOpen \}\)/);
  assert.match(source, /locale === 'en' \? 'No posts qualify for ranking yet\.' : '아직 랭킹에 들어갈 사진이 없어요\.'/);
  assert.match(source, /A post appears here after \$\{MIN_RANKING_VOTES\} ratings\./);
  assert.match(appSource, /<RankingView locale=\{locale\}/);
});
