import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const featureRoot = dirname(fileURLToPath(import.meta.url));

test('file selection is excluded from global tab-swipe tracking', async () => {
  const source = await readFile(resolve(featureRoot, '../../App.jsx'), 'utf8');
  assert.match(source, /event\.target\.closest\('button, input, textarea, select, label, form, a, \[role="button"\], \[role="dialog"\], \.media-carousel'\)/);
  assert.match(source, /choosing media never changes the view/);
});

test('file-picker focus restoration keeps the current tab instead of forcing Feed', async () => {
  const source = await readFile(resolve(featureRoot, '../../App.jsx'), 'utf8');
  assert.match(source, /file\/camera picker[\s\S]*?restoreOriginalTab\(\)/);
  assert.match(source, /const onVisible = \(\) => \{ if \(document\.visibilityState === 'visible'\) void restoreOriginalTab\(\); \}/);
});

test('upload keeps its form on an upload failure and exposes a retryable error', async () => {
  const source = await readFile(resolve(featureRoot, 'UploadView.jsx'), 'utf8');
  assert.match(source, /const result = await onSubmit\(/);
  assert.match(source, /if \(!result\?\.ok\) \{\s*setError\(result\?\.message/s);
  assert.match(source, /catch \{\s*setError\(/s);
  assert.match(source, /disabled=\{isPublishing\}/);
});

test('only a successful upload switches from Upload to Feed', async () => {
  const source = await readFile(resolve(featureRoot, '../../App.jsx'), 'utf8');
  assert.match(source, /if \(result\.error\) \{[\s\S]*?return \{ ok: false, message \};\s*\}/);
  assert.match(source, /setActiveTab\('feed'\);[\s\S]*?return \{ ok: true, data: publishedCard \}/);
});
