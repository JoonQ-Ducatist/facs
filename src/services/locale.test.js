import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { localeUrl, rememberAuthLocale, resolveLocale } from './locale.js';

const browser = (hostname, languages = []) => ({
  location: { hostname },
  navigator: { languages, language: languages[0] },
});

test('local development keeps Korean as the default regardless of browser language', () => {
  assert.equal(resolveLocale('', browser('localhost', ['en-US'])), 'ko');
});

test('explicit supported locale takes priority over browser preference', () => {
  assert.equal(resolveLocale('?locale=en', browser('example.com', ['ko-KR'])), 'en');
  assert.equal(resolveLocale('?locale=ko', browser('example.com', ['en-US'])), 'ko');
});

test('supported browser language is the fallback when no country or URL preference exists', () => {
  assert.equal(resolveLocale('', browser('facs.example', ['en-GB', 'ko-KR'])), 'en');
  assert.equal(resolveLocale('', browser('facs.example', ['fr-FR'])), 'ko');
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

test('Vercel defaults every known non-Korean country to English without overriding explicit choice', async () => {
  const config = JSON.parse(await readFile(new URL('../../vercel.json', import.meta.url), 'utf8'));
  const english = config.redirects.find((redirect) => redirect.destination === '/?locale=en');
  const korean = config.redirects.find((redirect) => redirect.destination === '/?locale=ko');

  assert.deepEqual(english.has, [{
    type: 'header',
    key: 'x-vercel-ip-country',
    value: { neq: 'KR' },
  }]);
  assert.deepEqual(english.missing, [{ type: 'query', key: 'locale' }]);
  assert.equal(english.source, '/');
  assert.equal(english.statusCode, 307);
  assert.equal(Object.hasOwn(english, 'preserveQueryParams'), false);
  assert.equal(Object.hasOwn(korean, 'preserveQueryParams'), false);
  assert.deepEqual(korean.has, [{ type: 'header', key: 'x-vercel-ip-country', value: 'KR' }]);
  assert.deepEqual(korean.missing, [{ type: 'query', key: 'locale' }]);
});

test('language URL retains the current route and unrelated query values', () => {
  assert.equal(localeUrl('en', 'https://example.com/feed?post=card-1'), '/feed?post=card-1&locale=en');
  assert.equal(localeUrl('ko', 'https://example.com/feed?post=card-1&locale=en'), '/feed?post=card-1&locale=ko');
});
