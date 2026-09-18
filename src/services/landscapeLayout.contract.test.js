import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const serviceRoot = fileURLToPath(new URL('.', import.meta.url));
const landscapeQuery = '@media (orientation: landscape) and (max-height: 599px) and (max-width: 1023px)';
const portraitMatrix = [
  [390, 844],
  [360, 800],
  [430, 932],
];
const landscapeMatrix = [
  [667, 375],
  [812, 375],
  [844, 390],
  [915, 412],
];

test('landscape phone shell reserves a stable body rail for every target viewport', async () => {
  const styles = await readFile(resolve(serviceRoot, '../styles/global.css'), 'utf8');
  assert.ok(styles.includes(`${landscapeQuery} {`), 'landscape contract is scoped to the narrow phone query');
  assert.match(styles, /--landscape-nav-rail: 216px;/);
  assert.match(styles, /grid-template-columns: calc\(var\(--landscape-nav-rail\) \+ env\(safe-area-inset-left\)\) minmax\(0, 1fr\);/);
  assert.match(styles, /\.editorial-app > nav \{[\s\S]*?position: absolute !important;[\s\S]*?width: var\(--landscape-nav-collapsed\);/);
  assert.match(styles, /\.editorial-app > nav:hover,[\s\S]*?\.editorial-app\.editorial-app--landscape-nav-open > nav \{ width: var\(--landscape-nav-expanded\);/);
  assert.doesNotMatch(styles, /\.editorial-app--landscape-nav-open \{ --landscape-nav-width:/);
  assert.doesNotMatch(styles, /grid-template-columns: calc\(var\(--landscape-nav-width\)/);

  for (const [width, height] of landscapeMatrix) {
    assert.ok(width >= 600 && width < 1024 && height < 600, `${width}x${height} belongs to the narrow landscape contract`);
  }
});

test('portrait mobile and desktop keep their original navigation ownership', async () => {
  const styles = await readFile(resolve(serviceRoot, '../styles/global.css'), 'utf8');
  const app = await readFile(resolve(serviceRoot, '../App.jsx'), 'utf8');

  // Portrait remains the header/main/bottom-nav grid; no landscape selector
  // may replace its rows or turn the bottom nav into a rail.
  assert.match(styles, /@media \(max-width: 1023px\) \{[\s\S]*?grid-template-rows: calc\(44px \+ env\(safe-area-inset-top\)\) minmax\(0, 1fr\) auto;/);
  assert.match(styles, /\.editorial-app > nav \{ position: static !important; grid-row: 3;/);
  assert.match(styles, /@media \(min-width: 1024px\) \{[\s\S]*?grid-template-columns: var\(--desktop-nav-width\) minmax\(0, 1fr\);/);
  assert.match(styles, /@media \(min-width: 1024px\) \{[\s\S]*?\.editorial-app > nav \{ position: static;/);
  assert.match(app, /orientation: landscape.*max-height: 599px.*max-width: 1023px/);
  assert.match(app, /setIsLandscapeNavExpanded\(Boolean\(landscapePhone\)\)/);

  for (const [width, height] of portraitMatrix) {
    assert.ok(width < 599 && height > width, `${width}x${height} remains a portrait phone viewport`);
  }
  assert.ok(1440 >= 1024 && 900 >= 600, '1440x900 remains in the desktop contract');
});

test('landscape dialogs have an in-viewport two-column contract without changing portrait sheets', async () => {
  const styles = await readFile(resolve(serviceRoot, '../styles/global.css'), 'utf8');
  const landscapeBlock = styles.slice(styles.indexOf(landscapeQuery));
  assert.match(landscapeBlock, /\.comment-panel \{ align-items: center; padding: 12px;/);
  assert.match(landscapeBlock, /\.comment-panel__dialog \{ display: grid; grid-template-columns: minmax\(0, 1\.1fr\) minmax\(250px, \.9fr\);/);
  assert.match(landscapeBlock, /\.comment-panel__media \{ display: block;/);
  assert.match(landscapeBlock, /\.comment-panel__sheet-heading \{ display: none; \}/);
  assert.match(styles, /\.comment-panel__dialog \{ position: relative; display: flex; width: 100%;/);
});
