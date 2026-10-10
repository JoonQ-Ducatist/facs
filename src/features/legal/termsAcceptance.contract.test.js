import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { acceptCurrentTerms, CURRENT_TERMS_VERSION } from '../../services/termsAcceptance.js';

const app = await readFile(new URL('../../App.jsx', import.meta.url), 'utf8');
const gate = await readFile(new URL('./TermsAcceptanceGate.jsx', import.meta.url), 'utf8');
const service = await readFile(new URL('../../services/termsAcceptance.js', import.meta.url), 'utf8');
const migration = await readFile(new URL('../../../supabase/migrations/202610090001_member_terms_acceptances.sql', import.meta.url), 'utf8');
const fixMigration = await readFile(new URL('../../../supabase/migrations/202610090002_fix_terms_acceptance_conflict.sql', import.meta.url), 'utf8');

test('members see only a one-time gate for the current terms version', () => {
  assert.match(service, /CURRENT_TERMS_VERSION = 'terms-20261009-v1'/);
  assert.match(app, /if \(!acceptance\.accepted\) \{\s*acceptedTermsUserId\.current = null;\s*setTermsGate\(\{ user: session\.user, status: 'required' \}\)/);
  assert.doesNotMatch(app, /if \(!localQaEnabled\)/);
  assert.match(app, /if \(session\) \{\s*setTermsGate\(\{ user: session\.user, status: 'checking' \}\)/);
  assert.match(migration, /primary key \(member_id, terms_version\)/);
  assert.match(migration, /on conflict on constraint member_terms_acceptances_pkey do nothing/);
  assert.match(fixMigration, /create or replace function public\.accept_current_terms/);
  assert.match(fixMigration, /on conflict on constraint member_terms_acceptances_pkey do nothing/);
  assert.match(gate, /I have read and agree to the Terms of Service/);
  assert.match(gate, /Please review before continuing/);
  assert.match(gate, /Agree and continue/);
  assert.match(gate, /Read Privacy Notice/);
});

test('acceptance RPC derives member identity from the authenticated session', () => {
  assert.match(migration, /current_user_id uuid := auth\.uid\(\)/);
  assert.match(migration, /values \(current_user_id, 'terms-20261009-v1', input_locale\)/);
  assert.match(migration, /using \(member_id = auth\.uid\(\)\)/);
  assert.doesNotMatch(migration, /input_member_id|input_user_id/);
});

test('privacy notice remains separate and auth callbacks are cleaned after agreement', () => {
  assert.match(gate, /Read Privacy Notice/);
  assert.match(gate, /onOpenPolicy\?\.\('privacy'\)/);
  assert.match(app, /const callbackReturnUrl = getCompletedAuthReturnUrl\(window\.location\)/);
  assert.match(app, /window\.location\.replace\(callbackReturnUrl\)/);
  assert.match(app, /if \(termsGate\) return <CanvasStage screenKey="terms-acceptance">/);
});

test('a lost or empty save response is confirmed from the durable acceptance record', async () => {
  const record = { terms_version: CURRENT_TERMS_VERSION, locale: 'ko', accepted_at: '2026-10-09T00:00:00Z' };
  let calls = 0;
  const result = await acceptCurrentTerms('ko', {
    rpc: async (name) => {
      calls += 1;
      if (name === 'accept_current_terms') return { data: null, error: { code: 'NETWORK_ERROR' } };
      return { data: [record], error: null };
    },
  });
  assert.equal(result.ok, true);
  assert.equal(result.record.terms_version, CURRENT_TERMS_VERSION);
  assert.equal(calls, 2);
});
