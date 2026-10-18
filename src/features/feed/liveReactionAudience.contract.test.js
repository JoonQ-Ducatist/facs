import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const app = await readFile(new URL('../../App.jsx', import.meta.url), 'utf8');
const feed = await readFile(new URL('./FeedView.jsx', import.meta.url), 'utf8');

test('every loaded recent server card is eligible for live reaction delivery', () => {
  assert.match(app, /cards\.filter\(\(card\) => visibleFeedPostIds\.has\(card\.id\) && isSupabasePost\(card\) && isLiveReactionWindow\(card\.publishedAt\)\)/);
  assert.doesNotMatch(app, /card\.authorId === authUser\.id \|\| votedIds\.has\(card\.id\)/);
});

test('offscreen cards are not subscribed or marked seen until they enter the viewport', () => {
  assert.match(app, /onVisiblePostIdsChange=\{setVisibleFeedPostIds\}/);
  assert.match(feed, /new IntersectionObserver\(\(entries\) =>/);
  assert.match(feed, /entry\.isIntersecting && entry\.intersectionRatio >= 0\.2/);
  assert.match(feed, /data-post-id=\{card\.id\}/);
});

test('reaction replay waits for the feed and resets in-memory IDs after account changes', () => {
  assert.match(app, /if \(!brandSplashComplete \|\| !authReady \|\| !feedHydrated \|\| !authUser \|\| activeTab !== 'feed'\) return undefined/);
  assert.match(app, /receivedLiveReactionIds\.current\.clear\(\);\s*setLiveReactions\(\[\]\);\s*}, \[authUser\?\.id\]\)/);
});

test('a balloon does not unlock aggregate results before evaluation', () => {
  assert.match(feed, /hasVoted \|\| isOwnPost \?/);
  assert.doesNotMatch(feed, /hasVoted \|\| isOwnPost \|\| liveReactions\.length/);
  assert.match(feed, /liveReactions\.length > 0 && <LiveReactionBalloons reactions=\{liveReactions\}/);
});
