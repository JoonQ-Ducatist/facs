import test from 'node:test';
import assert from 'node:assert/strict';
import {invitationMessage,shareInvitation} from './entryIntent.js';
const url='https://www.factsmack.com/feedback#'+'a'.repeat(64);
test('request preserves full invite once and explains no signup with age requirement',()=>{
 const s=invitationMessage(url,'en');assert.equal(s.split(url).length,2);assert.match(s,/14 or older/);assert.match(s,/without an account/);assert.match(s,/leave without rating/);assert.match(s,/separately/);assert.match(s,/forward/);
});
test('Korean request keeps recipient choice and does not promise private delivery',()=>{
 const s=invitationMessage(url,'ko');assert.match(s,/만 14세/);assert.match(s,/따로 집계/);assert.match(s,/전달될 수/);assert.ok(s.endsWith(url));
});
test('native share sends accurate message with exact token only in URL field',async()=>{
 let payload;const result=await shareInvitation(url,'en',{share:async p=>{payload=p}});assert.equal(result,'shared');assert.equal(payload.url,url);assert.ok(!payload.text.includes('#'));assert.match(payload.text,/without an account/);
});
test('device cancellation never copies a private invitation automatically',async()=>{
 let copies=0;const result=await shareInvitation(url,'ko',{share:async()=>{const e=new Error();e.name='AbortError';throw e},clipboard:{writeText:async()=>{copies++}}});assert.equal(result,'cancelled');assert.equal(copies,0);
});
