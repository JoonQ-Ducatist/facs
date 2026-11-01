import { createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
export const HOME='https://www.factsmack.com';
export const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export function clients(env=process.env){
 const url=env.VITE_SUPABASE_URL,anon=env.VITE_SUPABASE_PUBLISHABLE_KEY||env.VITE_SUPABASE_ANON_KEY;
 if(!url||!anon)throw Error('UNAVAILABLE');
 const options={auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}};
 return{url,anon,publicClient:createClient(url,anon,options),service:env.SUPABASE_SERVICE_ROLE_KEY?createClient(url,env.SUPABASE_SERVICE_ROLE_KEY,options):null,options};
}
export async function identity(request,{admin=false,env=process.env}={}){
 const token=request.headers.get('authorization')?.match(/^Bearer ([A-Za-z0-9._-]+)$/)?.[1];
 if(!token)throw Error('AUTH');
 const base=clients(env);const{data,error}=await base.publicClient.auth.getUser(token);
 if(error||!data.user)throw Error('AUTH');
 const member=createClient(base.url,base.anon,{...base.options,global:{headers:{Authorization:`Bearer ${token}`}}});
 if(admin){const r=await member.from('profiles').select('role').eq('id',data.user.id).single();if(r.error||r.data?.role!=='admin')throw Error('FORBIDDEN');}
 return{...base,member,user:data.user};
}
export function validPushSubscription(value){
 try{
  const u=new URL(value?.endpoint);const host=u.hostname;
  const permitted=host==='fcm.googleapis.com'||host==='web.push.apple.com'||host==='updates.push.services.mozilla.com'||host.endsWith('.notify.windows.com');
  return u.protocol==='https:'&&!u.username&&!u.password&&(!u.port||u.port==='443')&&permitted&&u.href.length<=4096&&/^[A-Za-z0-9_-]{80,200}$/.test(value.keys?.p256dh??'')&&/^[A-Za-z0-9_-]{16,50}$/.test(value.keys?.auth??'');
 }catch{return false;}
}
export const endpointHash=endpoint=>createHash('sha256').update(endpoint).digest('hex');
export function sameOrigin(request){const o=request.headers.get('origin');return !o||['https://www.factsmack.com','https://factsmack.com'].includes(o);}
export async function body(request){const length=Number(request.headers.get('content-length')||0);if(length>16384)throw Error('INPUT');const s=await request.text();if(s.length>16384)throw Error('INPUT');try{return JSON.parse(s);}catch{throw Error('INPUT');}}
export function failure(error){return json({ok:false,code:['AUTH','FORBIDDEN','INPUT'].includes(error.message)?error.message:'UNAVAILABLE'},error.message==='AUTH'?401:error.message==='FORBIDDEN'?403:error.message==='INPUT'?400:503);}
