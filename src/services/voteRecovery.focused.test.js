import test from 'node:test';import assert from 'node:assert/strict';
import {submitSupabaseVote} from './supabaseApi.js';
function fixture({error={message:'network'},receipt={choice:'yes',perceived_age:null},readError=null,changed=false,throws=false}={}){
 const calls=[];let authCalls=0;
 const query={eq(k,v){calls.push(['eq',k,v]);return query;},async maybeSingle(){return{data:receipt,error:readError};}};
 const client={
  auth:{getUser:async()=>({data:{user:{id:changed&&authCalls++?'other':'member-a'}},error:null})},
  from:table=>({async insert(row){calls.push(['insert',table,row]);if(throws)throw Error('offline');return{error};},select(fields){calls.push(['select',table,fields]);return query;}}),
  rpc:async()=>({data:[{evaluation:'binary',yes_count:1,no_count:0,total_votes:1}],error:null})
 };return{client,calls};
}
const vote=(f,value='yes',evaluationType='BINARY')=>submitSupabaseVote({postId:'post-a',evaluationType,value,client:f.client});
test('lost response recovers only own scoped receipt and never inserts twice',async()=>{const f=fixture();const r=await vote(f);assert.equal(r.data.recovered,true);assert.equal(r.data.vote.value,'yes');assert.equal(f.calls.filter(c=>c[0]==='insert').length,1);assert.ok(f.calls.some(c=>c[0]==='eq'&&c[1]==='voter_id'&&c[2]==='member-a'));});
test('thrown network failure restores persisted numeric choice not latest attempted value',async()=>{const f=fixture({throws:true,receipt:{choice:null,perceived_age:35}});const r=await vote(f,40,'NUMERIC_AGE');assert.equal(r.data.vote.value,35);assert.equal(r.data.recovered,true);});
test('unique conflict restores immutable prior binary choice even when retry chose another',async()=>{const r=await vote(fixture({error:{code:'23505'},receipt:{choice:'no'}}));assert.equal(r.data.vote.value,'no');assert.equal(r.data.recovered,true);});
test('missing or unreadable receipt never becomes a successful saved vote',async()=>{for(const options of [{receipt:null},{readError:{code:'42501'}},{error:{code:'42501'}}]){const r=await vote(fixture(options));assert.ok(r.error);assert.equal(r.data,undefined);}});
test('changed authenticated account cannot recover another account receipt',async()=>{const f=fixture({changed:true});const r=await vote(f);assert.ok(r.error);assert.equal(f.calls.filter(c=>c[0]==='select').length,0);});
