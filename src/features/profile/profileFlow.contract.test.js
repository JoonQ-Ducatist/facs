import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const featureRoot = dirname(fileURLToPath(import.meta.url));

test('profile exposes an explicit change flow for an existing public ID', async () => {
  const source = await readFile(resolve(featureRoot, 'ProfileView.jsx'), 'utf8');
  assert.match(source, /editingHandle/);
  assert.match(source, /locale === 'en' \? 'Change' : '변경'/);
  assert.match(source, /initialHandle=\{displayHandle \?\? ''\}/);
  assert.match(source, /onCancel=\{\(\) => setEditingHandle\(false\)\}/);
});

test('upload posting ID links to profile instead of showing a dead hint', async () => {
  const source = await readFile(resolve(featureRoot, '../upload/UploadView.jsx'), 'utf8');
  assert.match(source, /onOpenProfile/);
  assert.match(source, /onClick=\{onOpenProfile\}/);
  assert.match(source, /Change in Profile.*프로필에서 변경/);
});

test('the app wires the upload ID CTA to the profile tab', async () => {
  const source = await readFile(resolve(featureRoot, '../../App.jsx'), 'utf8');
  assert.match(source, /activeTab === 'upload'.*onOpenProfile=\{\(\) => setActiveTab\('profile'\)\}/s);
});

test('profile orders own posts and exposes a keyboard-safe scrap open callback', async () => {
  const source = await readFile(resolve(featureRoot, 'ProfileView.jsx'), 'utf8');
  assert.match(source, /sortPostsNewestFirst\(\(profileCards \?\? cards\)\.filter\(\(card\) => card\.isMyUpload\)\)/);
  assert.match(source, /onOpenScrap/);
  assert.match(source, /event\.key !== 'Enter' && event\.key !== ' '/);
  assert.match(source, /event\.stopPropagation\(\); onRemove\(\)/);
  assert.match(source, /onKeyDown=\{\(event\) => event\.stopPropagation\(\)\}/);
});

test('the app hydrates private profile libraries and passes scrap open targets to Feed', async () => {
  const source = await readFile(resolve(featureRoot, '../../App.jsx'), 'utf8');
  assert.match(source, /listSupabaseMyPublishedProfileCards/);
  assert.match(source, /listSupabaseMyScrapFeedCards/);
  assert.match(source, /Promise\.all\(\[listSupabaseMyPublishedProfileCards\(\), listSupabaseMyScrapFeedCards\(\)\]\)/);
  assert.match(source, /profileCards=\{displayProfileCards\} scrapCards=\{displayScrapCards\}/);
  assert.match(source, /onOpenScrap=\{openScrapCard\}/);
  assert.match(source, /setCards\(\(items\) => items\.some\(\(item\) => item\.id === card\.id\)/);
});
