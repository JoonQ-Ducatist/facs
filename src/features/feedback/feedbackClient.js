import {supabase} from '../../services/supabaseClient.js';
export const noteOptions={en:[['clear','Face is easy to see'],['natural','Looks natural'],['lighting','Try brighter lighting'],['background','Try a simpler background'],['crop','Try a different crop']],ko:[['clear','얼굴이 잘 보여요'],['natural','자연스러워요'],['lighting','조금 더 밝게 찍어보세요'],['background','배경을 단순하게 해보세요'],['crop','사진을 다르게 잘라보세요']]};
export async function feedbackRpc(name,args){
 if(!supabase)throw Error('UNAVAILABLE');const r=await supabase.rpc(name,args);if(r.error)throw Error('UNAVAILABLE');return r.data;
}
export async function createInvite(postId){
 const bytes=crypto.getRandomValues(new Uint8Array(32));const token=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
 const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token))),b=>b.toString(16).padStart(2,'0')).join('');
 await feedbackRpc('manage_feedback_test',{target_post_id:postId,operation:'invite',token_digest:hash});
 return `${location.origin}/feedback#${token}`;
}
export async function externalRequest(token,action,extra={}){
 const {data:sessionData}=await supabase?.auth.getSession()||{data:{}};
 const r=await fetch('/api/feedback',{method:'POST',headers:{'Content-Type':'application/json',...(sessionData.session?.access_token?{Authorization:'Bearer '+sessionData.session.access_token}:{})},body:JSON.stringify({token,action,...extra}),credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(15000)});
 if(action==='image'){if(!r.ok)throw Error('UNAVAILABLE');return r.blob();}const data=await r.json();if(!r.ok||!data.ok)throw Error(data.code||'UNAVAILABLE');return data;
}
