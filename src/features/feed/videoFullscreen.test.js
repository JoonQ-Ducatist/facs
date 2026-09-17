import test from 'node:test';
import assert from 'node:assert/strict';
import { enterNativeVideoFullscreen } from './videoFullscreen.js';

function webkitVideo({ paused, currentTime = 0, readyState = 4, enter }) {
  const events = [];
  const listeners = new Map();
  const video = {
    paused,
    currentTime,
    readyState,
    webkitDisplayingFullscreen: false,
    load() { events.push('load'); this.readyState = 1; },
    play() { events.push('play'); this.paused = false; return Promise.resolve(); },
    pause() { events.push('pause'); this.paused = true; },
    webkitEnterFullscreen() { events.push('enter'); enter?.(this, events, listeners); },
    addEventListener(name, listener) { listeners.set(name, listener); },
    removeEventListener(name, listener) { if (listeners.get(name) === listener) listeners.delete(name); },
  };
  return { video, events, listeners };
}

const flushPromises = () => new Promise((resolve) => setImmediate(resolve));

test('unplayed WebKit video prepares playback in the click path and retries after readiness', async () => {
  let attempts = 0;
  const scheduled = [];
  const { video, events } = webkitVideo({
    paused: true,
    readyState: 0,
    enter(target) {
      attempts += 1;
      if (attempts === 2) target.webkitDisplayingFullscreen = true;
    },
  });

  const result = enterNativeVideoFullscreen(video, { schedule: (callback) => scheduled.push(callback) });
  assert.deepEqual(result, { mode: 'webkit', preparedPlayback: true });
  assert.deepEqual(events, ['load', 'play', 'enter']);
  await flushPromises();
  assert.deepEqual(events, ['load', 'play', 'enter', 'enter']);
  scheduled.forEach((callback) => callback());
  assert.equal(events.includes('pause'), false);
});

test('already playing WebKit video enters directly without restarting playback', () => {
  const scheduled = [];
  const { video, events } = webkitVideo({ paused: false, currentTime: 3, enter: (target) => { target.webkitDisplayingFullscreen = true; } });
  const result = enterNativeVideoFullscreen(video, { schedule: (callback) => scheduled.push(callback) });
  assert.deepEqual(result, { mode: 'webkit', preparedPlayback: false });
  assert.deepEqual(events, ['enter']);
  scheduled.forEach((callback) => callback());
  assert.deepEqual(events, ['enter']);
});

test('paused-after-play WebKit video resumes in the gesture before entering fullscreen', async () => {
  const scheduled = [];
  const { video, events } = webkitVideo({ paused: true, currentTime: 4.25, enter: (target) => { target.webkitDisplayingFullscreen = true; } });
  const result = enterNativeVideoFullscreen(video, { schedule: (callback) => scheduled.push(callback) });
  assert.deepEqual(result, { mode: 'webkit', preparedPlayback: true });
  assert.deepEqual(events, ['play', 'enter']);
  await flushPromises();
  scheduled.forEach((callback) => callback());
  assert.deepEqual(events, ['play', 'enter']);
  assert.equal(video.currentTime, 4.25);
});

test('failed WebKit entry restores the paused poster/play state and time', async () => {
  const scheduled = [];
  const { video, events } = webkitVideo({ paused: true, currentTime: 0, enter: () => { throw new Error('not ready'); } });
  enterNativeVideoFullscreen(video, { schedule: (callback) => scheduled.push(callback) });
  await flushPromises();
  scheduled.forEach((callback) => callback());
  assert.deepEqual(events, ['play', 'enter', 'enter', 'pause']);
  assert.equal(video.currentTime, 0);
  assert.equal(video.paused, true);
});

test('standards fullscreen does not change native playback state', () => {
  const events = [];
  const video = { paused: true, requestFullscreen() { events.push('fullscreen'); return Promise.resolve(); } };
  const result = enterNativeVideoFullscreen(video, { schedule: () => {} });
  assert.deepEqual(result, { mode: 'standard', preparedPlayback: false });
  assert.deepEqual(events, ['fullscreen']);
});
