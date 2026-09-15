import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const featureRoot = dirname(fileURLToPath(import.meta.url));

test('file selection is excluded from global tab-swipe tracking', async () => {
  const source = await readFile(resolve(featureRoot, '../../App.jsx'), 'utf8');
  assert.match(source, /const target = event\.target instanceof Element \? event\.target : null/);
  assert.match(source, /target\.closest\('button, input, textarea, select, label, form, a, \[role="button"\], \[role="dialog"\], \.media-carousel'\)/);
  assert.match(source, /outside tab-swipe tracking[\s\S]*?tabGestureStart\.current = null/);
  assert.match(source, /pointerId: event\.pointerId/);
  assert.match(source, /event\.pointerId !== start\.pointerId/);
  assert.match(source, /function cancelTabGesture\(event\)/);
  assert.match(source, /onPointerDownCapture=\{startTabGesture\}/);
  assert.match(source, /window\.addEventListener\('blur', resetTabGesture\)/);
  assert.match(source, /document\.addEventListener\('visibilitychange', onVisible\)/);
  assert.match(source, /onPointerCancel=\{cancelTabGesture\}/);
  assert.match(source, /onLostPointerCapture=\{cancelTabGesture\}/);
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

test('Upload controls isolate touch events from the root swipe gesture', async () => {
  const source = await readFile(resolve(featureRoot, 'UploadView.jsx'), 'utf8');
  const styles = await readFile(resolve(featureRoot, '../../styles/global.css'), 'utf8');
  assert.match(source, /function isolateTouch\(event\)/);
  assert.match(source, /<form className="flex flex-col gap-3\.5" onSubmit=\{submit\} onPointerDown=\{isolateTouch\} onPointerUp=\{isolateTouch\} onPointerCancel=\{isolateTouch\}/);
  assert.match(source, /onPointerDown=\{isolateTouch\} onPointerUp=\{isolateTouch\} onPointerCancel=\{isolateTouch\} onClick=\{\(\) => setCategory\(id\)\}/);
  assert.match(source, /role="radio" aria-checked=\{selected\} onPointerDown=\{isolateTouch\} onPointerUp=\{isolateTouch\}/);
  assert.match(styles, /\.editorial-upload form,[\s\S]*?\.editorial-upload select \{ touch-action: manipulation; \}/);
});

test('a just-published card is retained and kept canonical during feed hydration', async () => {
  const source = await readFile(resolve(featureRoot, '../../App.jsx'), 'utf8');
  assert.match(source, /const pendingPublishedCard = useRef\(null\)/);
  assert.match(source, /pendingPublishedCard\.current = publishedCard;/);
  assert.match(source, /const justPublished = pendingPublishedCard\.current/);
  assert.match(source, /card\.id !== justPublished\?\.id/);
  assert.match(source, /category: justPublished\.category/);
  assert.match(source, /serverIds\.has\(justPublished\.id\).*pendingPublishedCard\.current = null/);
});

test('profile hydration does not erase a post while server publication is settling', async () => {
  const source = await readFile(resolve(featureRoot, '../../App.jsx'), 'utf8');
  assert.match(source, /const hydratedProfileCards = profileResult\.data \?\? \[\];/);
  assert.match(source, /justPublished && !hydratedProfileCards\.some\(\(card\) => card\.id === justPublished\.id\)/);
  assert.match(source, /\[justPublished, \.\.\.hydratedProfileCards\]/);
});
