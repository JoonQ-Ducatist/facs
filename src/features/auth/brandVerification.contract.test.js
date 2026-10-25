import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('ownership verification adds the approved account token without removing existing ownership', async () => {
  const html = await readFile(new URL('../../../index.html', import.meta.url), 'utf8');
  assert.match(html, /<head>[\s\S]*name="google-site-verification" content="jdE7kyHtzGBfSWYDloQTJdbsNvKqMx7H8tFhTTLqKM0"[\s\S]*<\/head>/);
  assert.match(html, /name="google-site-verification" content="FFeOqEb78CLf0j4l8dONLwHoHOxFaBgeOQPjZpLSDgQ"/);
});

test('homepage describes the service before JavaScript and exposes on-demand About Us after authentication entry renders', async () => {
  const html = await readFile(new URL('../../../index.html', import.meta.url), 'utf8');
  const jsx = await readFile(new URL('./AuthEntryView.jsx', import.meta.url), 'utf8');
  assert.match(html, /<div id="root">[\s\S]*About FACt\.Smack[\s\S]*subjective YES\/NO or perceived-age feedback[\s\S]*does not generate AI images or videos/);
  const dialog = await readFile(new URL('../legal/LegalPolicyDialog.jsx', import.meta.url), 'utf8');
  const app = await readFile(new URL('../../App.jsx', import.meta.url), 'utf8');
  assert.doesNotMatch(jsx, /service-purpose-title/);
  assert.match(jsx, /href="\/\?policy=about"[\s\S]*?onOpenPolicy\?\.\('about'\)/);
  assert.match(jsx, /'About Us' : '서비스 안내'/);
  assert.match(app, /\['privacy', 'terms', 'safety', 'about'\]\.includes\(policy\)/);
  assert.match(dialog, /Google sign-in authenticates your account using your email and basic profile/);
  assert.match(dialog, /AI 이미지·영상 생성 서비스가 아니며/);
});

test('homepage policy anchors match Google branding URLs while preserving in-app dialogs', async () => {
  const jsx = await readFile(new URL('./AuthEntryView.jsx', import.meta.url), 'utf8');
  for (const policy of ['privacy', 'terms', 'safety']) {
    assert.ok(jsx.includes(`href="/?policy=${policy}" onClick={(event) => { event.preventDefault(); onOpenPolicy?.('${policy}'); }}`));
  }
});
