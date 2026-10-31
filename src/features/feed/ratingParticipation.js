// Exact operator-owned publications, not a guess based on another member's handle.
export const DEMO_POST_IDS = new Set(['b7295bfa-38a7-423d-a3a0-044675e088d1','60b04cce-f4de-4b1f-a722-b2390eca92ce','29dd34a5-ebb8-4e4d-833f-24107f29f5bf','efd44cf9-1965-45ee-9bbd-25ef39db204a','fb030034-1870-42d2-a64c-38ee0e2f580a','0ee502dd-de31-4b87-aad5-3939e2dcba82','a89f496c-2ec4-4063-a84b-8c0e5c8a2be0','04245be1-c675-4934-9ad1-8edee9437ff5','118791c7-2340-428c-adf1-f72d9abd06ab','1b845f21-6eb5-4e9c-9b6e-7dbf7bb60576']);
const DEMO_HANDLES = new Set(['mia_demo1','ethan_demo2','oliver_demo8','noah_demo4','grace_demo9','chloe_demo3','lucas_demo10','sofia_demo5','ava_demo7','liam_demo6']);
export function isRatingMember(profile) {
  const handle = String(profile?.handle ?? '').toLowerCase();
  return Boolean(profile?.id && handle && !DEMO_HANDLES.has(handle) && !['admin','moderator'].includes(profile.role) && !['master','facsteam','facs_team'].includes(handle) && !handle.startsWith('qa_'));
}
export function participationCount(card) {
  const count = card.evaluationType === 'NUMERIC_AGE' ? card.ageVoteCount : Number(card.yesVotes ?? 0) + Number(card.noVotes ?? 0);
  if (card.participationCount === null && !count) return null;
  return Number.isSafeInteger(count) && count >= 0 ? count : null;
}
export function demoStarter(cards, votedIds, userId) {
  return cards.find(card => DEMO_POST_IDS.has(card.id) && card.evaluationType !== 'NUMERIC_AGE' && !votedIds?.has(card.id) && card.authorId !== userId);
}
export function nextUnrated(cards, currentId, votedIds, skipped, userId) {
  const index=cards.findIndex(c=>c.id===currentId);
  return cards.slice(index+1).find(c=>!votedIds?.has(c.id) && !skipped.includes(c.id) && c.authorId!==userId && !c.isMyUpload);
}
export function dayKey(date=new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}
export function retainedDays(days, date=new Date()) {
  const cutoff=new Date(date);cutoff.setDate(cutoff.getDate()-29);
  return [...new Set(Array.isArray(days)?days:[])].filter(d=>/^\d{4}-\d{2}-\d{2}$/.test(d)&&d>=dayKey(cutoff)&&d<=dayKey(date)).sort();
}
export function weekParticipation(days,date=new Date()) {
  const monday=new Date(date);monday.setDate(monday.getDate()-((monday.getDay()+6)%7));
  return retainedDays(days,date).filter(d=>d>=dayKey(monday)).length;
}
export function readRatingState(storage,key,fallback) {
  try { const value=JSON.parse(storage?.getItem(key)??'null');return value&&typeof value==='object'?value:fallback; } catch { return fallback; }
}
export function writeRatingState(storage,key,value) { try{storage?.setItem(key,JSON.stringify(value));}catch{/* Convenience state never blocks a vote. */} }
export function confirmedRating(state,postId,date=new Date()) {
  if(state.completed.includes(postId)) return state;
  return {...state,completed:[...state.completed,postId].slice(-100),days:retainedDays([...state.days,dayKey(date)],date)};
}
