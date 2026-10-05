import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { localeUrl, resolveLocale } from './locale.js';

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

test('Vercel defaults every known non-Korean country to English and preserves explicit choice and campaign query', async () => {
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
  assert.equal(english.preserveQueryParams, true);
  assert.deepEqual(korean.has, [{ type: 'header', key: 'x-vercel-ip-country', value: 'KR' }]);
  assert.deepEqual(korean.missing, [{ type: 'query', key: 'locale' }]);
});

test('language URL retains the current route and unrelated query values', () => {
  assert.equal(localeUrl('en', 'https://example.com/feed?post=card-1'), '/feed?post=card-1&locale=en');
  assert.equal(localeUrl('ko', 'https://example.com/feed?post=card-1&locale=en'), '/feed?post=card-1&locale=ko');
});
