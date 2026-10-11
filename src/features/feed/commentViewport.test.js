import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { bindCommentViewport, syncCommentViewport } from './commentViewport.js';

function eventTarget() {
  const listeners = new Map();
  return {
    addEventListener(name, listener) { listeners.set(name, listener); },
    removeEventListener(name) { listeners.delete(name); },
    emit(name) { listeners.get(name)?.(); },
    listenerCount() { return listeners.size; },
  };
}

function panel() {
  const target = eventTarget();
  const values = new Map();
  return { ...target, style: { setProperty(name, value) { values.set(name, value); } }, values };
}

test('comment panel tracks the visible viewport while the keyboard shrinks and pans it', () => {
  const element = panel();
  const viewport = { offsetTop: 92, offsetLeft: 0, width: 390, height: 410 };
  syncCommentViewport(element, viewport);
  assert.equal(element.values.get('--comment-viewport-top'), '92px');
  assert.equal(element.values.get('--comment-viewport-height'), '410px');
  assert.equal(element.values.get('--comment-viewport-width'), '390px');
});

test('comment panel follows keyboard opening and closing and releases listeners', () => {
  const element = panel();
  const viewport = Object.assign(eventTarget(), { offsetTop: 0, offsetLeft: 0, width: 390, height: 760 });
  const browser = Object.assign(eventTarget(), { visualViewport: viewport });
  const unbind = bindCommentViewport(element, browser);
  assert.equal(element.values.get('--comment-viewport-height'), '760px');
  viewport.offsetTop = 90;
  viewport.height = 390;
  viewport.emit('resize');
  assert.equal(element.values.get('--comment-viewport-top'), '90px');
  assert.equal(element.values.get('--comment-viewport-height'), '390px');
  viewport.offsetTop = 0;
  viewport.height = 760;
  viewport.emit('scroll');
  assert.equal(element.values.get('--comment-viewport-height'), '760px');
  unbind();
  assert.equal(viewport.listenerCount(), 0);
  assert.equal(browser.listenerCount(), 0);
  assert.equal(element.listenerCount(), 0);
});

test('comment sheet never exceeds the visible viewport when the keyboard is open', async () => {
  const styles = await readFile(new URL('../../styles/global.css', import.meta.url), 'utf8');
  assert.match(styles, /\.comment-panel \{ position: fixed; top: var\(--comment-viewport-top/);
  assert.match(styles, /\.comment-panel__dialog \{[^}]*max-height: var\(--comment-viewport-height, 100dvh\)/);
  assert.match(styles, /min-height: min\(420px, var\(--comment-viewport-height, 100dvh\)\)/);
});
