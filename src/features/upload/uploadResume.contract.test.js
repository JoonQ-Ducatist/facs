import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));

test('native picker resume cannot replace an accepted member upload with the terms gate', async () => {
  const app = await readFile(resolve(root, '../../App.jsx'), 'utf8');
  const entry = app.slice(app.indexOf('const finishAuthenticatedEntry = async'), app.indexOf('const restoreOriginalTab = async'));
  const guard = entry.indexOf('if (!allowPreviewTransition && acceptedTermsUserId.current === session.user.id) return;');
  const gate = entry.indexOf("setTermsGate({ user: session.user, status: 'checking' });");
  assert.ok(guard >= 0 && gate > guard, 'accepted sessions must return before mounting the terms gate');
  assert.match(entry, /acceptedTermsUserId\.current = session\.user\.id;\s*setTermsGate\(null\)/);
  assert.match(app, /const onVisible = \(\) => \{ if \(document\.visibilityState === 'visible'\) void restoreOriginalTab\(\); \}/);
  assert.match(app, /if \(!session\) \{\s*acceptedTermsUserId\.current = null;/);
  assert.match(app, /termsStatusCache\.current\.set\(`\$\{user\.id\}:\$\{CURRENT_TERMS_VERSION\}`,[\s\S]*?acceptedTermsUserId\.current = user\.id;/);
});

test('question field follows the final visual viewport while the software keyboard opens', async () => {
  const upload = await readFile(resolve(root, 'UploadView.jsx'), 'utf8');
  assert.match(upload, /window\.visualViewport\.addEventListener\('resize', onViewportChange\)/);
  assert.match(upload, /window\.visualViewport\.removeEventListener\('resize', onViewportChange\)/);
  assert.match(upload, /window\.visualViewport\?\.offsetTop/);
  assert.match(upload, /onFocus=\{\(\) => revealQuestionInput\(true\)\}/);
  assert.match(upload, /scrollArea\.scrollBy\(\{ top: delta, behavior: 'auto' \}\)/);
});
