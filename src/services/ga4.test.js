import test from 'node:test';
import assert from 'node:assert/strict';
import { initializeGa4, trackGa4Event } from './ga4.js';

test('GA4 does not load without a valid measurement id', () => {
  const documentRef = { head: { append() {} }, querySelector: () => null, createElement: () => ({ dataset: {} }) };
  const windowRef = { document: documentRef };
  assert.equal(initializeGa4({ environment: {}, documentRef, windowRef }), false);
});

test('GA4 emits only allowed event names after its configuration gate', () => {
  const scripts = [];
  const documentRef = { head: { append: (script) => scripts.push(script) }, querySelector: () => null, createElement: () => ({ dataset: {} }) };
  const calls = [];
  const windowRef = { document: documentRef, location: { origin: 'https://www.factsmack.com' }, dataLayer: [], gtag: (...args) => calls.push(args) };
  assert.equal(trackGa4Event('upload_completed', { environment: { VITE_GA_MEASUREMENT_ID: 'G-TEST123' }, windowRef }), true);
  assert.equal(trackGa4Event('email_entered', { environment: { VITE_GA_MEASUREMENT_ID: 'G-TEST123' }, windowRef }), false);
  assert.equal(scripts.length, 1);
  assert.deepEqual(calls.at(-1), ['event', 'upload_completed']);
  assert.deepEqual(calls.find(([name]) => name === 'config'), ['config', 'G-TEST123', { anonymize_ip: true, allow_google_signals: false, allow_ad_personalization_signals: false, send_page_view: true, page_location: 'https://www.factsmack.com/' }]);
});
