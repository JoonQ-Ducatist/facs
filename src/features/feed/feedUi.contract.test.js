import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const featureRoot = dirname(fileURLToPath(import.meta.url));

test('feed videos expose a centered play affordance without stealing carousel gestures', async () => {
  const source = await readFile(resolve(featureRoot, 'FeedView.jsx'), 'utf8');
  const styles = await readFile(resolve(featureRoot, '../../styles/global.css'), 'utf8');
  assert.match(source, /const \[isVideoPlaying, setIsVideoPlaying\] = useState\(false\)/);
  assert.match(source, /data-video-play-button/);
  assert.match(source, /void video\.play\(\)\.catch/);
  assert.match(source, /controls=\{!muted && !showFullscreen\}/);
  assert.match(source, /aria-pressed=\{isVideoPlaying\}/);
  assert.match(source, /\{isVideoPlaying \? 'pause' : 'play_arrow'\}/);
  assert.match(source, /if \(!video\.paused\) \{\s*video\.pause\(\)/);
  assert.match(source, /onPointerUp=\{toggleInlinePlayback\}/);
  assert.match(source, /if \(event\.detail === 0\) toggleInlinePlayback\(event\)/);
  assert.match(source, /<div className="media-primary absolute overflow-hidden">/);
  assert.doesNotMatch(source, /<div className="media-primary absolute z-10 overflow-hidden">/);
  assert.match(source, /<div className="video-card-controls absolute inset-0 z-30 pointer-events-none">/);
  assert.match(styles, /\.video-card-controls \{[\s\S]*?z-index: 30;[\s\S]*?pointer-events: none/);
  assert.match(styles, /\.video-card-play-button \{[\s\S]*?left: 50%; top: 50%;[\s\S]*?z-index: 1;[\s\S]*?display: inline-flex !important;[\s\S]*?pointer-events: auto/);
  assert.match(styles, /\.video-fullscreen-button \{[\s\S]*?top: calc\(46px \+ env\(safe-area-inset-top\)\);[\s\S]*?right: calc\(12px \+ env\(safe-area-inset-right\)\);[\s\S]*?width: 32px; height: 32px/);
});

test('feed leaves vertical movement to the native continuous scroll container', async () => {
  const source = await readFile(resolve(featureRoot, 'FeedView.jsx'), 'utf8');
  const styles = await readFile(resolve(featureRoot, '../../styles/global.css'), 'utf8');
  assert.match(source, /cards\.map\(\(item\) => <FeedPost/);
  assert.doesNotMatch(source, /resolveTouchFeedDirection|resolveWheelFeedDirection|touchNavigationLocked|wheelLocked|navigateFeed\(/);
  assert.match(styles, /Continuous social feed:[\s\S]*?\.editorial-main--feed \{ overflow-y: auto !important/);
  assert.match(styles, /\.media-carousel--scroll > \.feed-post-card \{[\s\S]*?flex: 0 0 auto/);
});

test('continuous feed retains native touch scrolling in portrait and landscape', async () => {
  const styles = await readFile(resolve(featureRoot, '../../styles/global.css'), 'utf8');
  assert.match(styles, /\.feed-post-card \{[\s\S]*?touch-action: pan-y/);
  assert.match(styles, /@media \(orientation: landscape\)[\s\S]*?\.editorial-main--feed \{ overflow-y: auto !important/);
});

test('feed preserves the uploaded category selection after publishing', async () => {
  const source = await readFile(resolve(featureRoot, '../../App.jsx'), 'utf8');
  assert.match(source, /setFeaturedPostId\(publishedCard\.id\);\s*\/\/ Keep the uploaded category selected[\s\S]*setActiveCategory\(publishedCard\.category\);/);
  assert.match(source, /boostRequested=\{item\.boostStatus === 'active'\}/);
  assert.match(source, /setBoostCandidateIds\(\(ids\) => new Set\(\[\.\.\.ids, publishedCard\.id\]\)\)/);
  assert.match(source, /next\.delete\(reaction\.postId\)/);
});

test('a server-eligible zero-rating post exposes the recovery Boost request without implying payment', async () => {
  const source = await readFile(resolve(featureRoot, 'FeedView.jsx'), 'utf8');
  assert.match(source, /if \(total === 0\) return <ResultShell total=\{total\} color=\{color\} onBoost=\{onBoost\}/);
  assert.match(source, /평가를 기다리고 있어요/);
  assert.match(source, /더 많은 평가 받아보기/);
  assert.doesNotMatch(source, /Boost · ₩1,000/);
});

test('sharing stays with the card action row instead of competing with media controls', async () => {
  const source = await readFile(resolve(featureRoot, 'FeedView.jsx'), 'utf8');
  assert.match(source, /onShare=\{\(\) => onShare\(card\)\}/);
  assert.match(source, /<Share2 aria-hidden="true" size=\{16\}/);
  assert.doesNotMatch(source, /ShareRailButton/);
});

test('signed-in viewers can report another author with every approved reason and immediate submission state', async () => {
  const source = await readFile(resolve(featureRoot, 'FeedView.jsx'), 'utf8');
  for (const reason of ['spam', 'hate', 'harassment', 'sexual_content', 'privacy', 'defamation', 'social_norm_violation', 'other']) assert.match(source, new RegExp(`\\['${reason}'`));
  assert.match(source, /canReport=\{Boolean\(currentUserId && card\.authorId\) && card\.authorId !== currentUserId\}/);
  assert.match(source, /const result = await onSubmit\(reason\)/);
  assert.match(source, /setNotice\(korean \? '신고가 접수됐어요\.'/);
  assert.match(source, /higher-layer dialog[\s\S]*?onClose\(\);/);
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
  assert.match(styles, /\.editorial-app > header \{ position: fixed !important; inset: 0 0 auto; z-index: 60 !important;/);
  assert.match(styles, /\.editorial-app > nav \{ position: fixed !important; inset: auto 0 0; z-index: 60 !important;/);
  assert.match(source, /window\.addEventListener\('pageshow', scheduleReset\)/);
  assert.match(source, /window\.addEventListener\('orientationchange', scheduleReset\)/);
  assert.match(source, /mainRef\.current\.scrollTop = 0/);
});
