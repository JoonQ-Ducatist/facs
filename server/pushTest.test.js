import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {sendOwnPushTest} from './pushTest.js';
import {POST} from '../api/growth.js';
const subscription={endpoint:'https://fcm.googleapis.com/test-own-device',keys:{p256dh:'a'.repeat(88),auth:'b'.repeat(24)}};
const env={VAPID_PUBLIC_KEY:'public-test',VAPID_PRIVATE_KEY:'private-test'};
function fixture({role='admin',missing=false,duplicate=false}={}) {
 const calls=[],sent=[];
 function table(name){const filters=[];return {select(){return this;},eq(k,v){filters.push([k,v]);return this;},async single(){return {data:{role}};},async maybeSingle(){calls.push({table:name,filters});return {data:missing?null:{subscription}};},async insert(row){calls.push({table:name,row});return {error:duplicate?{code:'23505'}:null};}};}
 return {ctx:{user:{id:'operator'},member:{from:table},service:{from:table}},calls,sent,dispatch:async(sub,payload,options)=>sent.push({sub,payload:JSON.parse(payload),options}),configure(){}};
}
test('anonymous and non-admin cannot invoke a push test',async()=>{
 const response=await POST(new Request('https://www.factsmack.com/api/growth',{method:'POST',headers:{origin:'https://www.factsmack.com'},body:JSON.stringify({action:'test-push'})}));assert.equal(response.status,401);
 const f=fixture({role:'member'});await assert.rejects(()=>sendOwnPushTest({...f,endpoint:subscription.endpoint,env}),/FORBIDDEN/);assert.equal(f.sent.length,0);assert.equal(f.calls.length,0);
});
test('a missing or other-account device cannot receive the diagnostic',async()=>{
 const f=fixture({missing:true});await assert.rejects(()=>sendOwnPushTest({...f,endpoint:subscription.endpoint,env}),/INPUT/);assert.equal(f.sent.length,0);assert.deepEqual(f.calls[0].filters[0],['member_id','operator']);assert.equal(f.calls[0].table,'push_subscriptions');
});
test('one clearly labeled own-device test does not create posts votes or first-rating notices',async()=>{
 const f=fixture();const response=await sendOwnPushTest({...f,endpoint:subscription.endpoint,locale:'ko',env,now:Date.parse('2026-11-01T17:00:00Z')});assert.equal(response.status,202);assert.equal(f.sent.length,1);assert.deepEqual(f.calls.map(c=>c.table),['push_subscriptions','growth_request_budgets']);assert.equal(f.calls[1].row.day,'2026-11-02');assert.equal(f.calls[1].row.scope,'push-test:operator');assert.equal(f.sent[0].payload.type,'notification-test');assert.match(f.sent[0].payload.body,/실제 평가가 아닙니다/);assert.equal(new URL(f.sent[0].payload.url).search,'?notification_test=1');assert.equal(f.sent[0].options.TTL,300);
});
test('an atomic daily budget rejects a repeat without sending',async()=>{
 const f=fixture({duplicate:true});const response=await sendOwnPushTest({...f,endpoint:subscription.endpoint,env});assert.equal(response.status,429);assert.equal(f.sent.length,0);
});
test('service worker preserves rating destinations and distinguishes same-origin tests',()=>{
 const self={location:{origin:'https://www.factsmack.com'}};vm.runInNewContext(readFileSync(new URL('../public/push-message.js',import.meta.url),'utf8'),{self,URL});const parse=self.facsPushMessage;
 assert.equal(parse({body:'real',url:'/?post=00000000-0000-4000-8000-000000000001'}).test,false);
 assert.equal(parse({body:'test',type:'notification-test',url:'/?notification_test=1'}).test,true);
 assert.equal(parse({body:'not a test',url:'/?notification_test=1'}),null);assert.equal(parse({body:'test',type:'notification-test',url:'https://example.com/?notification_test=1'}),null);
 assert.equal(parse({body:'test',type:'notification-test',url:'/?notification_test=1&post=other'}),null);
});
