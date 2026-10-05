import test from 'node:test';
import assert from 'node:assert/strict';
import { applySeoMetadata } from './seo.js';

function installDocumentMock() {
  const nodes = new Map();
  const makeNode = () => {
    const attributes = new Map();
    return {
      setAttribute: (name, value) => attributes.set(name, value),
      getAttribute: (name) => attributes.get(name),
    };
  };
  const previousDocument = globalThis.document;
  const previousWindow = globalThis.window;
  globalThis.document = {
    title: '',
    documentElement: {},
    head: {
      querySelector(selector) {
        if (!nodes.has(selector)) nodes.set(selector, makeNode());
        return nodes.get(selector);
      },
      append() {},
    },
    createElement: makeNode,
  };
  globalThis.window = { location: { origin: 'https://www.factsmack.com' } };
  return () => {
    globalThis.document = previousDocument;
    globalThis.window = previousWindow;
  };
}

test('browser tab title stays concise while localized share titles remain descriptive', () => {
  const restore = installDocumentMock();
  try {
    applySeoMetadata('ko');
    assert.equal(document.title, 'FACt.Smack');
    assert.equal(document.head.querySelector('meta[property="og:title"]').getAttribute('content'), 'FACt.Smack | 사람들의 평가를 데이터로');

    applySeoMetadata('en');
    assert.equal(document.title, 'FACt.Smack');
    assert.equal(document.head.querySelector('meta[property="og:title"]').getAttribute('content'), 'FACt.Smack | Feedback, made visible');
  } finally {
    restore();
  }
});
