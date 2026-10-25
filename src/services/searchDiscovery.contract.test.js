import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { localizeSeoHtml } from '../../scripts/localize-seo-html.mjs';
import { DISCOVERY_CONTENT } from './discoveryContent.js';

test('public discovery metadata identifies the service without presenting subjective ratings as reviews', async () => {
  const html = await readFile(new URL('../../index.html', import.meta.url), 'utf8');
  const sitemap = await readFile(new URL('../../public/sitemap.xml', import.meta.url), 'utf8');

  assert.match(html, /"@type": "Organization"[\s\S]*?"legalName": "Tweety and Company"/);
  assert.match(html, /"@type": "WebSite"[\s\S]*?"publisher": \{ "@id": "https:\/\/www\.factsmack\.com\/#organization" \}/);
  assert.match(html, /"@type": "WebApplication"[\s\S]*?"applicationCategory": "SocialNetworkingApplication"/);
  assert.match(html, /<html lang="en">/);
  assert.match(html, /rel="alternate" hreflang="en" href="https:\/\/www\.factsmack\.com\/"/);
  assert.match(html, /rel="alternate" hreflang="ko" href="https:\/\/www\.factsmack\.com\/ko\/"/);
  assert.match(html, /rel="alternate" hreflang="x-default" href="https:\/\/www\.factsmack\.com\/"/);
  assert.doesNotMatch(html, /AggregateRating|FAQPage/);
  assert.match(sitemap, /<loc>https:\/\/www\.factsmack\.com\/<\/loc>/);
  assert.match(sitemap, /<loc>https:\/\/www\.factsmack\.com\/ko\/<\/loc>/);
  assert.equal((sitemap.match(/hreflang="x-default"/g) ?? []).length, 2);
  assert.doesNotMatch(sitemap, /<loc>\/<\/loc>/);
  const robots = await readFile(new URL('../../public/robots.txt', import.meta.url), 'utf8');
  assert.match(robots, /^Sitemap: https:\/\/www\.factsmack\.com\/sitemap\.xml$/m);
  assert.doesNotMatch(robots, /Disallow:\s*\/\s*$/m);
  for (const locale of ['en', 'ko']) {
    const generated = localizeSeoHtml(html, locale);
    const copy = DISCOVERY_CONTENT[locale];
    assert.ok(generated.includes(`<h1>${copy.heading}</h1>`));
    assert.ok(generated.includes(copy.intro));
    assert.ok(generated.includes(copy.faq[0][0]));
    const url = `https://www.factsmack.com/${locale === 'ko' ? 'ko/' : ''}`;
    assert.ok(generated.includes(`<link rel="canonical" href="${url}"`));
    assert.ok(generated.includes(`<html lang="${locale}">`));
    assert.equal((generated.match(/rel="canonical"/g) ?? []).length, 1);
    assert.match(generated, /href="\/ko\/" hreflang="ko"/);
    const schema = JSON.parse(generated.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
    const page = schema['@graph'].find(node => node['@type'] === 'WebPage');
    assert.equal(page.inLanguage, locale);
    assert.equal(page.url, url);
    assert.equal(page.name, copy.title);
    assert.doesNotMatch(generated, /AggregateRating|FAQPage/);
    assert.match(generated, /FFeOqEb78CLf0j4l8dONLwHoHOxFaBgeOQPjZpLSDgQ/);
    assert.match(generated, /jdE7kyHtzGBfSWYDloQTJdbsNvKqMx7H8tFhTTLqKM0/);
  }
  assert.throws(() => localizeSeoHtml(html.replace('<!-- public-discovery:start -->', ''), 'ko'), /Missing SEO template/);
  const authView = await readFile(new URL('../features/auth/AuthEntryView.jsx', import.meta.url), 'utf8');
  assert.match(authView, /discovery\.faq\.map/);
  assert.match(authView, /discovery\.intro/);
});
