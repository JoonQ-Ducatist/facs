export function entryStorage(){try{return window.sessionStorage;}catch{return null;}}
const KEY='facs_feedback_entry_v1';
export function entryUrl(intent,locale='en'){return `${locale==='ko'?'/ko/':'/'}?intent=${['tests','rate'].includes(intent)?intent:'upload'}`;}
export function rememberEntryIntent(search,storage,now=Date.now()){
 const intent=new URLSearchParams(search).get('intent');
 if(['upload','tests','rate'].includes(intent)){try{storage?.setItem(KEY,JSON.stringify({intent,expiresAt:now+30*60*1000}));}catch{}return intent;}
 try{const value=JSON.parse(storage?.getItem(KEY)||'null');if(['upload','tests','rate'].includes(value?.intent)&&value.expiresAt>now)return value.intent;storage?.removeItem(KEY);}catch{}return null;
}
export function clearEntryIntent(storage){try{storage?.removeItem(KEY);}catch{}}
export function invitationUrl(origin,token,locale='en'){return `${origin}/feedback${locale==='ko'?'?locale=ko':''}#${token}`;}
export function invitationMessage(url,locale='en'){
 const text=locale==='ko'
  ? '이 사진의 첫인상이 어떤가요? 만 14세 이상이면 가입 없이 YES/NO 의견을 남길 수 있어요. 사진은 링크를 열면 보이고, 원하지 않으면 평가하지 않고 나가도 괜찮아요. 초대 의견은 회원 평가와 따로 집계됩니다. 링크는 다른 사람에게 전달될 수 있어요.'
  : 'What is your first impression of this photo? If you are 14 or older, you can give a YES/NO opinion without an account. Open the link to view the photo, or leave without rating. Invite opinions are counted separately from member ratings. Anyone with the link can forward it.';
 return `${text}\n\n${url}`;
}
export async function shareInvitation(url,locale='en',platform=navigator){
 if(platform.share){try{await platform.share({title:'FACt.Smack',text:invitationMessage('',locale).trim(),url});return 'shared';}catch(error){if(error.name==='AbortError')return 'cancelled';}}
 await platform.clipboard.writeText(url);return 'copied';
}
