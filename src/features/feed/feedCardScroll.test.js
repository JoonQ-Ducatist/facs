import test from 'node:test';
import assert from 'node:assert/strict';
import { scrollFeedCardIntoView } from './feedCardScroll.js';

function fixture({ nested=false, cardTop=500, scrollTop=200, reduced=false }={}) {
  const calls=[];
  const rail={getBoundingClientRect:()=>({height:36})};
  const main={parentElement:null};
  const owner={parentElement:main,clientTop:0,scrollTop,scrollHeight:1800,clientHeight:600,getBoundingClientRect:()=>({top:nested?110:60,bottom:710}),querySelector:()=>nested?null:rail,scrollTo:args=>calls.push(args)};
  const header={getBoundingClientRect:()=>({bottom:60})};
  const card={parentElement:owner,getBoundingClientRect:()=>({top:cardTop}),closest:()=>({querySelector:()=>header})};
  const windowRef={getComputedStyle:node=>({overflowY:node===owner?'auto':'visible',position:node===rail?'sticky':'static'}),matchMedia:()=>({matches:reduced})};
  return{card,windowRef,calls};
}
test('portrait next-card positioning reserves the sticky category rail below the header',()=>{
 const f=fixture();assert.equal(scrollFeedCardIntoView(f.card,{windowRef:f.windowRef}),true);
 assert.deepEqual(f.calls,[{top:596,behavior:'smooth'}]);
});
test('landscape and desktop move the inner feed only and do not subtract an external rail twice',()=>{
 const f=fixture({nested:true});scrollFeedCardIntoView(f.card,{windowRef:f.windowRef});
 assert.deepEqual(f.calls,[{top:582,behavior:'smooth'}]);
});
test('first and last cards clamp to their scroll range and honor reduced motion',()=>{
 const first=fixture({cardTop:40,scrollTop:0,reduced:true});scrollFeedCardIntoView(first.card,{windowRef:first.windowRef});
 assert.deepEqual(first.calls,[{top:0,behavior:'auto'}]);
 const last=fixture({cardTop:5000,reduced:true});scrollFeedCardIntoView(last.card,{windowRef:last.windowRef});
 assert.deepEqual(last.calls,[{top:1200,behavior:'auto'}]);
});
