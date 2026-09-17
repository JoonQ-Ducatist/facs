import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const featureRoot = dirname(fileURLToPath(import.meta.url));

test('ranking rows retain the source card id when navigating to Feed', async () => {
  const source = await readFile(resolve(featureRoot, 'RankingView.jsx'), 'utf8');
  assert.match(source, /return \{ \.\.\.source, rankId:/);
  assert.match(source, /<li key=\{card\.rankId\}>/);
  assert.match(source, /onOpen\(\{ id: card\.id \}\)/);
  assert.doesNotMatch(source, /id: `\$\{source\.id\}-rank-/);
});
