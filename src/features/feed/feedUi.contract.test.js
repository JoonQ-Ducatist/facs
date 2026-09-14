import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const featureRoot = dirname(fileURLToPath(import.meta.url));

test('feed preserves the uploaded category selection after publishing', async () => {
  const source = await readFile(resolve(featureRoot, '../../App.jsx'), 'utf8');
  assert.match(source, /setFeaturedPostId\(publishedCard\.id\);\s*\/\/ Keep the uploaded category selected[\s\S]*setActiveCategory\(publishedCard\.category\);/);
  assert.match(source, /boostRequested=\{currentCard\?\.boostStatus === 'active'\}/);
});

test('feed cards render protected media and adjacent multi-photo previews', async () => {
  const source = await readFile(resolve(featureRoot, 'FeedView.jsx'), 'utf8');
  assert.match(source, /media-peek media-peek--left/);
  assert.match(source, /media-peek media-peek--right/);
  assert.match(source, /onContextMenu=\{protectMedia\}/);
  assert.match(source, /onDragStart=\{protectMedia\}/);
  assert.match(source, /media-card--multi/);
});

test('multi-photo media keeps the central photo inset while preserving single-photo bleed', async () => {
  const styles = await readFile(resolve(featureRoot, '../../styles/global.css'), 'utf8');
  assert.match(styles, /\.media-card \.media-primary \{ inset: 0;/);
  assert.match(styles, /\.media-card--multi \.media-primary \{ inset: 5% 8%;/);
  assert.match(styles, /-webkit-touch-callout: none/);
});
