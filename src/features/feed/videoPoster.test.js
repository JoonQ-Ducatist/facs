import test from 'node:test';
import assert from 'node:assert/strict';
import { captureVideoPoster } from './videoPoster.js';

test('poster reuses decoded visible media without loading, seeking or changing its source', () => {
  const video = Object.freeze({ readyState: 4, videoWidth: 1920, videoHeight: 1080, currentTime: 3, src: 'protected-original', paused: false });
  let drawn;
  const canvas = { getContext: () => ({ drawImage: (...args) => { drawn = args; } }), toDataURL: () => 'data:image/jpeg;base64,poster' };
  assert.equal(captureVideoPoster(video, () => canvas), 'data:image/jpeg;base64,poster');
  assert.equal(canvas.width, 640);
  assert.equal(canvas.height, 360);
  assert.deepEqual(drawn, [video, 0, 0, 640, 360]);
  assert.equal(video.src, 'protected-original');
  assert.equal(video.currentTime, 3);
  assert.equal(video.paused, false);
});

test('unloaded media never allocates a canvas or starts another media load', () => {
  const noCanvas = () => { throw new Error('must not allocate'); };
  assert.equal(captureVideoPoster(null, noCanvas), '');
  assert.equal(captureVideoPoster({ readyState: 1, videoWidth: 160, videoHeight: 120 }, noCanvas), '');
  assert.equal(captureVideoPoster({ readyState: 2, videoWidth: 0, videoHeight: 0 }, noCanvas), '');
});

test('unsupported canvas or CORS capture fails softly without interrupting playback', () => {
  const video = Object.freeze({ readyState: 2, videoWidth: 160, videoHeight: 120, paused: false });
  assert.equal(captureVideoPoster(video, () => ({ getContext: () => null })), '');
  assert.equal(captureVideoPoster(video, () => ({ getContext: () => ({ drawImage: () => { throw new Error('SecurityError'); } }) })), '');
  assert.equal(video.paused, false);
});
