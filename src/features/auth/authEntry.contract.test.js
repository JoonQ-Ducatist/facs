import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const featureRoot = dirname(fileURLToPath(import.meta.url));

test('preview authentication resumes an existing session unless authPreview explicitly forces the splash', async () => {
  const source = await readFile(resolve(featureRoot, '../../App.jsx'), 'utf8');
  assert.match(source, /const previewMode = new URLSearchParams\(window\.location\.search\)\.has\('preview'\)/);
  assert.match(source, /const forceAuthPreview = authPreview/);
  assert.match(source, /forceAuthPreview \|\| previewMode \|\| !sharedPostId/);
  assert.match(source, /forceAuthPreview && !allowPreviewTransition/);
  assert.match(source, /finishAuthenticatedEntry\(session, \{ allowPreviewTransition: event === 'SIGNED_IN' \}\)/);
  assert.match(source, /event\.key === 'facs_auth_completed_at'.*restoreOriginalTab\(true\)/s);
  assert.match(source, /event\.key\?\.startsWith\('sb-'\).*restoreOriginalTab\(\)/s);
  assert.match(source, /const onVisible = \(\) => \{ if \(document\.visibilityState === 'visible'\) void restoreOriginalTab\(\); \}/);
});

test('successful OTP unlock always lands on Feed and clears shared-guest state', async () => {
  const source = await readFile(resolve(featureRoot, '../../App.jsx'), 'utf8');
  assert.match(source, /if \(allowPreviewTransition\) \{\s*setIsSharedGuest\(false\);\s*setActiveTab\('feed'\);\s*\}/);
  assert.match(source, /event\.key === 'facs_auth_completed_at'.*restoreOriginalTab\(true\)/s);
});
