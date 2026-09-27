import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const app = await readFile(new URL('../App.jsx', import.meta.url), 'utf8');
const qaAccounts = await readFile(new URL('./localQaAccounts.js', import.meta.url), 'utf8');

test('a successful report is blocked locally before another server request in the same session', () => {
  assert.match(app, /const reportedPostReasons = useRef\(new Set\(\)\)/);
  assert.match(app, /reportedPostReasons\.current\.has\(reportKey\)/);
  assert.match(app, /reportedPostReasons\.current\.add\(reportKey\)/);
  assert.match(app, /const result = await submitPostReport\(postId, reason\)/);
});

test('local QA sign-in returns the real session user before the App reads role-gated data', () => {
  assert.match(qaAccounts, /return \{ ok: true, account, user, profile: profileResult\.profile \}/);
  assert.match(app, /setAuthUser\(result\.user\)/);
});
