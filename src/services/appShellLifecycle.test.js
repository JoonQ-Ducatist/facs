import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';

const serviceRoot = fileURLToPath(new URL('.', import.meta.url));

const lifecycleMatrix = [
  ['cold load', 'active'],
  ['address-bar reload', 'active'],
  ['pageshow persisted', 'active'],
  ['background then visible', 'active'],
  ['address bar expanded', 'active'],
  ['address bar collapsed', 'active'],
  ['portrait to landscape', 'active'],
  ['input focused', 'inner-scroll'],
  ['file picker returned', 'inner-scroll'],
  ['fullscreen entered', 'native-video'],
  ['fullscreen exited', 'active'],
];

test('every browser lifecycle state retains one fixed app shell and resets only its screen scroll owner', async () => {
  const styles = await readFile(resolve(serviceRoot, '../styles/global.css'), 'utf8');
  const app = await readFile(resolve(serviceRoot, '../App.jsx'), 'utf8');
  const html = await readFile(resolve(serviceRoot, '../../index.html'), 'utf8');

  assert.deepEqual(lifecycleMatrix.map(([transition]) => transition), [
    'cold load', 'address-bar reload', 'pageshow persisted', 'background then visible',
    'address bar expanded', 'address bar collapsed', 'portrait to landscape', 'input focused',
    'file picker returned', 'fullscreen entered', 'fullscreen exited',
  ]);
  assert.deepEqual(new Set(lifecycleMatrix.map(([, owner]) => owner)), new Set(['active', 'inner-scroll', 'native-video']));
  assert.match(styles, /\.app-stage \{ position: relative;/);
  assert.match(styles, /height: 100vh; height: var\(--xc-app-height, 100dvh\);/);
  assert.match(styles, /html, body, #root \{ width: 100%; height: 100%; min-height: 0; overflow: hidden; overscroll-behavior: none; \}/);
  assert.match(styles, /\.editorial-app \{ position: absolute; inset: 0; width: 100%; height: 100%; overflow: hidden; overscroll-behavior: none;/);
  assert.doesNotMatch(styles, /--xc-app-offset-top/);
  assert.doesNotMatch(app, /visualViewport|scrollRestoration|setTimeout\(syncAppCanvas/);
  assert.match(html, /window\.history\.scrollRestoration = 'manual'/);
  assert.match(html, /--xc-app-height/);
  assert.match(html, /window\.visualViewport\?\.height/);
  assert.match(html, /const keyboardRecovering = keyboardSession && visualHeight < stableViewportHeight - 4/);
  assert.match(html, /if \(!keyboardRecovering && visualHeight > 0\)[\s\S]*?stableViewportHeight = visualHeight;/);
  assert.match(html, /document\.addEventListener\('focusin', \(\) => syncViewport\(false\)\)/);
  assert.match(html, /document\.addEventListener\('focusout'/);
  assert.match(html, /document\.addEventListener\('visibilitychange'/);
  assert.match(html, /window\.addEventListener\('focus', syncAfterResume\)/);
  assert.match(html, /window\.addEventListener\('load', syncAfterResume/);
  assert.doesNotMatch(html, /--xc-app-offset-top|normalizeInitialViewport/);
  assert.doesNotMatch(app, /if \(isGuest\) return undefined;[\s\S]*?resetScreen/);
  assert.match(app, /function CanvasStage\(\{ children, screenKey \}\)/);
  assert.match(app, /document\.scrollingElement\.scrollTop = 0/);
  assert.match(app, /querySelectorAll\('\[data-app-scroll-root\]'\)/);
  assert.match(app, /window\.__syncFacsViewport\?\.\(true\)/);
  assert.match(app, /window\.addEventListener\('pageshow', syncViewport\)/);
  assert.match(app, /document\.addEventListener\('visibilitychange', onVisibilityChange\)/);
  assert.match(app, /const onVisibilityChange = \(\) => \{\s*if \(document\.visibilityState === 'visible'\) syncViewport\(\);\s*\}/);
  assert.match(app, /resetScreenOrigin\(\);\s*syncViewport\(\);/);
  assert.match(app, /<CanvasStage screenKey="auth-entry">/);
  assert.match(app, /<CanvasStage screenKey=\{`app:\$\{activeTab\}:\$\{activeCategory\}`\}>/);
});

test('keyboard dismissal restores document scroll even while the input remains focused', async () => {
  const html = await readFile(resolve(serviceRoot, '../../index.html'), 'utf8');
  const script = html.match(/<script>\s*([\s\S]*?)\s*<\/script>/)?.[1];
  assert.ok(script);
  const properties = new Map();
  const documentListeners = new Map();
  const viewportListeners = new Map();
  let scrollResets = 0;
  class MockElement {
    constructor(editable = false) { this.editable = editable; }
    matches() { return this.editable; }
  }
  const document = {
    documentElement: {
      clientHeight: 745,
      scrollTop: 0,
      style: { setProperty: (key, value) => properties.set(key, value) },
    },
    body: { scrollTop: 0 },
    activeElement: new MockElement(),
    addEventListener: (name, listener) => documentListeners.set(name, listener),
  };
  const window = {
    innerHeight: 745,
    scrollY: 0,
    visualViewport: { height: 745, addEventListener: (name, listener) => viewportListeners.set(name, listener) },
    history: {},
    addEventListener() {},
    requestAnimationFrame: (callback) => callback(),
    setTimeout: (callback) => callback(),
    scrollTo: () => { scrollResets += 1; window.scrollY = 0; document.documentElement.scrollTop = 0; },
  };
  runInNewContext(script, { window, document, HTMLElement: MockElement });
  assert.equal(properties.get('--xc-app-height'), '745px');

  document.activeElement = new MockElement(true);
  documentListeners.get('focusin')();
  window.innerHeight = 506;
  window.visualViewport.height = 435;
  window.scrollY = 347;
  document.documentElement.scrollTop = 347;
  const beforeFocusScroll = scrollResets;
  viewportListeners.get('resize')();
  assert.equal(scrollResets, beforeFocusScroll);
  assert.equal(properties.get('--xc-app-height'), '745px');

  // iOS Chrome hides the keyboard without blurring the email input.
  window.innerHeight = 745;
  window.visualViewport.height = 745;
  window.scrollY = 108;
  document.documentElement.scrollTop = 108;
  viewportListeners.get('scroll')();
  assert.ok(scrollResets > beforeFocusScroll);
  assert.equal(window.scrollY, 0);
  assert.equal(document.documentElement.scrollTop, 0);
  assert.equal(properties.get('--xc-app-height'), '745px');
  assert.equal(document.activeElement.editable, true);

  document.activeElement = new MockElement();
  window.visualViewport.height = 800;
  window.__syncFacsViewport();
  assert.equal(properties.get('--xc-app-height'), '800px');
});

test('keyboard, file-picker and fullscreen states retain their existing isolated owners', async () => {
  const styles = await readFile(resolve(serviceRoot, '../styles/global.css'), 'utf8');
  const upload = await readFile(resolve(serviceRoot, '../features/upload/UploadView.jsx'), 'utf8');
  const feed = await readFile(resolve(serviceRoot, '../features/feed/FeedView.jsx'), 'utf8');
  const fullscreen = await readFile(resolve(serviceRoot, '../features/feed/videoFullscreen.js'), 'utf8');

  assert.match(styles, /\.editorial-main--scroll \{ overflow-y: auto;/);
  assert.match(styles, /@media \(max-width: 1023px\) \{[\s\S]*?\.editorial-app > header \{ position: fixed !important; inset: 0 0 auto; z-index: 60 !important;/);
  assert.match(styles, /@media \(max-width: 1023px\) \{[\s\S]*?\.editorial-main \{ position: absolute; inset: calc\(44px \+ env\(safe-area-inset-top\)\) 0 calc\(44px \+ env\(safe-area-inset-bottom\)\) 0;/);
  assert.match(styles, /\.editorial-main--scroll \{ padding: 8px clamp\(12px, 4vw, 20px\) !important; \}/);
  assert.match(styles, /@media \(max-width: 1023px\) \{[\s\S]*?\.editorial-app > nav \{ position: fixed !important; inset: auto 0 0; z-index: 60 !important;/);
  assert.match(upload, /visualViewport\?\.height \?\? window\.innerHeight/);
  assert.match(upload, /onPointerDown=\{\(event\) => onTouchStart\(item\.id, event\)\}/);
  assert.match(upload, /onTouchStart=\{\(event\) => onTouchStart\(item\.id, event\)\}/);
  assert.match(feed, /media-carousel--scroll/);
  assert.match(feed, /enterNativeVideoFullscreen\(videoRef\.current\)/);
  assert.match(fullscreen, /webkitEnterFullscreen/);
  assert.match(fullscreen, /requestFullscreen/);
});

test('resuming the app synchronizes viewport without resetting the upload scroll owner', async () => {
  const app = await readFile(resolve(serviceRoot, '../App.jsx'), 'utf8');
  const stage = app.match(/function CanvasStage\([\s\S]*?\n\}/)?.[0];
  assert.ok(stage);
  assert.match(stage, /resetScreenOrigin\(\);\s*syncViewport\(\);/);
  assert.match(stage, /window\.addEventListener\('pageshow', syncViewport\)/);
  assert.match(stage, /const syncViewport = \(\) => \{[\s\S]*?window\.__syncFacsViewport\?\.\(true\);[\s\S]*?\};\s*const onVisibilityChange/);
  assert.match(stage, /const onVisibilityChange = \(\) => \{\s*if \(document\.visibilityState === 'visible'\) syncViewport\(\);\s*\}/);
  assert.match(app, /<div className=\{activeTab === 'upload' \? 'contents' : 'hidden'\}>\s*<UploadView isActive=\{activeTab === 'upload'\}/);
});
