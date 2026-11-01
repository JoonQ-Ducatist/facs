import { sendOwnPushTest } from '../server/pushTest.js';
import webpush from'web-push';
import{body,clients,endpointHash,failure,identity,json,sameOrigin,UUID,validPushSubscription,HOME}from'../server/growthCore.js';
import{gaOverview,youtubeComments,youtubeOverview}from'../server/growthIntegrations.js';
export async function GET(request){
 try{const action=new URL(request.url).searchParams.get('action');
  if(action==='push-config')return json({ok:true,available:Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY&&process.env.VAPID_PUBLIC_KEY&&process.env.VAPID_PRIVATE_KEY),publicKey:process.env.VAPID_PUBLIC_KEY||null});
  const ctx=await identity(request,{admin:true});
  if(action==='youtube')return json({ok:true,data:await youtubeOverview(ctx.service)});
  if(action==='youtube-comments')return json({ok:true,data:await youtubeComments()});
  if(action==='members'){const r=await ctx.member.rpc('get_growth_member_metrics',{window_hours:720});if(r.error)throw Error('UNAVAILABLE');return json({ok:true,data:r.data});}
  if(action==='ga4')return json({ok:true,data:await gaOverview(ctx.service)});
  return json({ok:false,code:'INPUT'},400);
 }catch(error){return failure(error);}
}
export async function POST(request){
 try{
  if(!sameOrigin(request))return json({ok:false,code:'FORBIDDEN'},403);
  const input=await body(request),ctx=await identity(request);if(!ctx.service)throw Error('UNAVAILABLE');
  if(input.action==='test-push')return await sendOwnPushTest({ctx,endpoint:input.endpoint,locale:input.locale});
  if(input.action==='push-subscribe'){
   if(!validPushSubscription(input.subscription))throw Error('INPUT');
   const sub={endpoint:input.subscription.endpoint,keys:{p256dh:input.subscription.keys.p256dh,auth:input.subscription.keys.auth}};
   const existing=await ctx.service.from('push_subscriptions').select('member_id,subscription').eq('endpoint_hash',endpointHash(sub.endpoint)).maybeSingle();
   // A browser can switch accounts: explicitly subscribing transfers only this browser's endpoint.
   if(existing.error)throw Error('UNAVAILABLE');
   if(existing.data&&existing.data.member_id!==ctx.user.id&&(existing.data.subscription?.keys?.auth!==sub.keys.auth||existing.data.subscription?.keys?.p256dh!==sub.keys.p256dh))throw Error('FORBIDDEN');
   if(!existing.data||existing.data.member_id!==ctx.user.id){const count=await ctx.service.from('push_subscriptions').select('id',{count:'exact',head:true}).eq('member_id',ctx.user.id);if(count.error)throw Error('UNAVAILABLE');if(count.count>=5)throw Error('INPUT');}
   const r=await ctx.service.from('push_subscriptions').upsert({member_id:ctx.user.id,endpoint_hash:endpointHash(sub.endpoint),subscription:sub,locale:input.locale==='ko'?'ko':'en',updated_at:new Date().toISOString()});if(r.error)throw Error('UNAVAILABLE');return json({ok:true});
  }
  if(input.action==='push-unsubscribe'){
   if(typeof input.endpoint!=='string'||input.endpoint.length>4096)throw Error('INPUT');
   const r=await ctx.service.from('push_subscriptions').delete().eq('member_id',ctx.user.id).eq('endpoint_hash',endpointHash(input.endpoint));if(r.error)throw Error('UNAVAILABLE');return json({ok:true});
  }
  if(input.action==='notify-first-rating'){
   if(!UUID.test(input.postId))throw Error('INPUT');
   if(!process.env.VAPID_PUBLIC_KEY||!process.env.VAPID_PRIVATE_KEY)throw Error('UNAVAILABLE');
   const claim=await ctx.service.rpc('claim_first_rating_notice',{target_post_id:input.postId,verified_voter_id:ctx.user.id});if(claim.error)throw Error('UNAVAILABLE');
   if(!claim.data)return json({ok:true},202);
   const list=await ctx.service.from('push_subscriptions').select('id,subscription,locale').eq('member_id',claim.data);if(list.error)throw Error('UNAVAILABLE');
   if(!process.env.VAPID_PUBLIC_KEY||!process.env.VAPID_PRIVATE_KEY)throw Error('UNAVAILABLE');
   webpush.setVapidDetails('mailto:teamfactsmack@gmail.com',process.env.VAPID_PUBLIC_KEY,process.env.VAPID_PRIVATE_KEY);
   let delivered=false,temporaryFailure=false;
   await Promise.all((list.data||[]).map(async sub=>{
    if(!validPushSubscription(sub.subscription))return;
    const ko=sub.locale==='ko';
    try{await webpush.sendNotification(sub.subscription,JSON.stringify({title:'FACt.Smack',body:ko?'내 게시물에 평가가 도착했어요. 결과를 확인해 보세요.':'Your post received feedback. Take a look at the results.',url:`${HOME}/${ko?'ko/':''}?post=${input.postId}`,tag:`first-rating-${input.postId}`}),{TTL:3600,timeout:5000});delivered=true;}
    catch(e){if([404,410].includes(e.statusCode))await ctx.service.from('push_subscriptions').delete().eq('id',sub.id);else temporaryFailure=true;}
   }));
   if(delivered||!temporaryFailure)await ctx.service.from('first_rating_notifications').update({state:'sent'}).eq('post_id',input.postId);
   return json({ok:true},202);
  }
  throw Error('INPUT');
 }catch(error){return failure(error);}
}
