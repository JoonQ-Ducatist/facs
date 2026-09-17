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
  assert.match(source, /onContextMenu=\{protectMediaEvent\}/);
  assert.match(source, /onDragStart=\{protectMediaEvent\}/);
  assert.match(source, /media-card--multi/);
});

test('feed video uses native playback controls without stealing feed gestures', async () => {
  const source = await readFile(resolve(featureRoot, 'FeedView.jsx'), 'utf8');
  assert.match(source, /autoPlay=\{Boolean\(muted\)\}/);
  assert.match(source, /loop=\{Boolean\(muted\)\}/);
  assert.match(source, /preload="metadata"/);
  assert.match(source, /controls=\{!muted\}/);
  assert.match(source, /onPointerDown=\{isolateVideoTouch\}/);
  assert.match(source, /onPointerMove=\{isolateVideoTouch\}/);
  assert.match(source, /onPointerUp=\{isolateVideoTouch\}/);
  assert.match(source, /onPointerCancel=\{isolateVideoTouch\}/);
  assert.match(source, /showFullscreen/);
  assert.match(source, /video-fullscreen-button/);
  assert.match(source, /requestFullscreen/);
  assert.match(source, /webkitEnterFullscreen/);
  assert.match(source, /onLoadedMetadata=\{reportVideoEvent\}/);
  assert.match(source, /function useVideoPoster\(url\)/);
  assert.match(source, /function createRemoteVideoPoster\(url\)/);
  assert.match(source, /poster=\{videoPoster \|\| undefined\}/);
  assert.match(source, /source\.type === 'video' \|\| String\(source\.type \?\? ''\)\.startsWith\('video\/'\)/);
});

test('multi-photo media keeps the central photo full width with fixed edge previews', async () => {
  const styles = await readFile(resolve(featureRoot, '../../styles/global.css'), 'utf8');
  assert.match(styles, /\.media-card \.media-primary \{ inset: 0;/);
  assert.match(styles, /\.media-card--multi \.media-primary \{ inset: 0;/);
  assert.match(styles, /\.media-card--multi \{ background: #fff; \}/);
  assert.match(styles, /\.media-peek \{[^}]*top: 5%; bottom: 5%;[^}]*width: 28px/);
  assert.match(styles, /\.media-peek \{[^}]*background: #fff/);
  assert.match(styles, /\.media-peek \{[^}]*filter: saturate\(\.8\) brightness\(\.68\) blur\(\.35px\)/);
  assert.match(styles, /\.media-peek \{ width: clamp\(24px, 8vw, 32px\); \}/);
  assert.match(styles, /\.media-card:hover \.media-peek/);
  assert.match(styles, /-webkit-touch-callout: none/);
  assert.match(styles, /\.video-fullscreen-button \{[\s\S]*?z-index: 35;/);
});

test('multi-photo edge previews only render for directions that have a neighboring media item', async () => {
  const source = await readFile(resolve(featureRoot, 'FeedView.jsx'), 'utf8');
  assert.match(source, /hasMultipleMedia && mediaIndex > 0 && <div className="media-peek media-peek--left"/);
  assert.match(source, /hasMultipleMedia && mediaIndex < cardMedia\.length - 1 && <div className="media-peek media-peek--right"/);
});
