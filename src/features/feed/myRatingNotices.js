export function noticeStorageKey(memberId) {return `facs_rating_notices_v1:${memberId}`;}
export function ratingTotal(card) {
 const n=card.evaluationType==='NUMERIC_AGE'?Number(card.ageVoteCount):Number(card.yesVotes??0)+Number(card.noVotes??0);
 return Number.isSafeInteger(n)&&n>=0?n:0;
}
export function ratingNotices(cards,memberId,seen={}) {
 if(!memberId||!Array.isArray(cards))return [];
 return cards.filter(c=>c.authorId===memberId || (c.isMyUpload&&!c.authorId)).map(card=>({card,total:ratingTotal(card),unread:Math.max(0,ratingTotal(card)-(Number.isSafeInteger(seen[card.id])?seen[card.id]:0))})).filter(n=>n.total>0).sort((a,b)=>b.unread-a.unread || Date.parse(b.card.publishedAt??0)-Date.parse(a.card.publishedAt??0));
}
export function readNoticeCounts(memberId,storage) {
 try{storage ??= globalThis.localStorage;const value=JSON.parse(storage?.getItem(noticeStorageKey(memberId))??'{}');return value&&typeof value==='object'&&!Array.isArray(value)?value:{};}catch{return {};}
}
export function markNoticeRead(cards,memberId,postId,seen,storage) {
 const notices=ratingNotices(cards,memberId,seen);const chosen=notices.find(n=>n.card.id===postId);
 if(!chosen)return seen;
 const ids=new Set(cards.map(c=>c.id));const next=Object.fromEntries(Object.entries(seen).filter(([id])=>ids.has(id)));
 next[postId]=chosen.total;try{storage ??= globalThis.localStorage;storage?.setItem(noticeStorageKey(memberId),JSON.stringify(next));}catch{}return next;
}

export function hasIncompleteRatingCounts(cards,memberId) {
 return Boolean(memberId&&Array.isArray(cards)&&cards.some(c=>(c.authorId===memberId||(c.isMyUpload&&!c.authorId))&&c.participationCount===null&&ratingTotal(c)===0));
}
