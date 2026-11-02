import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const app = await readFile(new URL('../../App.jsx', import.meta.url), 'utf8');
const feed = await readFile(new URL('./FeedView.jsx', import.meta.url), 'utf8');
const css = await readFile(new URL('../../styles/global.css', import.meta.url), 'utf8');

test('every visible server card can replay again after leaving and re-entering', () => {
  assert.match(app, /visibleFeedPostIds\.has\(card\.id\) && isSupabasePost\(card\)/);
  assert.doesNotMatch(app, /isLiveReactionWindow/);
  assert.doesNotMatch(app, /card\.authorId === authUser\.id \|\| votedIds\.has\(card\.id\)/);
  assert.match(app, /enteredPostIds = \[\.\.\.currentPostIds\]\.filter\(\(postId\) => !activeLiveReactionPostIds\.current\.has\(postId\)\)/);
  assert.match(app, /onVisiblePostIdsChange=\{setVisibleFeedPostIds\}/);
  assert.match(feed, /entry\.isIntersecting && entry\.intersectionRatio >= 0\.2/);
  assert.match(feed, /data-post-id=\{card\.id\}/);
});

test('unseen and live reactions are emphasized only when actually visible', () => {
  assert.match(app, /if \(!brandSplashComplete \|\| !authReady \|\| !feedHydrated \|\| !authUser \|\| activeTab !== 'feed'\)/);
  assert.match(app, /emphasis: reaction\.emphasis/);
  assert.match(app, /emphasis: 'new', deduplicateRealtime: true/);
  assert.match(app, /activeLiveReactionPostIds\.current\.has\(reaction\.postId\)\) markLiveReactionSeen/);
  assert.match(feed, /live-reaction--new/);
  assert.match(css, /translate3d\(-1px,-132px,0\)/);
  assert.match(css, /prefers-reduced-motion: reduce[\s\S]*live-reaction-reduced/);
});

test('a balloon stays decorative and does not unlock aggregate results before evaluation', () => {
  assert.match(feed, /hasVoted \|\| isOwnPost \?/);
  assert.doesNotMatch(feed, /hasVoted \|\| isOwnPost \|\| liveReactions\.length/);
  assert.match(feed, /liveReactions\.length > 0 && <LiveReactionBalloons reactions=/);
  assert.match(feed, /className="live-reaction-layer" aria-hidden="true"/);
});
