import { useEffect, useRef, useState } from 'react';
import SurfaceCard from '../../components/ui/SurfaceCard.jsx';
import { canSubmitHandle, getPublicHandle, normalizeHandle } from '../../services/profileService.js';
import { sortPostsNewestFirst } from './profileOrdering.js';

/** 정의: 개인 업로드 요약, 투표 지표, 내 게시물 관리 행동을 제공하는 프로필 화면이다. */
export default function ProfileView({ locale = 'ko', cards, profileCards, scrapCards, categories, savedPostIds, profile, profileLoading, profileNotice, isAuthenticated, blockedMembers = [], onCheckHandle, onLoadHandleSuggestions, onSaveHandle, onDelete, onRemoveScrap, onOpenScrap, onUpload, onUnblock, onSignOut }) {
  const [editingHandle, setEditingHandle] = useState(false);
  const mine = sortPostsNewestFirst((profileCards ?? cards).filter((card) => card.isMyUpload));
  const scraps = scrapCards ?? cards.filter((card) => savedPostIds?.has(card.id));
  const votes = mine.reduce((sum, card) => sum + (card.evaluationType === 'NUMERIC_AGE' ? card.ageVoteCount ?? 0 : (card.yesVotes ?? 0) + (card.noVotes ?? 0)), 0);
  const yes = mine.reduce((sum, card) => sum + (card.yesVotes ?? 0), 0);
  const approval = votes ? Math.round((yes / votes) * 100) : 0;
  const displayHandle = getPublicHandle(profile);
  const handleReady = Boolean(displayHandle);
  function isolateProfileTouch(event) {
    if (event.pointerType === 'touch') event.stopPropagation();
  }
  function beginHandleEdit(event) {
    event?.stopPropagation();
    setEditingHandle(true);
  }
  function beginHandleEditFromTouch(event) {
    if (event.pointerType !== 'touch') return;
    event.preventDefault();
    beginHandleEdit(event);
  }
  async function saveHandle(handle) {
    const result = await onSaveHandle(handle);
    if (result.ok) setEditingHandle(false);
    return result;
  }
  return <section className="editorial-profile w-full pb-3 pt-1">
    {profileNotice && <div role="status" className="mb-3 flex items-start gap-2 rounded-lg border border-[#c52a52]/45 bg-[#c52a52]/10 p-3 text-[11px] leading-relaxed text-slate-200"><span className="material-symbols-outlined mt-0.5 text-base text-[#e06b89]" aria-hidden="true">info</span><p>{profileNotice}</p></div>}
    {isAuthenticated && !profileLoading && (!handleReady || editingHandle) && <HandleSetup locale={locale} profileId={profile?.id} initialHandle={displayHandle ?? ''} isEditing={handleReady} onCheck={onCheckHandle} onLoadSuggestions={onLoadHandleSuggestions} onSave={saveHandle} onCancel={() => setEditingHandle(false)} />}
    <SurfaceCard as="article" className="mb-4 p-4"><div className="flex items-center gap-3.5"><div className="relative"><img src={cards[0]?.imageUrl} alt="내 프로필" className="media-protected h-14 w-14 rounded-full border-2 border-[#c5a059] object-cover" draggable="false" onContextMenu={(event) => event.preventDefault()} onDragStart={(event) => event.preventDefault()} /><span className="absolute bottom-0 right-0 flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 border-background bg-[#c5a059]"><span className="material-symbols-outlined text-[8px] font-bold text-white">check</span></span></div><div className="flex min-w-0 flex-1 items-start justify-between gap-3"><div className="min-w-0"><h1 className="flex flex-wrap items-center gap-1.5 font-headline text-lg font-bold text-white">{displayHandle ? `@${displayHandle}` : (locale === 'en' ? 'Set your public ID' : '공개 아이디 설정 필요')} <span className="material-symbols-outlined text-sm text-cyan-glow">verified</span></h1><p className="text-[11px] text-slate-400">오늘의 룩과 일상의 순간을 기록하고 있어요.</p><div className="mt-1 flex items-center gap-1.5"><span className="rounded border border-[#c5a059]/50 bg-[#f9f7f2] px-1.5 py-0.5 font-mono text-[9px] text-cyan-glow">CURATOR</span><span className="font-mono text-[10px] text-slate-400">FACt.Smack Score: <strong className="text-white">94.6</strong></span></div></div>{isAuthenticated && handleReady && !editingHandle && <button type="button" onPointerDown={isolateProfileTouch} onPointerUp={beginHandleEditFromTouch} onPointerCancel={isolateProfileTouch} onClick={beginHandleEdit} className="min-h-9 shrink-0 rounded-md border border-[#c52a52]/55 px-3 text-xs font-bold text-[#c52a52] hover:bg-[#c52a52]/10">{locale === 'en' ? 'Change' : '변경'}</button>}</div></div><div className="mt-3 grid grid-cols-3 gap-2 border-t border-surface-container-high pt-3"><Metric value={mine.length} label="내 업로드" /><Metric value={votes.toLocaleString()} label="받은 투표" color="text-cyan-glow" /><Metric value={`${approval}%`} label="평균 호감도" color="text-[#735c00]" /></div></SurfaceCard>
    <div className="mb-2.5 flex items-center justify-between"><h2 className="font-headline text-sm font-bold text-white">내가 업로드한 사진 분석</h2><button type="button" onClick={onUpload} className="flex items-center gap-0.5 text-sm font-bold text-cyan-glow"><span className="material-symbols-outlined text-base">add</span>새로 업로드</button></div>
    <div className="flex flex-col gap-2.5">{mine.length ? mine.map((card) => <PostRow key={card.id} card={card} category={categories[card.category]} onDelete={() => onDelete(card.id)} />) : <p className="rounded-xl border border-surface-container-high bg-surface-container-low p-6 text-center text-xs text-slate-400">아직 업로드한 사진이 없습니다.</p>}</div>
    <section className="mt-6" aria-labelledby="scraps-heading"><div className="mb-2.5 flex items-center justify-between"><h2 id="scraps-heading" className="font-headline text-sm font-bold text-white">{locale === 'en' ? 'Scraps' : '스크랩'}</h2><span className="font-mono text-[10px] text-slate-400">{locale === 'en' ? `Private · ${scraps.length}` : `비공개 · ${scraps.length}`}</span></div><div className="flex flex-col gap-2.5">{scraps.length ? scraps.map((card) => <ScrapRow key={card.id} locale={locale} card={card} category={categories[card.category]} onRemove={() => onRemoveScrap(card.id)} onOpen={onOpenScrap} />) : <p className="rounded-xl border border-surface-container-high bg-surface-container-low p-5 text-center text-xs text-slate-400">{locale === 'en' ? 'No saved posts yet.' : '저장한 게시물이 없습니다.'}</p>}</div></section>
    {isAuthenticated && <section className="profile-account-actions mt-7 border-t border-surface-container-high pt-3"><div className="flex items-center justify-between gap-3"><div className="min-w-0">{blockedMembers.length ? <details><summary className="cursor-pointer list-none text-[10px] text-slate-400"><span className="material-symbols-outlined mr-1 align-[-2px] text-[12px]">person_off</span>{locale === 'en' ? `Blocked accounts ${blockedMembers.length}` : `차단한 계정 ${blockedMembers.length}`}</summary><div className="mt-2 flex flex-col gap-1.5">{blockedMembers.map((member) => <div key={member.id} className="flex min-w-0 items-center gap-2"><span className="min-w-0 flex-1 truncate text-[10px] text-slate-300">{member.author ? `@${member.author}` : (locale === 'en' ? 'Blocked account' : '차단한 계정')}</span><button type="button" onClick={() => onUnblock(member.id)} className="shrink-0 text-[10px] font-bold text-cyan-glow underline underline-offset-2">{locale === 'en' ? 'Unblock' : '차단 해제'}</button></div>)}</div></details> : <p className="text-[10px] text-slate-500">{locale === 'en' ? 'No blocked accounts' : '차단한 계정 없음'}</p>}</div><button type="button" onClick={onSignOut} className="profile-account-actions__sign-out">{locale === 'en' ? 'Sign out' : '로그아웃'}</button></div></section>}
  </section>;
}

/** Captures the one public identifier required before a member can publish. */
function HandleSetup({ locale, profileId, initialHandle = '', isEditing = false, onCheck, onLoadSuggestions, onSave, onCancel }) {
  const inputRef = useRef(null);
  const [handle, setHandle] = useState(initialHandle);
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState(null);
  const [suggestions, setSuggestions] = useState([]);

  useEffect(() => {
    let active = true;
    onLoadSuggestions?.(profileId).then((result) => { if (active && result?.ok) setSuggestions(result.data.filter((item) => item.available)); });
    return () => { active = false; };
  }, [profileId, onLoadSuggestions]);

  useEffect(() => {
    if (!handle) { setAvailable(null); return undefined; }
    let active = true;
    const timer = window.setTimeout(async () => {
      setChecking(true);
      const result = await onCheck(handle);
      if (active) { setAvailable(result.ok ? result.data.available : null); setChecking(false); }
    }, 350);
    return () => { active = false; window.clearTimeout(timer); };
  }, [handle, onCheck]);

  function chooseSuggestion(value) { setHandle(normalizeHandle(value)); setNotice(''); }
  function isolateTouch(event) {
    if (event.pointerType === 'touch') event.stopPropagation();
  }
  function focusHandleInput(event) {
    isolateTouch(event);
    // Explicitly focus after a mobile pointerdown so the root tab gesture can
    // never leave a public-ID field visually tappable but keyboard-inactive.
    window.requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }));
  }
  async function submit(event) {
    event.preventDefault();
    if (!canSubmitHandle({ handle, saving, checking, available })) {
      if (available === false) setNotice(locale === 'en' ? 'Choose an available public ID.' : '사용 가능한 공개 아이디를 선택해 주세요.');
      return;
    }
    setSaving(true);
    try {
      const result = await onSave(handle);
      if (!result?.ok) setNotice(result?.message ?? (locale === 'en' ? 'Your public ID could not be saved. Please try again.' : '공개 아이디를 저장하지 못했어요. 다시 시도해 주세요.'));
    } catch {
      setNotice(locale === 'en' ? 'Your public ID could not be saved. Please try again.' : '공개 아이디를 저장하지 못했어요. 다시 시도해 주세요.');
    } finally {
      setSaving(false);
    }
  }
  return <SurfaceCard as="form" onSubmit={submit} onPointerDown={isolateTouch} onPointerUp={isolateTouch} onPointerCancel={isolateTouch} className="mb-4 border-[#c52a52]/45 p-3.5"><div className="flex items-start justify-between gap-2"><div className="flex items-start gap-2"><span className="material-symbols-outlined mt-0.5 text-lg text-[#c52a52]">alternate_email</span><div><h2 className="font-headline text-sm font-bold text-white">{isEditing ? (locale === 'en' ? 'Change your public ID' : '공개 아이디 변경') : (locale === 'en' ? 'Set your public ID' : '공개 아이디를 설정해 주세요')}</h2><p className="mt-0.5 text-[10px] leading-relaxed text-slate-400">{locale === 'en' ? 'Your email stays private. This ID is shown on your posts.' : '이메일은 공개되지 않으며, 이 아이디가 게시물에 표시됩니다.'}</p></div></div>{isEditing && <button type="button" onClick={onCancel} className="shrink-0 text-[10px] font-semibold text-slate-400 underline underline-offset-2">{locale === 'en' ? 'Cancel' : '취소'}</button>}</div>{suggestions.length > 0 && <div className="mt-3"><p className="mb-1.5 text-[10px] font-semibold text-slate-400">{locale === 'en' ? 'Pick a starter ID' : '추천 아이디에서 골라 보세요'}</p><div className="flex flex-wrap gap-1.5">{suggestions.map((item) => <button key={item.handle} type="button" onClick={() => chooseSuggestion(item.handle)} className={`rounded-full border px-2 py-1 font-mono text-[10px] transition-colors ${handle === item.handle ? 'border-[#c52a52] bg-[#c52a52]/15 text-[#f487a3]' : 'border-surface-container-high text-slate-300 hover:border-[#c52a52]/70'}`}>@{item.handle}</button>)}</div></div>}<div className="mt-3 flex gap-2"><label className={`flex min-w-0 flex-1 items-center rounded-md border bg-surface-container px-2.5 ${available === true ? 'border-[#4ca878]' : available === false ? 'border-[#e06b89]' : 'border-surface-container-high'}`}><span className="text-sm text-slate-500">@</span><input ref={inputRef} autoFocus={isEditing} required value={handle} onPointerDown={focusHandleInput} onChange={(event) => { setHandle(normalizeHandle(event.target.value)); setAvailable(null); setNotice(''); }} maxLength="30" placeholder="my_look" className="min-w-0 flex-1 bg-transparent py-2 text-xs text-white outline-none placeholder:text-slate-500" aria-describedby={notice ? 'handle-notice' : undefined} /></label><button type="submit" disabled={!canSubmitHandle({ handle, saving, checking, available })} className="shrink-0 rounded-md bg-[#c52a52] px-3 text-xs font-bold text-white disabled:opacity-55">{saving ? (locale === 'en' ? 'Saving...' : '저장 중...') : (locale === 'en' ? 'Save' : '저장')}</button></div><p className={`mt-1.5 text-[9px] ${available === true ? 'text-[#69c593]' : available === false ? 'text-[#e06b89]' : 'text-slate-500'}`}>{checking ? (locale === 'en' ? 'Checking availability...' : '사용 가능 여부 확인 중...') : available === true ? (locale === 'en' ? 'This ID is available.' : '사용 가능한 아이디예요.') : available === false ? (locale === 'en' ? 'This ID is unavailable or invalid.' : '이미 사용 중이거나 사용할 수 없는 아이디예요.') : (locale === 'en' ? '3–30 lower-case letters, numbers, or underscores.' : '영문 소문자·숫자·밑줄 3~30자')}</p>{notice && <p id="handle-notice" role="alert" className="mt-1.5 text-[10px] text-[#e06b89]">{notice}</p>}</SurfaceCard>;
}

/** 정의: 프로필 요약에 표시되는 하나의 수치와 레이블 단위다. */
function Metric({ value, label, color = 'text-white' }) { return <div className="rounded-md bg-[#f5f3ee] p-2 text-center"><strong className={`block font-headline text-base font-bold ${color}`}>{value}</strong><span className="font-mono text-[9px] uppercase text-slate-400">{label}</span></div>; }
/** 정의: 내 게시물의 카테고리별 평가 요약과 삭제 행동을 보여 주며 실제 나이는 어떤 목록에도 노출하지 않는다. */
function PostRow({ card, category, onDelete }) { const isAge = card.evaluationType === 'NUMERIC_AGE'; const total = isAge ? card.ageVoteCount : card.yesVotes + card.noVotes; const yesRate = Math.round((card.yesVotes / Math.max(total, 1)) * 100); const noRate = 100 - yesRate; return <SurfaceCard as="article" className="flex items-center gap-3 p-2.5"><Media card={card} /><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2 text-[10px]"><span style={{ color: category.color }}>{category.label}</span><span className="truncate text-slate-400">@{card.author}</span></div><strong className="mt-1 block truncate font-headline text-sm text-white">{card.question.replace('\n', ' ')}</strong>{isAge ? <div className="mt-1.5 flex items-center justify-between"><span className="font-mono text-[10px]" style={{ color: category.color }}>평균 예상 {card.ageEstimate.toFixed(1)}세</span><span className="text-[9px] text-slate-500">주관적 평가</span></div> : <div className="mt-1.5"><div className="mb-1 flex items-center justify-between font-mono text-[9px]"><span style={{ color: category.color }}>호감 {yesRate}%</span><span className="text-[#9b5c55]">비호감 {noRate}%</span></div><div className="flex h-1 overflow-hidden rounded-full bg-slate-800"><span style={{ width: `${yesRate}%`, backgroundColor: category.color }} /><span className="bg-[#b6847c]" style={{ width: `${noRate}%` }} /></div></div>}<small className="mt-1 block text-[10px] text-slate-500">유효 평가 {total.toLocaleString()}명</small></div><button type="button" onClick={onDelete} className="text-sm font-bold text-[#9b5c55]">삭제</button></SurfaceCard>; }
/** 정의: 계정 본인에게만 보이는 Scraps 목록 항목이며, 접근 불가 게시물은 서버 RLS·삭제 cascade로 제외된다. */
function ScrapRow({ locale, card, category, onRemove, onOpen }) {
  const open = () => onOpen?.(card);
  const handleKeyDown = (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    open();
  };
  return <SurfaceCard as="article" role={onOpen ? 'button' : undefined} tabIndex={onOpen ? 0 : undefined} onClick={onOpen ? open : undefined} onKeyDown={onOpen ? handleKeyDown : undefined} className={`flex items-center gap-3 p-2.5 ${onOpen ? 'cursor-pointer text-left' : ''}`}><Media card={card} /><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2 text-[10px]"><span style={{ color: category.color }}>{category.label}</span><span className="truncate text-slate-400">@{card.author}</span></div><strong className="mt-1 block truncate font-headline text-sm text-white">{card.question.replace('\n', ' ')}</strong><small className="mt-1 block text-[10px] text-slate-500">{locale === 'en' ? 'Only visible to you' : '나만 볼 수 있는 스크랩'}</small></div><button type="button" onClick={(event) => { event.stopPropagation(); onRemove(); }} onKeyDown={(event) => event.stopPropagation()} aria-label={locale === 'en' ? 'Remove from Scraps' : '스크랩에서 제거'} className="rounded-md border border-[#c4c6cd] px-2 py-1 text-[11px] font-bold text-[#74777d]">{locale === 'en' ? 'Remove' : '제거'}</button></SurfaceCard>;
}
/** 정의: 프로필 목록에서 사진·동영상 미디어를 공통 썸네일로 렌더링한다. */
function Media({ card }) { const protectMedia = (event) => event.preventDefault(); return card.mediaType === 'video' ? <video className="media-protected h-14 w-14 shrink-0 rounded-md object-cover" src={card.imageUrl} muted playsInline draggable="false" onContextMenu={protectMedia} onDragStart={protectMedia} /> : <img className="media-protected h-14 w-14 shrink-0 rounded-md object-cover" src={card.imageUrl} alt="" draggable="false" onContextMenu={protectMedia} onDragStart={protectMedia} />; }
