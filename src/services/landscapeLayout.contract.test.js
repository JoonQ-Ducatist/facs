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

test('landscape phone keeps a PC-style menu beside a fixed-width scrolling feed', async () => {
  const styles = await readFile(resolve(serviceRoot, '../styles/global.css'), 'utf8');
  assert.ok(styles.includes(`${landscapeQuery} {`), 'landscape contract is scoped to the narrow phone query');
  const landscapeBlock = styles.slice(styles.indexOf(landscapeQuery), styles.indexOf('/* 정의: 넓은 데스크톱'));
  assert.match(landscapeBlock, /\.app-canvas \{ width: 100%; max-width: none;/);
  assert.match(landscapeBlock, /grid-template-columns: 216px minmax\(0, 1fr\);/);
  assert.match(landscapeBlock, /\.editorial-app > header \{ display: none;/);
  assert.match(landscapeBlock, /\.editorial-main \{ grid-column: 2; grid-row: 1; width: 430px; min-width: 430px; max-width: 430px; justify-self: center;/);
  assert.match(landscapeBlock, /\.editorial-main \{[\s\S]*?padding: 0 !important;/);
  assert.match(landscapeBlock, /\.editorial-main--feed \{ display: block !important; overflow: hidden; overscroll-behavior: none;/);
  assert.match(landscapeBlock, /\.editorial-main--feed > \.editorial-feed \{ display: grid; grid-template-rows: auto minmax\(0, 1fr\); height: 100%; min-height: 0; overflow: hidden;/);
  assert.match(landscapeBlock, /\.editorial-main--feed > \.feed-empty \{ display: flex; grid-template-rows: none; overflow: hidden; \}/);
  assert.match(landscapeBlock, /\.editorial-main--feed \.media-carousel \{ display: block; grid-row: 2; height: 100%; min-height: 0; overflow-x: hidden; overflow-y: auto;/);
  assert.match(landscapeBlock, /\.editorial-main--feed \.media-carousel > article \{ display: block; width: 100%; height: 640px; min-height: 640px;/);
  assert.match(landscapeBlock, /\.editorial-app > nav \{ position: static !important; grid-column: 1; grid-row: 1;[\s\S]*?width: 216px;/);
  assert.match(landscapeBlock, /\.editorial-app > nav > \.desktop-nav-items button \{ width: 100%; height: 52px; flex-direction: row;/);
  assert.match(landscapeBlock, /\.desktop-nav-language__mark \{ display: none; \}/);
  assert.match(landscapeBlock, /\.editorial-feed > div:first-child \{ position: relative; grid-row: 1; z-index: 45;/);
  assert.doesNotMatch(landscapeBlock, /landscape-nav-rail|landscape-nav-collapsed/);

  for (const [width, height] of landscapeMatrix) {
    assert.ok(width >= 600 && width < 1024 && height < 600, `${width}x${height} belongs to the narrow landscape contract`);
  }
});

test('portrait mobile and desktop keep their original navigation ownership', async () => {
  const styles = await readFile(resolve(serviceRoot, '../styles/global.css'), 'utf8');

  // Portrait remains the header/main/bottom-nav grid; no landscape selector
  // may replace its rows or turn the bottom nav into a rail.
  assert.match(styles, /@media \(max-width: 1023px\) \{[\s\S]*?\.editorial-app > header \{ position: fixed !important; inset: 0 0 auto; z-index: 60 !important;/);
  assert.match(styles, /@media \(max-width: 1023px\) \{[\s\S]*?\.editorial-app > nav \{ position: fixed !important; inset: auto 0 0; z-index: 60 !important;/);
  assert.match(styles, /@media \(max-width: 1023px\) and \(orientation: portrait\) \{[\s\S]*?\.editorial-app > header \{ display: block !important; position: fixed !important; inset: 0 0 auto;/);
  assert.match(styles, /@media \(max-width: 1023px\) and \(orientation: portrait\) \{[\s\S]*?\.editorial-app > nav \{ display: block !important; position: fixed !important; inset: auto 0 0; z-index: 60 !important;/);
  assert.match(styles, /@media \(min-width: 1024px\) \{[\s\S]*?grid-template-columns: var\(--desktop-nav-width\) minmax\(0, 1fr\);/);
  assert.match(styles, /@media \(min-width: 1024px\) \{[\s\S]*?\.editorial-app > nav \{ position: static;/);
  assert.doesNotMatch(styles, /editorial-app--landscape-nav-open/);

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
