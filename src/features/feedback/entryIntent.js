export function entryStorage(){try{return window.sessionStorage;}catch{return null;}}
const KEY='facs_feedback_entry_v1';
export function entryUrl(intent,locale='en'){return `${locale==='ko'?'/ko/':'/'}?intent=${intent==='tests'?'tests':'upload'}`;}
export function rememberEntryIntent(search,storage,now=Date.now()){
 const intent=new URLSearchParams(search).get('intent');
 if(['upload','tests'].includes(intent)){try{storage?.setItem(KEY,JSON.stringify({intent,expiresAt:now+30*60*1000}));}catch{}return intent;}
 try{const value=JSON.parse(storage?.getItem(KEY)||'null');if(['upload','tests'].includes(value?.intent)&&value.expiresAt>now)return value.intent;storage?.removeItem(KEY);}catch{}return null;
}
export function clearEntryIntent(storage){try{storage?.removeItem(KEY);}catch{}}
export function invitationUrl(origin,token,locale='en'){return `${origin}/feedback${locale==='ko'?'?locale=ko':''}#${token}`;}
export async function shareInvitation(url,locale='en',platform=navigator){
 if(platform.share){try{await platform.share({title:'FACt.Smack',text:locale==='ko'?'이 사진에 대한 의견을 들려주세요. 가입 없이 참여할 수 있어요.':'Could you give feedback on this photo? No account needed.',url});return 'shared';}catch(error){if(error.name==='AbortError')return 'cancelled';}}
 await platform.clipboard.writeText(url);return 'copied';
}
