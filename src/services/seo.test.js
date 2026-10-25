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

test('search and share metadata stay descriptive and language-specific', () => {
  const restore = installDocumentMock();
  try {
    applySeoMetadata('ko');
    assert.equal(document.title, 'FACt.Smack | 사진·코디·프로필 피드백');
    assert.equal(document.head.querySelector('meta[property="og:title"]').getAttribute('content'), 'FACt.Smack | 사진·코디·프로필 피드백');
    assert.equal(document.head.querySelector('meta[property="og:locale"]').getAttribute('content'), 'ko_KR');
    assert.equal(document.head.querySelector('meta[property="og:locale:alternate"]').getAttribute('content'), 'en_US');
    assert.equal(document.head.querySelector('link[rel="canonical"]').getAttribute('href'), 'https://www.factsmack.com/ko/');
    assert.equal(document.head.querySelector('link[rel="alternate"][hreflang="en"]').getAttribute('href'), 'https://www.factsmack.com/');
    assert.equal(document.head.querySelector('link[rel="alternate"][hreflang="ko"]').getAttribute('href'), 'https://www.factsmack.com/ko/');

    applySeoMetadata('en');
    assert.equal(document.title, 'FACt.Smack | Photo & Outfit Feedback');
    assert.equal(document.head.querySelector('meta[property="og:title"]').getAttribute('content'), 'FACt.Smack | Photo & Outfit Feedback');
    assert.equal(document.head.querySelector('meta[property="og:locale"]').getAttribute('content'), 'en_US');
    assert.equal(document.head.querySelector('meta[property="og:locale:alternate"]').getAttribute('content'), 'ko_KR');
    assert.equal(document.head.querySelector('link[rel="canonical"]').getAttribute('href'), 'https://www.factsmack.com/');
  } finally {
    restore();
  }
});
