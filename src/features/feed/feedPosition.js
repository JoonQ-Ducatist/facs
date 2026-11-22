const KEY='facs_feed_position_v1';
export function feedPositionScope(user,category,mode,featured){return user&&!featured?JSON.stringify([user,category,mode]):null;}
export function readFeedPosition(storage,scope,ids,now=Date.now()){
 try{const p=JSON.parse(storage?.getItem(KEY)||'null');if(!p)return null;
 if(!scope||p.scope!==scope||!Number.isFinite(p.at)||now-p.at>30*60*1000||now<p.at||!ids.includes(p.postId)||!Number.isFinite(p.offset)||!Number.isInteger(p.mediaIndex)||p.mediaIndex<0){storage?.removeItem(KEY);return null;}return p;
 }catch{return null;}
}
export function saveFeedPosition(storage,scope,p,now=Date.now()){
 if(!scope)return;try{storage?.setItem(KEY,JSON.stringify({scope,postId:p.postId,offset:p.offset,mediaIndex:p.mediaIndex,at:now}));}catch{}
}
export function clearFeedPosition(storage){try{storage?.removeItem(KEY);}catch{}}
export function feedSessionStorage(){try{return window.sessionStorage;}catch{return null;}}
