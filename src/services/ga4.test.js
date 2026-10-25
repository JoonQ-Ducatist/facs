import test from 'node:test';
import assert from 'node:assert/strict';
import { initializeGa4, trackGa4Event } from './ga4.js';

test('GA4 rejects missing IDs and non-production origins before loading', () => {
  const documentRef = { head: { append() {} }, querySelector: () => null, createElement: () => ({ dataset: {} }) };
  const windowRef = { document: documentRef };
  assert.equal(initializeGa4({ environment: {}, documentRef, windowRef }), false);
  for (const origin of ['http://localhost:4173', 'https://product-test-abc-joonq-ducatist.vercel.app', 'https://factsmack.com.attacker.invalid', 'http://www.factsmack.com']) {
    windowRef.location = { origin };
    assert.equal(initializeGa4({ environment: { VITE_GA_MEASUREMENT_ID: 'G-TEST123' }, documentRef, windowRef }), false);
  }
});

test('GA4 emits only allowed event names after its configuration gate', () => {
  const scripts = [];
  const documentRef = { referrer: 'https://accounts.google.com/o/oauth?email=private@example.test#token', head: { append: (script) => scripts.push(script) }, querySelector: () => scripts[0] ?? null, createElement: () => ({ dataset: {} }) };
  const calls = [];
  const windowRef = { document: documentRef, location: { origin: 'https://www.factsmack.com', pathname: '/auth/callback', search: '?code=secret', hash: '#access_token=secret' }, dataLayer: [], gtag: (...args) => calls.push(args) };
  assert.equal(trackGa4Event('upload_completed', { environment: { VITE_GA_MEASUREMENT_ID: 'G-TEST123' }, windowRef }), true);
  assert.equal(trackGa4Event('email_entered', { environment: { VITE_GA_MEASUREMENT_ID: 'G-TEST123' }, windowRef }), false);
  assert.equal(scripts.length, 1);
  assert.deepEqual(calls.at(-1), ['event', 'upload_completed']);
  assert.equal(trackGa4Event('first_vote', { environment: { VITE_GA_MEASUREMENT_ID: 'G-TEST123' }, windowRef }), true);
  assert.deepEqual(calls.slice(-2), [['event', 'first_vote'], ['event', 'vote_completed']]);
  assert.equal(calls.filter(([name]) => name === 'config').length, 1);
  assert.deepEqual(calls.find(([name]) => name === 'config'), ['config', 'G-TEST123', { anonymize_ip: true, allow_google_signals: false, allow_ad_personalization_signals: false, send_page_view: true, page_location: 'https://www.factsmack.com/', page_title: 'FACt.Smack', page_referrer: '', ignore_referrer: true }]);
  assert.doesNotMatch(JSON.stringify(calls), /private@example|access_token|code=secret/);
});

test('GA4 preserves safe external referral origins and failures never escape to app actions', () => {
  const calls = [];
  const documentRef = { referrer: 'https://www.google.com/search?q=private', head: { append() {} }, querySelector: () => null, createElement: () => ({ dataset: {} }) };
  const windowRef = { document: documentRef, location: { origin: 'https://www.factsmack.com' }, gtag: (...args) => calls.push(args) };
  const environment = { VITE_GA_MEASUREMENT_ID: 'G-TEST123' };
  assert.equal(trackGa4Event('result_viewed', { environment, windowRef }), true);
  const config = calls.find(([name]) => name === 'config')[2];
  assert.equal(config.page_referrer, 'https://www.google.com/');
  assert.equal(config.ignore_referrer, undefined);
  documentRef.head.append = () => { throw new Error('blocked tag'); };
  assert.equal(trackGa4Event('result_viewed', { environment, windowRef }), false);
  documentRef.querySelector = () => ({});
  windowRef.gtag = () => { throw new Error('event blocked'); };
  assert.equal(trackGa4Event('upload_completed', { environment, windowRef }), false);
});
