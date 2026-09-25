import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const featureRoot = dirname(fileURLToPath(import.meta.url));

test('moderation queue uses only the review contract and exposes permitted transitions', async () => {
  const source = await readFile(resolve(featureRoot, 'ModerationView.jsx'), 'utf8');
  assert.match(source, /listModerationReports\(\)/);
  assert.match(source, /reviewModerationReport\(report\.id, nextStatus\)/);
  assert.match(source, /received && <ActionButton[\s\S]*?'triaged'/);
  assert.match(source, /triaged && <><ActionButton[\s\S]*?'resolved'[\s\S]*?'dismissed'/);
  assert.match(source, /const staffRoles = new Set\(\['moderator', 'admin'\]\)/);
});

test('moderation entry stays gated by the persisted staff role', async () => {
  const appSource = await readFile(resolve(featureRoot, '../../App.jsx'), 'utf8');
  const profileSource = await readFile(resolve(featureRoot, '../profile/ProfileView.jsx'), 'utf8');
  assert.match(appSource, /const canModerate = canAccessModeration\(profile\?\.role\)/);
  assert.match(appSource, /activeTab === 'moderation' && canModerate && <ModerationView/);
  assert.match(profileSource, /canModerate && <button type="button" onClick=\{onOpenModeration\}/);
});

test('moderation previews reported posts without leaving the review row and preserves server transitions', async () => {
  const source = await readFile(resolve(featureRoot, 'ModerationView.jsx'), 'utf8');
  assert.match(source, /href=\{previewHref\}.*?event\.preventDefault\(\); onPreview\(\)/);
  assert.match(source, /const result = await getModerationPostPreview\(report\.id\)/);
  assert.match(source, /<ReportPostPreviewDialog locale=\{locale\} report=\{preview\.report\} preview=\{preview\.data\}/);
  assert.doesNotMatch(source, /cards\.find\(/);
  assert.match(source, /'resolved'\).*?'신고 적용'.*?'Apply report'/);
  assert.match(source, /'dismissed'\).*?'신고 반려'.*?'Dismiss report'/);
});
