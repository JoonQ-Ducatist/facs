import test from 'node:test';
import assert from 'node:assert/strict';
import { hasAnalyticsConsent, initializeGa4, setAnalyticsConsent, trackGa4Event } from './ga4.js';

function memoryStorage() {
  const values = new Map();
  return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
}

test('GA4 does not load without explicit consent or a valid measurement id', () => {
  const storage = memoryStorage();
  const documentRef = { head: { append() {} }, querySelector: () => null, createElement: () => ({ dataset: {} }) };
  const windowRef = { localStorage: storage, document: documentRef };
  assert.equal(initializeGa4({ environment: { VITE_GA_MEASUREMENT_ID: 'G-TEST123' }, documentRef, windowRef }), false);
  setAnalyticsConsent(true, storage);
  assert.equal(hasAnalyticsConsent(storage), true);
  assert.equal(initializeGa4({ environment: {}, documentRef, windowRef }), false);
});

test('GA4 emits only allowed event names after its consent gate', () => {
  const storage = memoryStorage();
  setAnalyticsConsent(true, storage);
  const scripts = [];
  const documentRef = { head: { append: (script) => scripts.push(script) }, querySelector: () => null, createElement: () => ({ dataset: {} }) };
  const calls = [];
  const windowRef = { localStorage: storage, document: documentRef, dataLayer: [], gtag: (...args) => calls.push(args) };
  assert.equal(trackGa4Event('upload_completed', { environment: { VITE_GA_MEASUREMENT_ID: 'G-TEST123' }, windowRef }), true);
  assert.equal(trackGa4Event('email_entered', { environment: { VITE_GA_MEASUREMENT_ID: 'G-TEST123' }, windowRef }), false);
  assert.equal(scripts.length, 1);
  assert.deepEqual(calls.at(-1), ['event', 'upload_completed']);
});
