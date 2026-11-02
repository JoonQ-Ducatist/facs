import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {retainedImageSource,observeFeedImage} from './src/features/feed/imageLoading.js';
test('returning to a prepared photo retains its source; unseen and replaced photos stay gated',()=>{
 assert.equal(retainedImageSource(null,'photo',false),undefined);
 const loaded=retainedImageSource(null,'photo',true);
 assert.equal(retainedImageSource(loaded,'photo',false),'photo');
 assert.equal(retainedImageSource(loaded,'different',false),undefined);
});
test('prepares about one viewport ahead then disconnects without requesting distant media',()=>{
 let callback,options,observed,disconnects=0,ready=0;
 const main={clientHeight:900};const article={closest:selector=>selector.includes('main')?main:null};
 class Observer{constructor(cb,o){callback=cb;options=o;}observe(a){observed=a;}disconnect(){disconnects++;}}
 const stop=observeFeedImage(article,()=>ready++,{IntersectionObserver:Observer});
 assert.equal(options.root,main);assert.equal(options.rootMargin,'900px 0px');assert.equal(observed,article);
 callback([{isIntersecting:false}]);assert.equal(ready,0);
 callback([{isIntersecting:true}]);assert.equal(ready,1);assert.equal(disconnects,1);stop();
});
test('image observation fallback works without IntersectionObserver',()=>{
 let ready=0;observeFeedImage({},()=>ready++,{})();assert.equal(ready,1);
});
test('updated component parses and videos retain the near-viewport activation gate',async()=>{
 const source=fs.readFileSync('src/features/feed/FeedView.jsx','utf8');
 const require=createRequire(import.meta.url);
 await require('esbuild').transform(source,{loader:'jsx',jsx:'automatic'});
 assert.ok(source.includes('interactive={nearViewport && index === mediaIndex}'));
 assert.ok(source.includes("src={interactive ? source.url : undefined}"));
});
