import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const featureRoot = dirname(fileURLToPath(import.meta.url));

test('preview authentication keeps the splash until an explicit sign-in event', async () => {
  const source = await readFile(resolve(featureRoot, '../../App.jsx'), 'utf8');
  assert.match(source, /finishAuthenticatedEntry = \(session, \{ allowPreviewTransition = false \} = \{\}\)/);
  assert.match(source, /previewMode && !allowPreviewTransition/);
  assert.match(source, /finishAuthenticatedEntry\(session, \{ allowPreviewTransition: event === 'SIGNED_IN' \}\)/);
});

test('successful OTP unlock always lands on Feed and clears shared-guest state', async () => {
  const source = await readFile(resolve(featureRoot, '../../App.jsx'), 'utf8');
  assert.match(source, /if \(allowPreviewTransition\) \{\s*setIsSharedGuest\(false\);\s*setActiveTab\('feed'\);\s*\}/);
  assert.match(source, /event\.key === 'facs_auth_completed_at'.*restoreOriginalTab\(true\)/s);
});
