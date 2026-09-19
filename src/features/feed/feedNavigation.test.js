import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveTouchFeedDirection, resolveWheelFeedDirection } from './feedNavigation.js';

test('portrait feed changes on the first deliberate vertical swipe', () => {
  assert.equal(resolveTouchFeedDirection({ startX: 100, startY: 300, endX: 105, endY: 210, maxScrollTop: 0 }), 1);
  assert.equal(resolveTouchFeedDirection({ startX: 100, startY: 210, endX: 96, endY: 300, maxScrollTop: 0 }), -1);
});

test('short taps and horizontal carousel swipes never change the feed', () => {
  assert.equal(resolveTouchFeedDirection({ startX: 100, startY: 300, endX: 104, endY: 270, maxScrollTop: 0 }), 0);
  assert.equal(resolveTouchFeedDirection({ startX: 100, startY: 300, endX: 220, endY: 260, maxScrollTop: 0 }), 0);
});

test('landscape feed preserves native card scrolling away from a boundary', () => {
  assert.equal(resolveTouchFeedDirection({ startX: 100, startY: 300, endX: 100, endY: 200, scrollTop: 0, maxScrollTop: 500 }), 0);
  assert.equal(resolveTouchFeedDirection({ startX: 100, startY: 300, endX: 100, endY: 200, scrollTop: 250, maxScrollTop: 500 }), 0);
  assert.equal(resolveTouchFeedDirection({ startX: 100, startY: 200, endX: 100, endY: 300, scrollTop: 250, maxScrollTop: 500 }), 0);
});

test('landscape feed changes only from the matching scroll boundary', () => {
  assert.equal(resolveTouchFeedDirection({ startX: 100, startY: 300, endX: 100, endY: 200, scrollTop: 500, maxScrollTop: 500 }), 1);
  assert.equal(resolveTouchFeedDirection({ startX: 100, startY: 200, endX: 100, endY: 300, scrollTop: 0, maxScrollTop: 500 }), -1);
});

test('desktop wheel follows the same card-first boundary contract', () => {
  assert.equal(resolveWheelFeedDirection({ deltaY: 80, scrollTop: 0, scrollHeight: 900, clientHeight: 400 }), 0);
  assert.equal(resolveWheelFeedDirection({ deltaY: 80, scrollTop: 500, scrollHeight: 900, clientHeight: 400 }), 1);
  assert.equal(resolveWheelFeedDirection({ deltaY: -80, scrollTop: 0, scrollHeight: 900, clientHeight: 400 }), -1);
  assert.equal(resolveWheelFeedDirection({ deltaY: -80, scrollTop: 250, scrollHeight: 900, clientHeight: 400 }), 0);
});
