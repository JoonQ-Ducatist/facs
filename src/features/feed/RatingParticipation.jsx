import { useEffect, useRef, useState } from 'react';
import { trackEvent } from '../../services/analytics.js';
import { scrollFeedCardIntoView } from './feedCardScroll.js';
import { confirmedRating, dayKey, demoStarter, nextUnrated, readRatingState, retainedDays, weekParticipation, writeRatingState } from './ratingParticipation.js';

export function useRatingParticipation({ cards, votedIds, userId, eligible, onVote, hasMore }) {
  const ownerRef=useRef(userId);ownerRef.current=userId;
  const stateRef=useRef({owner:null,completed:[],days:[],skipped:[],dismissed:false});
  const [,render]=useState(0);
  const [notice,setNotice]=useState(false);
  const visitKey=`facs_rating_visit_v1:${userId}`;
  const dayStorageKey=`facs_rating_days_v1:${userId}`;
  function load() {
    if(stateRef.current.owner===userId) return stateRef.current;
    let local,session;try{local=window.localStorage;session=window.sessionStorage;}catch{}
    const visit=readRatingState(session,visitKey,{});
    const stored=readRatingState(local,dayStorageKey,{});
    stateRef.current={owner:userId,completed:Array.isArray(visit.completed)?visit.completed.filter(x=>typeof x==='string').slice(-100):[],skipped:Array.isArray(visit.skipped)?visit.skipped.filter(x=>typeof x==='string').slice(-100):[],dismissed:visit.dismissed===true,shown:visit.shown===true,days:retainedDays(stored.days)};
    return stateRef.current;
  }
  const state=load();
  function save(next) {
    stateRef.current=next;
    try{writeRatingState(window.sessionStorage,visitKey,{completed:next.completed,skipped:next.skipped,dismissed:next.dismissed,shown:next.shown});writeRatingState(window.localStorage,dayStorageKey,{days:next.days});}catch{}
    render(n=>n+1);
  }
  useEffect(()=>{
    if(userId){try{writeRatingState(window.localStorage,dayStorageKey,{days:stateRef.current.days});}catch{}}
    if(!eligible||!userId||!cards.length||stateRef.current.shown) return;
    save({...stateRef.current,shown:true});
    trackEvent('rating_feed_viewed');
  },[eligible,userId,cards.length]);
  const starter=eligible&&!votedIds?.size&&!state.dismissed?demoStarter(cards,votedIds,userId):null;
  function moveTo(card) {
    if(!card)return;
    const element=document.querySelector(`article[data-post-id="${card.id}"]`);
    scrollFeedCardIntoView(element);
  }
  function next(card,skip=false) {
    const current=stateRef.current;
    const skipped=skip?[...new Set([...current.skipped,card.id])].slice(-100):current.skipped;
    if(skip){save({...current,skipped});if(eligible)trackEvent('rating_skipped');}
    const target=nextUnrated(cards,card.id,votedIds,skipped,userId);
    if(target){setNotice(false);moveTo(target);}else setNotice(true);
  }
  async function vote(value,card) {
    const owner=userId;
    const result=await onVote(value,card);
    if(!result?.ok||!result.server||!eligible||ownerRef.current!==owner)return;
    const current=stateRef.current;
    const updated=confirmedRating(current,card.id);
    if(updated===current)return;
    const returning=current.days.length>0&&!current.days.includes(dayKey());
    save(updated);trackEvent('rating_vote_saved');
    if(returning)trackEvent('rating_returned');
    if(updated.completed.length===3)trackEvent('rating_session_completed');
  }
  return {starter,state,notice,hasMore,weekDays:weekParticipation(state.days),vote,next,start(){if(!starter)return;trackEvent('rating_prompt_started');save({...stateRef.current,dismissed:true});moveTo(starter);},dismiss(){save({...stateRef.current,dismissed:true});}};
}

/** Optional, compact guidance; never replaces the feed or gates another action. */
export default function RatingParticipation({ locale, participation:p }) {
  const en=locale==='en';const count=p.state.completed.length;
  if(!p.starter&&!count&&!p.weekDays&&!p.notice)return null;
  return <aside data-no-translate className="mx-4 mb-1.5 flex shrink-0 flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-[#d9d4c9] bg-[#fbf9f4] px-3 py-2 text-[#1b1c19]" aria-label={en?'Your participation':'내 평가 참여'}>
    <div className="min-w-0 flex-1 text-[11px] leading-relaxed" aria-live="polite">{p.starter?<><strong>{en?'One photo. Your impression.':'사진 한 장, 내 느낌대로.'}</strong><p className="text-[10px] text-[#66686d]">{en?'No right answer. Choose what feels right to you.':'정답은 없어요. 내 느낌대로 선택하세요'}</p></>:count?<><strong>{count===1?(en?'Your first opinion this visit is saved!':'이번 방문의 첫 의견이 반영됐어요!'):count>=3?(en?'Three opinions saved. Thank you!':'의견 3개가 반영됐어요. 고마워요!'):(en?'Your opinion is saved.':'의견이 반영됐어요.')}</strong><p className="text-[10px] text-[#66686d]">{count<3?(en?`${count}/3 this visit · Continuing is optional.`:`이번 방문 ${count}/3 · 더 참여해도, 여기서 쉬어도 좋아요.`):(en?'Keep going whenever you like.':'원할 때 계속 참여할 수 있어요.')}</p></>:null}{p.weekDays>0&&<p className="text-[10px] text-[#66686d]">{en?`You participated on ${p.weekDays} day${p.weekDays===1?'':'s'} this week on this browser.`:`이 브라우저에서 이번 주 ${p.weekDays}일 참여했어요.`}</p>}{p.notice&&<p className="text-[10px] text-[#66686d]">{p.hasMore?(en?'Scroll down for more photos.':'아래로 내려 더 많은 사진을 볼 수 있어요.'):(en?'No more unrated photos in this list. Try another category.':'현재 목록을 다 봤어요. 다른 카테고리도 살펴보세요.')}</p>}</div>
    {p.starter&&<><button type="button" onClick={p.start} className="min-h-9 shrink-0 rounded-full border border-[#d94c70]/60 px-2.5 py-1 text-[10px] font-bold text-[#a22d50]">{en?'View demo photo':'데모 사진 보기'}</button><button type="button" onClick={p.dismiss} aria-label={en?'Dismiss for this visit':'이번 방문 안내 닫기'} className="min-h-9 px-2 text-xs text-[#66686d]">×</button></>}
  </aside>;
}
