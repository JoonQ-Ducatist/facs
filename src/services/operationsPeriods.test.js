import test from 'node:test';import assert from 'node:assert/strict';
import{getOperationalWindow}from'./operationsMetricsApi.js';
test('7 and 30 day tabs request distinct real RPC windows',async()=>{const hours=[];const client={rpc:async(name,args)=>{assert.equal(name,'get_mvp_operational_metrics');hours.push(args.window_hours);return{data:[{unique_visitors:args.window_hours}]};}};assert.equal((await getOperationalWindow(7,client)).data.unique_visitors,168);assert.equal((await getOperationalWindow(30,client)).data.unique_visitors,720);assert.deepEqual(hours,[168,720]);});
test('unknown periods never run a metrics query',async()=>{let calls=0;const r=await getOperationalWindow(1,{rpc:async()=>{calls++;}});assert.ok(r.error);assert.equal(calls,0);});
test('period switch errors stay unavailable and are not converted to zero',async()=>{const r=await getOperationalWindow(7,{rpc:async()=>({error:{code:'42501'}})});assert.ok(r.error);assert.equal(r.data,undefined);});
