import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const app=fs.readFileSync('src/App.jsx','utf8');
function context(extra={}) {
 const values={};
 const c={values,locale:'en',profile:{},hasUploadDraft:false,isSharedGuest:false,authUser:{id:'u'},profileLoading:false,pendingCommentReturn:{current:null},resumeUploadAfterHandle:false,
 isConfiguredHandle:()=>false,uploadOpenedTracked:{current:false},trackEvent:()=>{},ANALYTICS_EVENT:{UPLOAD_OPENED:'upload'},...extra};
 for(const key of ['UploadStarter','IsSharedGuest','IsGuest','Toast','ResumeUploadAfterHandle','ActiveTab','ProfileNotice','PublishedConfirmation','Profile','FeedMode','ActiveCategory','FeaturedPostId','CurrentIndex']) c['set'+key]=v=>{values[key]=v;};
 return vm.createContext(c);
}
function open(c){return vm.runInContext(app.slice(app.indexOf('  function openUpload('),app.indexOf('  /** Ends the actual Supabase')),c);}
function saver(c){const start=app.indexOf('async (handle) => {',app.indexOf('const saveHandle ='));const end=app.indexOf('}, [locale, resumeUploadAfterHandle]);',start);return vm.runInContext('('+app.slice(start,end+1)+')',c);}
test('missing public ID preserves starter before routing to profile',()=>{const c=context();open(c);vm.runInContext("openUpload({category:'WORK',question:'My question',id:'s'})",c);assert.equal(c.values.UploadStarter.question,'My question');assert.equal(c.values.ActiveTab,'profile');assert.equal(c.values.ResumeUploadAfterHandle,true);});
test('existing upload draft is not overwritten',()=>{const c=context({hasUploadDraft:true});open(c);vm.runInContext("openUpload({category:'WORK',question:'new'})",c);assert.equal(c.values.UploadStarter,undefined);});
test('saved ID returns to the comment post without posting automatically',async()=>{const c=context({pendingCommentReturn:{current:'post-1'},updateMyHandle:async()=>({}),mapHandleSaveResult:()=>({ok:true,data:{handle:'new'}})});await saver(c)('new');assert.equal(c.values.ActiveTab,'feed');assert.equal(c.values.FeaturedPostId,'post-1');assert.equal(c.pendingCommentReturn.current,null);});
test('failed ID save keeps pending comment intact',async()=>{const c=context({pendingCommentReturn:{current:'post-1'},updateMyHandle:async()=>({}),mapHandleSaveResult:()=>({ok:false,message:'taken'})});await saver(c)('taken');assert.equal(c.pendingCommentReturn.current,'post-1');assert.equal(c.values.ActiveTab,undefined);});
test('changed JSX parses with current React tooling',async()=>{for(const file of ['src/App.jsx','src/features/feed/FeedView.jsx','src/features/auth/AuthEntryView.jsx'])await require('esbuild').transform(fs.readFileSync(file,'utf8'),{loader:'jsx',jsx:'automatic'});});
