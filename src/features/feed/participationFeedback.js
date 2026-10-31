export const FEEDBACK_SESSION_KEY = 'facs_participation_feedback_v1';
export const FEEDBACK_OPTIONS = [
  { id:'photo', event:'participation_barrier_photo', ko:'올릴 사진이 아직 없어요', en:'I do not have a photo ready' },
  { id:'privacy', event:'participation_barrier_privacy', ko:'사진 공개가 부담돼요', en:'I am not comfortable sharing a photo' },
  { id:'rating', event:'participation_barrier_rating', ko:'다른 사람을 평가하기 망설여져요', en:'I am hesitant to rate someone' },
  { id:'access', event:'participation_barrier_access', ko:'로그인이나 사용 중 문제가 있어요', en:'I had trouble signing in or using the site' },
  { id:'browse', event:'participation_barrier_browse', ko:'지금은 둘러보고 있어요', en:'I am just browsing' },
];
export function sendParticipationFeedback(id,{storage,emit}={}) {
 try{storage ??= globalThis.sessionStorage;}catch{storage=null;}
 const choice=FEEDBACK_OPTIONS.find(x=>x.id===id);
 if(!choice)return false;
 try{if(storage?.getItem(FEEDBACK_SESSION_KEY))return false;}catch{}
 // Only an allowlisted event name is emitted; no free text, member ID or URL.
 emit?.(choice.event);
 try{storage?.setItem(FEEDBACK_SESSION_KEY,'submitted');}catch{}
 return true;
}
