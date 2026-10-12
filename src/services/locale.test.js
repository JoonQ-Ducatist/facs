import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { localeUrl, rememberAuthLocale, resolveLocale } from './locale.js';

const browser = (hostname, languages = []) => ({
  location: { hostname, pathname: '/' },
  navigator: { languages, language: languages[0] },
});

test('English is the stable default in development and production regardless of browser language', () => {
  assert.equal(resolveLocale('', browser('localhost', ['ko-KR'])), 'en');
  assert.equal(resolveLocale('', browser('facs.example', ['ko-KR'])), 'en');
});

test('explicit supported locale takes priority over browser preference', () => {
  assert.equal(resolveLocale('?locale=en', browser('example.com', ['ko-KR'])), 'en');
  assert.equal(resolveLocale('?locale=ko', browser('example.com', ['en-US'])), 'ko');
});

test('the Korean path identifies the Korean language version', () => {
  const koreanPath = browser('facs.example', ['en-US']);
  koreanPath.location.pathname = '/ko/';
  assert.equal(resolveLocale('', koreanPath), 'ko');
});

test('auth callback restores the locale selected before leaving for authentication', () => {
  const values = new Map();
  const callbackBrowser = {
    location: { hostname: 'facs.example', pathname: '/auth/callback' },
    navigator: { languages: ['ko-KR'], language: 'ko-KR' },
    localStorage: {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
      removeItem: (key) => values.delete(key),
    },
  };
  rememberAuthLocale('en', callbackBrowser);
  assert.equal(resolveLocale('', callbackBrowser), 'en');
  assert.equal(values.size, 0);
});

test('Vercel keeps the SPA fallback and does not force geo redirects', async () => {
  const config = JSON.parse(await readFile(new URL('../../vercel.json', import.meta.url), 'utf8'));
  assert.deepEqual(config.redirects ?? [], []);
  assert.deepEqual(config.rewrites, [{ source: '/(.*)', destination: '/index.html' }]);
});

test('language switching uses clean locale paths and preserves unrelated state', () => {
  assert.equal(localeUrl('en', 'https://example.com/ko/?post=card-1&locale=ko#comments'), '/?post=card-1#comments');
  assert.equal(localeUrl('ko', 'https://example.com/?post=card-1&locale=en'), '/ko/?post=card-1');
  assert.equal(localeUrl('ko', 'https://example.com/auth/callback?code=abc'), '/auth/callback?code=abc&locale=ko');
});
