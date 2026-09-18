import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

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

test('every browser lifecycle state retains one normal-flow shell and never adds a viewport offset', async (t) => {
  const styles = await readFile(resolve(serviceRoot, '../styles/global.css'), 'utf8');
  const app = await readFile(resolve(serviceRoot, '../App.jsx'), 'utf8');
  const html = await readFile(resolve(serviceRoot, '../../index.html'), 'utf8');

  for (const [transition, owner] of lifecycleMatrix) {
    await t.test(`${transition} remains owned by ${owner}`, () => {
      assert.match(styles, /\.app-stage \{ position: relative;/);
      assert.match(styles, /height: 100vh; height: 100dvh;/);
      assert.doesNotMatch(styles, /--xc-app-offset-top|--xc-app-height/);
      assert.doesNotMatch(app, /visualViewport|scrollRestoration|setTimeout\(syncAppCanvas/);
      assert.doesNotMatch(html, /visualViewport|scrollRestoration|normalizeInitialViewport/);
    });
  }
});

test('keyboard, file-picker and fullscreen states retain their existing isolated owners', async () => {
  const styles = await readFile(resolve(serviceRoot, '../styles/global.css'), 'utf8');
  const upload = await readFile(resolve(serviceRoot, '../features/upload/UploadView.jsx'), 'utf8');
  const feed = await readFile(resolve(serviceRoot, '../features/feed/FeedView.jsx'), 'utf8');
  const fullscreen = await readFile(resolve(serviceRoot, '../features/feed/videoFullscreen.js'), 'utf8');

  assert.match(styles, /\.editorial-main--scroll \{ overflow-y: auto;/);
  assert.match(upload, /visualViewport\?\.height \?\? window\.innerHeight/);
  assert.match(upload, /onPointerDown=\{\(event\) => onTouchStart\(item\.id, event\)\}/);
  assert.match(upload, /onTouchStart=\{\(event\) => onTouchStart\(item\.id, event\)\}/);
  assert.match(feed, /pointerId: event\.pointerId/);
  assert.match(feed, /enterNativeVideoFullscreen\(video\)/);
  assert.match(fullscreen, /webkitEnterFullscreen/);
  assert.match(fullscreen, /requestFullscreen/);
});
