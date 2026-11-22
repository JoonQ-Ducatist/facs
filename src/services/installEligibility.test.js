import test from 'node:test';import assert from 'node:assert/strict';import{canOfferInstall}from'./installEligibility.js';
const eligible={tab:'profile',authenticated:true,voteCount:1,policyOpen:false,ready:true};
test('installation never covers feed rating or ranking',()=>{for(const tab of ['feed','ranking','upload'])assert.equal(canOfferInstall({...eligible,tab}),false);});
test('first-use signed-out and no-vote profiles do not receive installation offer',()=>{assert.equal(canOfferInstall({...eligible,voteCount:0}),false);assert.equal(canOfferInstall({...eligible,authenticated:false}),false);});
test('existing eligible profile keeps optional installation and respects policy and loading gates',()=>{assert.equal(canOfferInstall(eligible),true);assert.equal(canOfferInstall({...eligible,policyOpen:'privacy'}),false);assert.equal(canOfferInstall({...eligible,ready:false}),false);});
