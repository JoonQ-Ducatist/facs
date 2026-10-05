import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveFeedDragPosition, resolveFeedGestureAxis } from './feedScroll.js';

test('feed touch axis ignores taps and keeps horizontal media swipes distinct', () => {
  assert.equal(resolveFeedGestureAxis(2, 3), null);
  assert.equal(resolveFeedGestureAxis(30, 12), 'x');
  assert.equal(resolveFeedGestureAxis(12, -30), 'y');
});

test('feed drag follows the finger exactly and stops at release position', () => {
  assert.equal(resolveFeedDragPosition(120, -85, 900), 205);
});

test('feed drag clamps at both boundaries without visual resistance', () => {
  assert.equal(resolveFeedDragPosition(0, 50, 900), 0);
  assert.equal(resolveFeedDragPosition(900, -50, 900), 900);
  assert.equal(resolveFeedDragPosition(0, 300, 900), 0);
  assert.equal(resolveFeedDragPosition(900, -300, 900), 900);
});
