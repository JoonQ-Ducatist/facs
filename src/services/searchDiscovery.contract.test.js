import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

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
});
