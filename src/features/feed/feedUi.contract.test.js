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
  assert.match(source, /controls=\{interactive && !muted && !showFullscreen\}/);
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

test('feed uses native momentum scrolling without intercepting vertical touches', async () => {
  const source = await readFile(resolve(featureRoot, 'FeedView.jsx'), 'utf8');
  const styles = await readFile(resolve(featureRoot, '../../styles/global.css'), 'utf8');
  assert.match(source, /cards\.map\(\(item\) => <FeedPost/);
  assert.doesNotMatch(source, /resolveTouchFeedDirection|resolveWheelFeedDirection|touchNavigationLocked|wheelLocked|navigateFeed\(/);
  assert.match(styles, /Continuous social feed:[\s\S]*?\.editorial-main--feed \{ overflow-y: auto !important/);
  assert.match(styles, /\.media-carousel--scroll > \.feed-post-card \{[\s\S]*?flex: 0 0 auto/);
  assert.match(styles, /-webkit-overflow-scrolling: touch/);
  assert.doesNotMatch(source, /section\.addEventListener\('touchmove'|scrollRoot\.scrollTop =/);
  assert.doesNotMatch(source + styles, /feed-edge--dragging|feed-edge--release|feed-edge-offset|edgeOffset/);
});

test('empty categories keep the category rail and the last card clears mobile navigation', async () => {
  const source = await readFile(resolve(featureRoot, 'FeedView.jsx'), 'utf8');
  const styles = await readFile(resolve(featureRoot, '../../styles/global.css'), 'utf8');
  assert.doesNotMatch(source, /if \(!cards\.length\) return <EmptyFeed/);
  assert.match(source, /<div ref=\{categoryRailRef\}[\s\S]*?\{cards\.length \? <section ref=\{feedRef\}[\s\S]*?: <EmptyFeed/);
  assert.match(styles, /@media \(max-width: 1023px\) and \(orientation: portrait\) \{\s*\.editorial-main--feed \.media-carousel--scroll \{ padding-bottom: calc\(96px \+ env\(safe-area-inset-bottom\)\); \}/);
});

test('desktop and landscape category rail sits outside the isolated card-list scrollport', async () => {
  const source = await readFile(resolve(featureRoot, 'FeedView.jsx'), 'utf8');
  const styles = await readFile(resolve(featureRoot, '../../styles/global.css'), 'utf8');
  assert.match(source, /return <>\s*<div[^>]+className="feed-category-rail[^\"]*shrink-0/);
  assert.match(source, /<section ref=\{feedRef\} className="editorial-feed editorial-feed--scroll/);
  assert.match(styles, /@media \(min-width: 1024px\), \(orientation: landscape\) and \(max-width: 1023px\) \{[\s\S]*?\.editorial-main--feed \{[\s\S]*?overflow: hidden !important;[\s\S]*?\.editorial-main--feed > \.feed-category-rail \{[\s\S]*?flex: 0 0 auto;[\s\S]*?\.editorial-main--feed > \.editorial-feed\.editorial-feed--scroll \{[\s\S]*?overflow-y: auto !important;/);
  assert.match(styles, /\.editorial-main--feed > \.feed-category-rail \{ position: sticky; top: 0; z-index: 70; isolation: isolate/);
});

test('feed media responds to horizontal touch swipes while preserving vertical scrolling', async () => {
  const source = await readFile(resolve(featureRoot, 'FeedView.jsx'), 'utf8');
  const styles = await readFile(resolve(featureRoot, '../../styles/global.css'), 'utf8');
  assert.match(source, /onTouchStart=\{startMediaSwipe\} onTouchMove=\{moveMediaSwipe\} onTouchEnd=\{finishMediaSwipe\}/);
  assert.match(source, /event\.touches\.length !== 1/);
  assert.match(source, /target\?\.closest\('button, a, input, textarea, select, \[role="dialog"\]'\)/);
  assert.match(source, /Math\.abs\(touch\.clientX - start\.x\) <= Math\.abs\(touch\.clientY - start\.y\)/);
  assert.match(source, /Math\.abs\(deltaX\) \/ Math\.max\(1, event\.timeStamp - start\.time\)/);
  assert.match(source, /start\.width \* 0\.2[\s\S]*?velocity >= 0\.35/);
  assert.match(source, /media-primary__track[\s\S]*?media\.map\(\(slide, index\)/);
  assert.match(styles, /\.media-primary__track\.media-track--dragging \{ transition: none; \}/);
  assert.match(source, /controls=\{interactive && !muted && !showFullscreen\}/);
  assert.match(source, /loading=\{loaded \? 'eager' : 'lazy'\}/);
  assert.match(source, /src=\{interactive \? source\.url : undefined\}/);
  assert.match(source, /preload=\{interactive \? \(showFullscreen && !muted \? 'auto' : 'metadata'\) : 'none'\}/);
  assert.match(source, /videoRef\.current\?\.pause\(\)/);
  assert.match(styles, /\.media-carousel--scroll > \.feed-post-card \{[^}]*touch-action: pan-y/);
});

test('mobile header hides during portrait scrolling while navigation stays fixed and carousel arrows remain symmetric', async () => {
  const source = await readFile(resolve(featureRoot, '../../App.jsx'), 'utf8');
  const styles = await readFile(resolve(featureRoot, '../../styles/global.css'), 'utf8');
  assert.match(source, /function handleMainScroll\(\)[\s\S]*?matchMedia\('\(max-width: 1023px\) and \(orientation: portrait\)'\)[\s\S]*?setMobileHeaderVisible\(false\)[\s\S]*?setTimeout\(\(\) => setMobileHeaderVisible\(true\), 220\)/);
  assert.match(source, /onScroll=\{handleMainScroll\}/);
  assert.match(styles, /@media \(max-width: 1023px\) and \(orientation: portrait\) \{[\s\S]*?\.editorial-app > nav \{[\s\S]*?border-radius: 999px/);
  assert.match(styles, /height: 48px;\s*min-height: 48px;[\s\S]*?background: rgba\(255,255,255,\.26\)[\s\S]*?backdrop-filter: blur\(10px\)/);
  assert.match(styles, /button \.material-symbols-outlined \{[\s\S]*?color: #101114 !important;[\s\S]*?wght' 500/);
  assert.match(styles, /button\[aria-current="page"\] \{[\s\S]*?background: rgba\(16,17,20,\.08\) !important/);
  assert.match(styles, /\.editorial-main \{\s*inset: calc\(44px \+ env\(safe-area-inset-top\)\) 0 0 0;\s*padding-bottom: calc\(76px \+ env\(safe-area-inset-bottom\)\) !important;/);
  assert.match(styles, /\.editorial-app--header-hidden > header \{ transform: translateY\(-110%\); \}/);
  assert.doesNotMatch(styles, /\.editorial-app--header-hidden > nav/);
  assert.match(styles, /\.editorial-app--header-hidden > \.editorial-main--feed \{ inset: 0 !important; \}/);
  assert.doesNotMatch(styles, /\.editorial-app--header-hidden > \.editorial-main \{ inset: 0 !important; \}/);
  assert.match(styles, /\.editorial-app::before,[\s\S]*?backdrop-filter: blur\(5px\)/);
  assert.match(styles, /\.media-card-photo-nav__button--left \{ left: 16px; \}[\s\S]*?\.media-card-photo-nav__button--right \{ right: 16px; \}/);
});

test('portrait mobile navigation shows localized labels below its icons', async () => {
  const source = await readFile(resolve(featureRoot, '../../App.jsx'), 'utf8');
  const styles = await readFile(resolve(featureRoot, '../../styles/global.css'), 'utf8');
  assert.match(source, /\{ ko: '피드', en: 'Feed' \}/);
  assert.match(source, /\{ ko: '업로드', en: 'Upload' \}/);
  assert.match(source, /\{ ko: '랭킹', en: 'Ranking' \}/);
  assert.match(source, /\{ ko: '프로필', en: 'Profile' \}/);
  assert.match(source, /className="mobile-nav-label">\{labels\[locale\]\}/);
  assert.match(styles, /@media \(max-width: 1023px\) and \(orientation: portrait\) \{[\s\S]*?button \.mobile-nav-label \{[\s\S]*?font-size: 10px;[\s\S]*?font-weight: 500;[\s\S]*?line-height: 12px;/);
  assert.match(styles, /button\[aria-current="page"\] \.mobile-nav-label \{ font-weight: 600; \}/);
});

test('feed preserves touch-safe cards while desktop and landscape scroll the card list below categories', async () => {
  const styles = await readFile(resolve(featureRoot, '../../styles/global.css'), 'utf8');
  assert.match(styles, /\.feed-post-card \{[\s\S]*?touch-action: pan-y/);
  assert.match(styles, /\.editorial-main--feed > \.editorial-feed\.editorial-feed--scroll \{[\s\S]*?overflow-y: auto !important/);
});

test('feed cards meet without a bright gutter while preserving scroll and navigation clearance', async () => {
  const styles = await readFile(resolve(featureRoot, '../../styles/global.css'), 'utf8');
  assert.match(styles, /\.editorial-main--feed \.media-carousel--scroll \{[^}]*gap: 0;[^}]*background: #000;/);
  assert.match(styles, /\.media-carousel--scroll > \.feed-post-card \{[^}]*border-bottom: 1px solid rgba\(255,255,255,\.15\);[^}]*touch-action: pan-y/);
  assert.match(styles, /@media \(max-width: 1023px\) and \(orientation: portrait\) \{\s*\.editorial-main--feed \.media-carousel--scroll \{ padding-bottom: calc\(96px \+ env\(safe-area-inset-bottom\)\); \}/);
});

test('portrait single-post cards fit below fixed navigation with native scrolling', async () => {
  const source = await readFile(resolve(featureRoot, 'FeedView.jsx'), 'utf8');
  const styles = await readFile(resolve(featureRoot, '../../styles/global.css'), 'utf8');
  assert.doesNotMatch(source, /onTouchMove=\{.*preventDefault|scrollRoot\.scrollTop =/);
  assert.match(styles, /@media \(max-width: 1023px\) and \(orientation: portrait\) \{[\s\S]*?\.editorial-main--feed \.media-carousel--scroll > \.feed-post-card \{\s*height: min\(720px, calc\(100dvh - 132px - env\(safe-area-inset-top\) - env\(safe-area-inset-bottom\)\)\);\s*min-height: min\(480px, calc\(100dvh - 132px - env\(safe-area-inset-top\) - env\(safe-area-inset-bottom\)\)\);/);
});

test('feed pages content and activates media only near the scroll viewport', async () => {
  const source = await readFile(resolve(featureRoot, 'FeedView.jsx'), 'utf8');
  const app = await readFile(resolve(featureRoot, '../../App.jsx'), 'utf8');
  assert.match(app, /listSupabasePublishedFeedCards\(\{ category: requestedCategory, limit: 10, cursor: null \}\)/);
  assert.match(app, /listSupabasePublishedFeedCards\(\{ category: pageState\.category, limit: 10, cursor: pageState\.cursor \}\)/);
  assert.match(app, /\[authUser\?\.id, feedRefreshKey, activeCategory, featuredPostId\]/);
  assert.match(source, /rootMargin: '480px 0px'/);
  assert.match(source, /interactive=\{nearViewport && index === mediaIndex\}/);
  assert.match(source, /loaded=\{nearViewport && Math\.abs\(index - mediaIndex\) <= 1\}/);
  assert.match(source, /src=\{loaded \? source\.url : undefined\}/);
  assert.match(source, /rootMargin: '640px 0px'/);
});

test('feed preserves the uploaded category selection after publishing', async () => {
  const source = await readFile(resolve(featureRoot, '../../App.jsx'), 'utf8');
  assert.match(source, /setFeaturedPostId\(publishedCard\.id\);\s*\/\/ Keep the uploaded category selected[\s\S]*setActiveCategory\(publishedCard\.category\);/);
  const feed = await readFile(resolve(featureRoot, 'FeedView.jsx'), 'utf8');
  assert.match(feed, /boostRequested=\{boostedPostIds\?\.has\(item\.id\) \|\| item\.boostStatus === 'active'\}/);
  assert.match(source, /setBoostCandidateIds\(\(ids\) => new Set\(\[\.\.\.ids, publishedCard\.id\]\)\)/);
  assert.match(source, /next\.delete\(reaction\.postId\)/);
});

test('a server-eligible low-rating post invites more feedback without technical Boost language', async () => {
  const source = await readFile(resolve(featureRoot, 'FeedView.jsx'), 'utf8');
  const card = await readFile(resolve(featureRoot, 'ResultCard.jsx'), 'utf8');
  const app = await readFile(resolve(featureRoot, '../../App.jsx'), 'utf8');
  const styles = await readFile(resolve(featureRoot, '../../styles/global.css'), 'utf8');
  assert.match(source, /if \(total === 0\) return <ResultCard locale=\{locale\}[\s\S]*?onBoost=\{onBoost\}/);
  assert.match(card, /onBoost && <button type="button" onClick=\{onBoost\}/);
  assert.match(source, /onBoost \? \(locale === 'en' \? 'No ratings yet\. Ask more people what they think\.'/);
  assert.match(source, /: \(locale === 'en' \? 'No ratings yet\.' : '아직 평가가 모이지 않았어요\.'\)/);
  assert.match(source, /더 많은 사람의 생각을 들어보세요/);
  assert.match(card, /더 많은 사람에게 물어보기/);
  assert.match(card, /Ask more people/);
  assert.match(card, /더 많은 사람에게 보여주고 있어요/);
  assert.match(card, /Showing this to more people/);
  assert.doesNotMatch(card, /MVP 무료 부스트|무료로 더 노출하기|Free MVP Boost|Boost for free/);
  assert.doesNotMatch(source, /canOfferBoost/);
  assert.match(source, /sampleStatus=\{sampleStatus\} boostRequested=\{boostRequested\} onBoost=\{onBoost\}/);
  assert.doesNotMatch(source, /Boost · ₩1,000/);
  assert.match(app, /role="status" className="app-toast fixed left-1\/2 z-\[100\]/);
  assert.match(styles, /\.app-toast \{ top: calc\(96px \+ env\(safe-area-inset-top\)\); pointer-events: none; \}/);
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

test('feed cards render protected media and adjacent slides only when loaded', async () => {
  const source = await readFile(resolve(featureRoot, 'FeedView.jsx'), 'utf8');
  assert.match(source, /media-primary__track[\s\S]*?media\.map\(\(slide, index\)/);
  assert.match(source, /loaded=\{nearViewport && Math\.abs\(index - mediaIndex\) <= 1\}/);
  assert.match(source, /onContextMenu=\{protectMedia\}/);
  assert.match(source, /onDragStart=\{protectMedia\}/);
  assert.match(source, /media\.length > 1 && <MediaProgress/);
});

test('feed video owns fullscreen gestures in unstarted, playing and replay states without stealing carousel gestures', async () => {
  const source = await readFile(resolve(featureRoot, 'FeedView.jsx'), 'utf8');
  const fullscreenSource = await readFile(resolve(featureRoot, 'videoFullscreen.js'), 'utf8');
  assert.match(source, /autoPlay=\{Boolean\(muted\)\}/);
  assert.match(source, /loop=\{Boolean\(muted\)\}/);
  assert.match(source, /preload=\{interactive \? \(showFullscreen && !muted \? 'auto' : 'metadata'\) : 'none'\}/);
  assert.match(source, /controls=\{interactive && !muted && !showFullscreen\}/);
  assert.match(source, /onPointerDown=\{isolateVideoTouch\}/);
  assert.match(source, /onPointerMove=\{isolateVideoTouch\}/);
  assert.match(source, /onPointerUp=\{isolateVideoTouch\}/);
  assert.match(source, /onPointerCancel=\{isolateVideoTouch\}/);
  assert.match(source, /event\.clientY >= bounds\.bottom - 58/);
  assert.match(source, /data-video-fullscreen-button/);
  assert.match(source, /target\?\.closest\('button, a, input, textarea, select, \[role="dialog"\]'\)/);
  assert.match(source, /function enterFullscreen|const enterFullscreen/);
  assert.match(source, /enterNativeVideoFullscreen\(videoRef\.current\)/);
  assert.match(fullscreenSource, /webkitEnterFullscreen/);
  assert.match(fullscreenSource, /if \(video\.readyState === 0\) video\.load\(\)/);
  assert.match(fullscreenSource, /if \(video\.paused\) playRequest = video\.play\(\)/);
  assert.match(fullscreenSource, /webkitDisplayingFullscreen/);
  assert.match(fullscreenSource, /restorePreviewAfterFailure/);
  assert.match(fullscreenSource, /requestFullscreen/);
  assert.match(source, /onPointerDown=\{stopVideoControlGesture\}/);
  assert.match(source, /onClick=\{enterFullscreen\}/);
  assert.doesNotMatch(source, /fullscreenActive|fullscreenSnapshotRef|fullscreenRequestRef|facs-video-fullscreen-active/);
  assert.match(source, /onLoadedMetadata=\{reportVideoEvent\}/);
  assert.match(source, /function useVideoPoster\(url\)/);
  assert.match(source, /function createRemoteVideoPoster\(url\)/);
  assert.match(source, /poster=\{videoPoster \|\| undefined\}/);
  assert.match(source, /source\.type === 'video' \|\| String\(source\.type \?\? ''\)\.startsWith\('video\/'\)/);
});

test('multi-photo media keeps a full-width track and follows horizontal dragging', async () => {
  const styles = await readFile(resolve(featureRoot, '../../styles/global.css'), 'utf8');
  const source = await readFile(resolve(featureRoot, 'FeedView.jsx'), 'utf8');
  assert.match(styles, /\.media-card \.media-primary \{ inset: 0;/);
  assert.match(styles, /\.media-primary__track \{ display: flex; width: 100%; height: 100%;/);
  assert.match(styles, /\.media-primary__track\.media-track--dragging \{ transition: none; \}/);
  assert.match(source, /mediaTrackRef\.current\?\.style\.setProperty\('--media-drag-offset', `\$\{resistedDelta\}px`\)/);
  assert.match(source, /Math\.abs\(deltaX\) >= start\.width \* 0\.2/);
  assert.match(source, /translate3d\(calc\(\$\{-mediaIndex \* 100\}% \+ var\(--media-drag-offset, 0px\)\), 0, 0\)/);
  assert.match(styles, /-webkit-touch-callout: none/);
});

test('multi-photo navigation hides unavailable directions and shows position', async () => {
  const source = await readFile(resolve(featureRoot, 'FeedView.jsx'), 'utf8');
  assert.match(source, /mediaIndex === 0 \? 'invisible' : ''/);
  assert.match(source, /mediaIndex === media\.length - 1 \? 'invisible' : ''/);
  assert.match(source, /media\.length > 1 && <MediaProgress/);
});

test('feed navigation uses native vertical scrolling without card-step controls', async () => {
  const source = await readFile(resolve(featureRoot, 'FeedView.jsx'), 'utf8');
  const styles = await readFile(resolve(featureRoot, '../../styles/global.css'), 'utf8');
  assert.match(styles, /\.editorial-main--feed \.media-carousel \{[^}]*overflow-y: auto;[^}]*touch-action: pan-y/);
  assert.match(source, /onTouchStart=\{startMediaSwipe\} onTouchMove=\{moveMediaSwipe\} onTouchEnd=\{finishMediaSwipe\}/);
  assert.doesNotMatch(source, /resolveTouchFeedDirection|resolveWheelFeedDirection|setPointerCapture/);
  assert.doesNotMatch(source, /function ArrowButton/);
});

test('browser lifecycle fixes the authenticated shell while preserving isolated body scrolling', async () => {
  const source = await readFile(resolve(featureRoot, '../../App.jsx'), 'utf8');
  const html = await readFile(resolve(featureRoot, '../../../index.html'), 'utf8');
  const styles = await readFile(resolve(featureRoot, '../../styles/global.css'), 'utf8');
  assert.match(html, /window\.history\.scrollRestoration = 'manual'/);
  assert.match(html, /window\.visualViewport\?\.height/);
  assert.doesNotMatch(html, /normalizeInitialViewport|--xc-app-offset-top/);
  assert.doesNotMatch(source, /syncAppCanvasHeight|settleAppCanvasAfterKeyboardDismissal|visualViewport/);
  assert.match(styles, /\.app-stage \{ position: relative;[\s\S]*?height: 100vh; height: var\(--xc-app-height, 100dvh\);/);
  assert.match(styles, /\.editorial-app \{ position: absolute; inset: 0;[\s\S]*?overflow: hidden; overscroll-behavior: none;/);
  assert.match(styles, /\.editorial-main--scroll \{ overflow-y: auto;/);
  assert.match(styles, /\.editorial-app > header \{ position: fixed !important; inset: 0 0 auto; z-index: 60 !important;/);
  assert.match(styles, /\.editorial-app > nav \{ position: fixed !important; inset: auto 0 0; z-index: 60 !important;/);
  assert.match(source, /window\.addEventListener\('pageshow', syncViewport\)/);
  assert.match(source, /document\.addEventListener\('visibilitychange', onVisibilityChange\)/);
  assert.match(source, /window\.addEventListener\('orientationchange', syncViewport\)/);
  assert.match(source, /querySelectorAll\('\[data-app-scroll-root\]'\)/);
  assert.match(source, /<main ref=\{mainRef\} data-app-scroll-root/);
});
