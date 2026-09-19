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
  assert.match(source, /media-peek media-peek--continuous media-peek--left/);
  assert.match(source, /media-peek media-peek--continuous media-peek--right/);
  assert.match(source, /onContextMenu=\{protectMedia\}/);
  assert.match(source, /onDragStart=\{protectMedia\}/);
  assert.match(source, /onContextMenu=\{protectMediaEvent\}/);
  assert.match(source, /onDragStart=\{protectMediaEvent\}/);
  assert.match(source, /media-card--multi/);
});

test('feed video owns fullscreen gestures in unstarted, playing and replay states without stealing carousel gestures', async () => {
  const source = await readFile(resolve(featureRoot, 'FeedView.jsx'), 'utf8');
  const fullscreenSource = await readFile(resolve(featureRoot, 'videoFullscreen.js'), 'utf8');
  assert.match(source, /autoPlay=\{Boolean\(muted\)\}/);
  assert.match(source, /loop=\{Boolean\(muted\)\}/);
  assert.match(source, /preload=\{showFullscreen && !muted \? 'auto' : 'metadata'\}/);
  assert.match(source, /controls=\{!muted\}/);
  assert.match(source, /onPointerDown=\{isolateVideoTouch\}/);
  assert.match(source, /onPointerMove=\{isolateVideoTouch\}/);
  assert.match(source, /onPointerUp=\{isolateVideoTouch\}/);
  assert.match(source, /onPointerCancel=\{isolateVideoTouch\}/);
  assert.match(source, /event\.clientY >= bounds\.bottom - 58/);
  assert.match(source, /data-video-fullscreen-button/);
  assert.match(source, /target\.closest\('button, input, textarea, \[data-video-fullscreen-button\]'\)/);
  assert.match(source, /pointerId: event\.pointerId/);
  assert.match(source, /gestureStart\.current\.pointerId !== event\.pointerId/);
  assert.match(source, /onLostPointerCapture=\{cancelCapturedCardGesture\}/);
  assert.match(source, /if \(gestureStart\.current\) resetCardGesture\(\)/);
  assert.match(source, /function enterFullscreen|const enterFullscreen/);
  assert.match(source, /enterNativeVideoFullscreen\(video\)/);
  assert.match(fullscreenSource, /webkitEnterFullscreen/);
  assert.match(fullscreenSource, /if \(video\.readyState === 0\) video\.load\(\)/);
  assert.match(fullscreenSource, /if \(video\.paused\) playRequest = video\.play\(\)/);
  assert.match(fullscreenSource, /webkitDisplayingFullscreen/);
  assert.match(fullscreenSource, /restorePreviewAfterFailure/);
  assert.match(fullscreenSource, /requestFullscreen/);
  assert.match(source, /onPointerDown=\{stopFullscreenGesture\}/);
  assert.match(source, /onClick=\{enterFullscreen\}/);
  assert.doesNotMatch(source, /fullscreenActive|fullscreenSnapshotRef|fullscreenRequestRef|facs-video-fullscreen-active/);
  assert.match(source, /onLoadedMetadata=\{reportVideoEvent\}/);
  assert.match(source, /function useVideoPoster\(url\)/);
  assert.match(source, /function createRemoteVideoPoster\(url\)/);
  assert.match(source, /poster=\{videoPoster \|\| undefined\}/);
  assert.match(source, /source\.type === 'video' \|\| String\(source\.type \?\? ''\)\.startsWith\('video\/'\)/);
});

test('multi-photo media keeps a full-width center track with continuous edge previews', async () => {
  const styles = await readFile(resolve(featureRoot, '../../styles/global.css'), 'utf8');
  const source = await readFile(resolve(featureRoot, 'FeedView.jsx'), 'utf8');
  assert.match(styles, /\.media-card \.media-primary \{ inset: 0;/);
  assert.match(styles, /\.media-card--multi \.media-primary \{ inset: 0;/);
  assert.match(styles, /\.media-card--multi \{ background: #fff; \}/);
  assert.match(styles, /\.media-peek--continuous \{[^}]*--media-peek-width: 28px;[^}]*width: 100%/);
  assert.match(styles, /\.media-peek \{[^}]*background: #fff/);
  assert.match(styles, /\.media-peek \{[^}]*filter: saturate\(\.8\) brightness\(\.68\) blur\(\.35px\)/);
  assert.match(styles, /\.media-peek--continuous \{ --media-peek-width: clamp\(24px, 8vw, 32px\); width: 100%; \}/);
  assert.match(styles, /\.media-card--dragging \.media-peek--continuous \{ transition: none; \}/);
  assert.match(source, /const width = Math\.max\(1, mediaCardRef\.current\?\.clientWidth/);
  assert.match(source, /deltaX \* 0\.2/);
  assert.match(source, /function bounceMedia\(direction\)/);
  assert.match(styles, /\.media-carousel--resist-left/);
  assert.match(styles, /\.media-carousel--resist-right/);
  assert.match(source, /const travel = Math\.max\(1, mediaCardRef\.current\?\.clientWidth/);
  assert.match(source, /translate3d\(calc\(-100% \+ var\(--media-peek-width\) \+ \$\{dragOffset\}px/);
  assert.match(source, /translate3d\(calc\(100% - var\(--media-peek-width\) \+ \$\{dragOffset\}px/);
  assert.match(styles, /\.media-card:hover \.media-peek/);
  assert.match(styles, /-webkit-touch-callout: none/);
  assert.match(styles, /\.video-fullscreen-button \{[\s\S]*?z-index: 35;[\s\S]*?width: 44px; height: 44px/);
  assert.match(styles, /\.video-fullscreen-button \{[\s\S]*?right: calc\(40px \+ env\(safe-area-inset-right\)\)/);
  assert.match(styles, /\.video-fullscreen-button \{[\s\S]*?pointer-events: auto/);
});

test('multi-photo edge previews only render for directions that have a neighboring media item', async () => {
  const source = await readFile(resolve(featureRoot, 'FeedView.jsx'), 'utf8');
  assert.match(source, /hasMultipleMedia && mediaIndex > 0 && <div className="media-peek media-peek--continuous media-peek--left"/);
  assert.match(source, /hasMultipleMedia && mediaIndex < cardMedia\.length - 1 && <div className="media-peek media-peek--continuous media-peek--right"/);
});

test('feed navigation uses scroll and touch handoff without visible up/down controls', async () => {
  const source = await readFile(resolve(featureRoot, 'FeedView.jsx'), 'utf8');
  assert.match(source, /className=\{`media-card[^`]*touch-pan-y/);
  assert.match(source, /if \(event\.pointerType === 'mouse'\) event\.currentTarget\.setPointerCapture/);
  assert.match(source, /onTouchStart=\{startCardTouch\}/);
  assert.match(source, /onTouchEnd=\{finishCardTouch\}/);
  assert.match(source, /function getCardScrollOwner\(element\)/);
  assert.match(source, /carousel\.scrollHeight > carousel\.clientHeight \+ 2/);
  assert.match(source, /resolveTouchFeedDirection\(/);
  assert.match(source, /resolveWheelFeedDirection\(/);
  assert.doesNotMatch(source, /function ArrowButton/);
  assert.doesNotMatch(source, /label="이전 카드"/);
  assert.doesNotMatch(source, /label="다음 카드"/);
});

test('browser lifecycle fixes the authenticated shell while preserving isolated body scrolling', async () => {
  const source = await readFile(resolve(featureRoot, '../../App.jsx'), 'utf8');
  const html = await readFile(resolve(featureRoot, '../../../index.html'), 'utf8');
  const styles = await readFile(resolve(featureRoot, '../../styles/global.css'), 'utf8');
  assert.doesNotMatch(html, /scrollRestoration|normalizeInitialViewport|visualViewport/);
  assert.doesNotMatch(source, /syncAppCanvasHeight|settleAppCanvasAfterKeyboardDismissal|visualViewport/);
  assert.match(styles, /\.app-stage \{ position: relative;[\s\S]*?height: 100vh; height: 100dvh;/);
  assert.match(styles, /\.editorial-app \{ position: fixed; inset: 0;[\s\S]*?overflow: hidden; overscroll-behavior: none;/);
  assert.match(styles, /\.editorial-main--scroll \{ overflow-y: auto;/);
  assert.match(styles, /\.editorial-app > header \{ position: static !important; grid-row: 1;/);
  assert.match(styles, /\.editorial-app > nav \{ position: static !important; grid-row: 3;/);
  assert.match(source, /window\.addEventListener\('pageshow', scheduleReset\)/);
  assert.match(source, /window\.addEventListener\('orientationchange', scheduleReset\)/);
  assert.match(source, /mainRef\.current\.scrollTop = 0/);
});
