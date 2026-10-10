import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('public discovery metadata identifies the service without presenting subjective ratings as reviews', async () => {
  const html = await readFile(new URL('../../index.html', import.meta.url), 'utf8');
  const sitemap = await readFile(new URL('../../public/sitemap.xml', import.meta.url), 'utf8');

  assert.match(html, /"@type": "Organization"[\s\S]*?"legalName": "Tweety and Company"/);
  assert.match(html, /"@type": "WebSite"[\s\S]*?"publisher": \{ "@id": "https:\/\/www\.factsmack\.com\/#organization" \}/);
  assert.match(html, /"@type": "WebApplication"[\s\S]*?"applicationCategory": "SocialNetworkingApplication"/);
  assert.doesNotMatch(html, /AggregateRating|FAQPage/);
  assert.match(sitemap, /<loc>https:\/\/www\.factsmack\.com\/<\/loc>/);
  assert.doesNotMatch(sitemap, /<loc>\/<\/loc>/);
});
