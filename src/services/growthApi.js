import {supabase}from'./supabaseClient.js';
let pushConfigPromise;
export function getPushConfig(){return pushConfigPromise??=fetch('/api/growth?action=push-config',{cache:'no-store'}).then(r=>r.ok?r.json():{available:false}).catch(()=>({available:false}));}
export async function growthRequest(action,body){
 try{const{data}=await supabase.auth.getSession();if(!data.session?.access_token)return{ok:false,code:'AUTH'};
 const response=await fetch('/api/growth'+(body?'':'?action='+encodeURIComponent(action)),{method:body?'POST':'GET',headers:{Authorization:'Bearer '+data.session.access_token,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify({...body,action})}:{}),signal:AbortSignal.timeout(action==='push-unsubscribe'?2000:body?8000:15000)});
 return await response.json();}catch{return{ok:false,code:'UNAVAILABLE'};}
}
function applicationKey(value){const binary=atob(value.replace(/-/g,'+').replace(/_/g,'/'));return Uint8Array.from(binary,c=>c.charCodeAt(0));}
export async function enablePush(locale){
 const config=await getPushConfig();if(!config.available)throw Error('UNAVAILABLE');
 const permission=await Notification.requestPermission();if(permission!=='granted')return false;
 const registration=await navigator.serviceWorker.ready;const previous=await registration.pushManager.getSubscription();
 const subscription=previous??await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:applicationKey(config.publicKey)});
 const saved=await growthRequest('push-subscribe',{subscription:subscription.toJSON(),locale});
 if(!saved.ok){if(!previous)await subscription.unsubscribe();throw Error('UNAVAILABLE');}const{data}=await supabase.auth.getSession();try{localStorage.setItem('facs-push-member',data.session.user.id);}catch{}return true;
}
export async function currentPushEnabled(){const{data}=await supabase.auth.getSession();try{return Boolean(data.session?.user.id&&localStorage.getItem('facs-push-member')===data.session.user.id);}catch{return false;}}
export async function disablePush(){
 if(!('serviceWorker' in navigator))return;
 const registration=await navigator.serviceWorker.getRegistration();const subscription=await registration?.pushManager?.getSubscription();if(!subscription)return;
 const saved=await growthRequest('push-unsubscribe',{endpoint:subscription.endpoint});
 const browser=await subscription.unsubscribe();try{localStorage.removeItem('facs-push-member');}catch{}if(!saved.ok&&!browser)throw Error('UNAVAILABLE');
}
