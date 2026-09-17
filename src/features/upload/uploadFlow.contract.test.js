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
  assert.match(styles, /\.editorial-upload form,[\s\S]*?\.editorial-upload select,/);
  assert.match(styles, /\.editorial-profile input \{ touch-action: manipulation; \}/);
});

test('media preview controls remain visible and touch-safe over dark images', async () => {
  const source = await readFile(resolve(featureRoot, 'UploadView.jsx'), 'utf8');
  const styles = await readFile(resolve(featureRoot, '../../styles/global.css'), 'utf8');
  assert.match(source, /function isolateMediaControlTouch\(event\)/);
  assert.match(source, /upload-media-control upload-media-control--move/);
  assert.match(source, /upload-media-control upload-media-control--remove/);
  assert.match(source, /onPointerDown=\{isolateMediaControlTouch\} onPointerUp=\{isolateMediaControlTouch\} onPointerCancel=\{isolateMediaControlTouch\}/);
  assert.match(source, /onClick=\{\(event\) => \{ event\.stopPropagation\(\); onMove\(-1\); \}\}/);
  assert.match(source, /onClick=\{\(event\) => \{ event\.stopPropagation\(\); onRemove\(\); \}\}/);
  assert.match(styles, /\.upload-media-control \{[\s\S]*?width: 32px; height: 32px;[\s\S]*?border: 1px solid rgba\(255,255,255,\.78\);[\s\S]*?backdrop-filter: blur\(8px\)/);
  assert.match(styles, /\.upload-media-control--move \{ background: rgba\(16,34,55,\.88\); \}/);
  assert.match(styles, /\.upload-media-control--remove \{ background: rgba\(224,48,83,\.94\); \}/);
  assert.match(styles, /\.upload-media-control:focus-visible \{ outline: 2px solid #fff/);
});

test('image previews keep the photo surface clean while video duration stays visible', async () => {
  const source = await readFile(resolve(featureRoot, 'UploadView.jsx'), 'utf8');
  assert.match(source, /\{item\.type === 'video' && <span[^>]*>VIDEO/);
  assert.doesNotMatch(source, /`IMAGE \$\{index \+ 1\}`/);
});

test('media previews support desktop drop and mobile long-press reordering', async () => {
  const source = await readFile(resolve(featureRoot, 'UploadView.jsx'), 'utf8');
  const styles = await readFile(resolve(featureRoot, '../../styles/global.css'), 'utf8');
  assert.match(source, /const \[draggingMediaId, setDraggingMediaId\] = useState\(null\)/);
  assert.match(source, /function reorderMedia\(sourceId, targetId\)/);
  assert.match(source, /function beginMediaTouchDrag\(id, event\)/);
  assert.match(source, /window\.setTimeout\(\(\) => \{/);
  assert.match(source, /function moveMediaTouchDrag\(event\)/);
  assert.match(source, /function endMediaTouchDrag\(event\)/);
  assert.match(source, /data-upload-media-id=\{item\.id\} draggable/);
  assert.match(source, /onDragOver=\{\(event\) => onNativeDragOver\(item\.id, event\)\}/);
  assert.match(source, /onDrop=\{\(event\) => onNativeDrop\(item\.id, event\)\}/);
  assert.match(styles, /\.media-preview \{[\s\S]*?cursor: grab; touch-action: pan-y/);
  assert.match(styles, /\.media-preview--dragging \{/);
  assert.match(styles, /\.media-preview--drag-over \{/);
});

test('video upload input targets browser-compatible MP4 and iPhone MOV sources', async () => {
  const source = await readFile(resolve(featureRoot, 'UploadView.jsx'), 'utf8');
  assert.match(source, /video\/mp4,video\/quicktime/);
  assert.doesNotMatch(source, /video\/mp4,video\/webm,video\/quicktime/);
  assert.match(source, /function supportsVideoFile\(file\)/);
  assert.match(source, /canPlayType\(mime\)/);
  assert.match(source, /H\.264 MP4 또는 iPhone MOV/);
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
