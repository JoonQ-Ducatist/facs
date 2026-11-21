/** One in-flight request per card. A failed attempt releases the lock for retry. */
export function createVoteRequest(){let pending=false;return{get pending(){return pending;},async run(action){if(pending)return{ok:false,busy:true};pending=true;try{return await action();}finally{pending=false;}}};}
export function ratingCountPrompt(count,locale='en'){
 if(count===null)return locale==='en'?'Rating count unavailable':'평가 수를 확인하지 못했어요.';
 if(count===0)return locale==='en'?'No opinions yet. You can leave the first one.':'아직 의견이 없어요. 첫 의견을 남겨보세요.';
 return locale==='en'?`${count.toLocaleString()} ratings saved`:`저장된 평가 ${count.toLocaleString()}건`;
}
