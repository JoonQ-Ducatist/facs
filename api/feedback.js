import{clients,body,json,failure,identity,HOME}from'../server/growthCore.js';
import{inputFeedback,digest,newToken,privateHeaders,TOKEN}from'../server/feedbackRules.js';
const cookieName='facs-feedback-visitor';
// Unauthenticated callers receive only the one explicitly enabled photo. No raw Storage URL or token is returned.
export async function POST(request){
 try{
  if(![HOME,'https://factsmack.com'].includes(request.headers.get('origin')))throw Error('FORBIDDEN');
  const input=inputFeedback(await body(request));const {service}=clients();if(!service)throw Error('UNAVAILABLE');
  let cookie=request.headers.get('cookie')?.split(';').map(s=>s.trim()).find(s=>s.startsWith(cookieName+'='))?.slice(cookieName.length+1);
  if(!TOKEN.test(cookie||''))cookie=newToken();
  const visitor=digest(cookie+input.token);const address=request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim()||'unknown';
  // Short-lived, salted by the secret token; never persist raw IP or public cross-site IDs.
  for(const [key,max]of[['global',500],['client:'+digest(address+input.token),60]]){
   const result=await service.rpc('feedback_claim_budget',{scope_key:key,max_requests:max});
   if(result.error||!result.data)return json({ok:false,code:'LIMIT'},429);
  }
  const info=await service.rpc('read_feedback_invite',{token_digest:digest(input.token)});
  if(info.error||!info.data)return json({ok:false,code:'UNAVAILABLE'},404);
  const photo=info.data;
  if(request.headers.has('authorization')){const ctx=await identity(request);const visible=await ctx.member.from('posts').select('author_id').eq('id',photo.postId).maybeSingle();if(visible.error||!visible.data)throw Error('FORBIDDEN');if(input.action==='vote'&&visible.data.author_id===ctx.user.id)throw Error('FORBIDDEN');}
  if(input.action==='report'){const report=await service.rpc('report_feedback_invite',{token_digest:digest(input.token),visitor_digest:visitor,input_reason:input.reason});if(report.error)throw Error('UNAVAILABLE');return json({ok:true});}
  const headers={...privateHeaders,'Set-Cookie':`${cookieName}=${cookie}; Path=/api/feedback; HttpOnly; Secure; SameSite=Strict; Max-Age=604800`};
  if(input.action==='image'){
   if(!['image/jpeg','image/png','image/webp'].includes(photo.mime)||photo.size>15*1024*1024)throw Error('UNAVAILABLE');
   const budget=await service.rpc('feedback_claim_budget',{scope_key:'media-bytes',max_requests:20*1024*1024,units:photo.size});if(budget.error||!budget.data)return json({ok:false,code:'LIMIT'},429);
   const media=await service.storage.from('facs-media').download(photo.storagePath);if(media.error||!media.data)throw Error('UNAVAILABLE');
   return new Response(media.data,{headers:{...headers,'Content-Type':photo.mime}});
  }
  if(input.action==='vote'){
   const saved=await service.rpc('submit_feedback_invite',{token_digest:digest(input.token),visitor_digest:visitor,input_choice:input.choice,input_note:input.note||null});
   if(saved.error)return new Response(JSON.stringify({ok:false,code:saved.error.code==='23505'?'ALREADY_VOTED':'UNAVAILABLE'}),{status:409,headers:{...headers,'Content-Type':'application/json'}});
   return new Response(JSON.stringify({ok:true}),{headers:{...headers,'Content-Type':'application/json'}});
  }
  const previous=await service.from('feedback_external_votes').select('id').eq('invite_id',photo.id).eq('visitor_hash',visitor).maybeSingle();if(previous.error)throw Error('UNAVAILABLE');
  return new Response(JSON.stringify({ok:true,question:photo.question,category:photo.category,alreadySubmitted:Boolean(previous.data)}),{headers:{...headers,'Content-Type':'application/json'}});
 }catch(error){return failure(error);}
}
