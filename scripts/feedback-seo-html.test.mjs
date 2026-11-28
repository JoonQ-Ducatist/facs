import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {feedbackSeoHtml} from './feedback-seo-html.mjs';
const source=await readFile(new URL('../index.html',import.meta.url),'utf8');
test('static invite metadata explains action and preserves brand-only image',()=>{
 const out=feedbackSeoHtml(source);assert.match(out,/<meta property="og:title" content="FACt.Smack \| Photo feedback invitation"/);assert.match(out,/<meta property="og:description" content="Invited to a photo\?/);assert.match(out,/<meta property="og:image" content="https:\/\/www.factsmack.com\/icon-512.png"/);assert.match(out,/without an account/);
});
test('invitation canonical is token-free and crawler restrictions remain',()=>{const out=feedbackSeoHtml(source);assert.match(out,/<meta name="robots" content="noindex, nofollow"/);assert.match(out,/<meta name="referrer" content="no-referrer"/);assert.match(out,/<link rel="canonical" href="https:\/\/www.factsmack.com\/feedback"/);assert.doesNotMatch(out,/<link[^>]*hreflang=/);assert.match(out,/<meta property="og:url" content="https:\/\/www.factsmack.com\/feedback"/);});
test('built app entry survives static metadata generation and route has matching protection',async()=>{
 const built=source.replace('<script type="module" src="/src/main.jsx"></script>','<script type="module" src="/assets/main-test.js"></script>');const out=feedbackSeoHtml(built);for(const script of built.match(/<script[^>]*src=[^>]*>/g)||[])assert.ok(out.includes(script));const config=JSON.parse(await readFile(new URL('../vercel.json',import.meta.url),'utf8'));assert.deepEqual(config.rewrites[0],{source:'/feedback',destination:'/feedback.html'});assert.ok(config.headers.find(h=>h.source==='/feedback').headers.some(h=>h.value==='noindex, nofollow'));assert.ok(config.headers.find(h=>h.source==='/feedback.html').headers.some(h=>h.value==='noindex, nofollow'));
});

test('guest voting requires age confirmation and sends only the choice', async () => {
  const guest = await readFile(new URL('../src/features/feedback/GuestFeedback.jsx', import.meta.url), 'utf8');
  assert.ok(guest.indexOf('checked={age}') < guest.indexOf('onClick={() => vote(choice)}'));
  assert.match(guest, /disabled={busy \|\| !age}/);
  assert.match(guest, /externalRequest\(token, 'vote', { choice, ageConfirmed: age }\)/);
  assert.doesNotMatch(guest, /<fieldset>|noteOptions|shareInvitation|entryUrl\('(?:upload|tests)'/);
  assert.match(guest, /href={entryUrl\('rate', locale\)}/);
  assert.match(guest, /onClick={report}/);
});
