import { useEffect, useState } from 'react';
import SurfaceCard from '../../components/ui/SurfaceCard.jsx';

/** 정의: 개인 업로드 요약, 투표 지표, 내 게시물 관리 행동을 제공하는 프로필 화면이다. */
export default function ProfileView({ locale = 'ko', cards, categories, savedPostIds, profile, profileLoading, isAuthenticated, onCheckHandle, onLoadHandleSuggestions, onSaveHandle, onDelete, onRemoveScrap, onUpload, onSignOut }) {
  const mine = cards.filter((card) => card.isMyUpload);
  const scraps = cards.filter((card) => savedPostIds?.has(card.id));
  const votes = mine.reduce((sum, card) => sum + (card.evaluationType === 'NUMERIC_AGE' ? card.ageVoteCount ?? 0 : (card.yesVotes ?? 0) + (card.noVotes ?? 0)), 0);
  const yes = mine.reduce((sum, card) => sum + (card.yesVotes ?? 0), 0);
  const approval = votes ? Math.round((yes / votes) * 100) : 0;
  const handleReady = Boolean(profile?.handle && !profile.handle.startsWith('member_'));
  return <section className="editorial-profile w-full pb-3 pt-1">
    {isAuthenticated && !profileLoading && !handleReady && <HandleSetup locale={locale} profileId={profile?.id} onCheck={onCheckHandle} onLoadSuggestions={onLoadHandleSuggestions} onSave={onSaveHandle} />}
    <SurfaceCard as="article" className="mb-4 p-4"><div className="flex items-center gap-3.5"><div className="relative"><img src={cards[0]?.imageUrl} alt="내 프로필" className="h-14 w-14 rounded-full border-2 border-[#c5a059] object-cover" /><span className="absolute bottom-0 right-0 flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 border-background bg-[#c5a059]"><span className="material-symbols-outlined text-[8px] font-bold text-white">check</span></span></div><div className="flex-1"><h1 className="flex items-center gap-1.5 font-headline text-lg font-bold text-white">@today_sora <span className="material-symbols-outlined text-sm text-cyan-glow">verified</span></h1><p className="text-[11px] text-slate-400">오늘의 룩과 일상의 순간을 기록하고 있어요.</p><div className="mt-1 flex items-center gap-1.5"><span className="rounded border border-[#c5a059]/50 bg-[#f9f7f2] px-1.5 py-0.5 font-mono text-[9px] text-cyan-glow">CURATOR</span><span className="font-mono text-[10px] text-slate-400">FACt.Smack Score: <strong className="text-white">94.6</strong></span></div></div></div><div className="mt-3 grid grid-cols-3 gap-2 border-t border-surface-container-high pt-3"><Metric value={mine.length} label="내 업로드" /><Metric value={votes.toLocaleString()} label="받은 투표" color="text-cyan-glow" /><Metric value={`${approval}%`} label="평균 호감도" color="text-[#735c00]" /></div></SurfaceCard>
    <div className="mb-2.5 flex items-center justify-between"><h2 className="font-headline text-sm font-bold text-white">내가 업로드한 사진 분석</h2><button type="button" onClick={onUpload} className="flex items-center gap-0.5 text-sm font-bold text-cyan-glow"><span className="material-symbols-outlined text-base">add</span>새로 업로드</button></div>
    <div className="flex flex-col gap-2.5">{mine.length ? mine.map((card) => <PostRow key={card.id} card={card} category={categories[card.category]} onDelete={() => onDelete(card.id)} />) : <p className="rounded-xl border border-surface-container-high bg-surface-container-low p-6 text-center text-xs text-slate-400">아직 업로드한 사진이 없습니다.</p>}</div>
    <section className="mt-6" aria-labelledby="scraps-heading"><div className="mb-2.5 flex items-center justify-between"><h2 id="scraps-heading" className="font-headline text-sm font-bold text-white">{locale === 'en' ? 'Scraps' : '스크랩'}</h2><span className="font-mono text-[10px] text-slate-400">{locale === 'en' ? `Private · ${scraps.length}` : `비공개 · ${scraps.length}`}</span></div><div className="flex flex-col gap-2.5">{scraps.length ? scraps.map((card) => <ScrapRow key={card.id} locale={locale} card={card} category={categories[card.category]} onRemove={() => onRemoveScrap(card.id)} />) : <p className="rounded-xl border border-surface-container-high bg-surface-container-low p-5 text-center text-xs text-slate-400">{locale === 'en' ? 'No saved posts yet.' : '저장한 게시물이 없습니다.'}</p>}</div></section>
    {isAuthenticated && <section className="profile-account-actions mt-7 border-t border-surface-container-high pt-3"><button type="button" onClick={onSignOut} className="profile-account-actions__sign-out">{locale === 'en' ? 'Sign out' : '로그아웃'}</button></section>}
  </section>;
}

/** Captures the one public identifier required before a member can publish. */
function HandleSetup({ locale, profileId, onCheck, onLoadSuggestions, onSave }) {
  const [handle, setHandle] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState(null);
  const [suggestions, setSuggestions] = useState([]);

  useEffect(() => {
    let active = true;
    onLoadSuggestions(profileId).then((result) => { if (active && result.ok) setSuggestions(result.data.filter((item) => item.available)); });
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

  function chooseSuggestion(value) { setHandle(value); setNotice(''); }
  async function submit(event) {
    event.preventDefault();
    if (saving || checking || available !== true) {
      if (available === false) setNotice(locale === 'en' ? 'Choose an available public ID.' : '사용 가능한 공개 아이디를 선택해 주세요.');
      return;
    }
    setSaving(true);
    const result = await onSave(handle);
    setSaving(false);
    if (!result.ok) setNotice(result.message);
  }
  return <SurfaceCard as="form" onSubmit={submit} className="mb-4 border-[#c52a52]/45 p-3.5"><div className="flex items-start gap-2"><span className="material-symbols-outlined mt-0.5 text-lg text-[#c52a52]">alternate_email</span><div><h2 className="font-headline text-sm font-bold text-white">{locale === 'en' ? 'Set your public ID' : '공개 아이디를 설정해 주세요'}</h2><p className="mt-0.5 text-[10px] leading-relaxed text-slate-400">{locale === 'en' ? 'Your email stays private. A public ID is required before uploading.' : '이메일은 공개되지 않으며, 업로드 전에 @아이디 설정이 필요합니다.'}</p></div></div>{suggestions.length > 0 && <div className="mt-3"><p className="mb-1.5 text-[10px] font-semibold text-slate-400">{locale === 'en' ? 'Pick a starter ID' : '추천 아이디에서 골라 보세요'}</p><div className="flex flex-wrap gap-1.5">{suggestions.map((item) => <button key={item.handle} type="button" onClick={() => chooseSuggestion(item.handle)} className={`rounded-full border px-2 py-1 font-mono text-[10px] transition-colors ${handle === item.handle ? 'border-[#c52a52] bg-[#c52a52]/15 text-[#f487a3]' : 'border-surface-container-high text-slate-300 hover:border-[#c52a52]/70'}`}>@{item.handle}</button>)}</div></div>}<div className="mt-3 flex gap-2"><label className={`flex min-w-0 flex-1 items-center rounded-md border bg-surface-container px-2.5 ${available === true ? 'border-[#4ca878]' : available === false ? 'border-[#e06b89]' : 'border-surface-container-high'}`}><span className="text-sm text-slate-500">@</span><input required value={handle} onChange={(event) => { setHandle(event.target.value); setNotice(''); }} maxLength="30" placeholder="my_look" className="min-w-0 flex-1 bg-transparent py-2 text-xs text-white outline-none placeholder:text-slate-500" aria-describedby={notice ? 'handle-notice' : undefined} /></label><button type="submit" disabled={saving || checking || available !== true} className="shrink-0 rounded-md bg-[#c52a52] px-3 text-xs font-bold text-white disabled:opacity-55">{saving ? (locale === 'en' ? 'Saving...' : '저장 중...') : (locale === 'en' ? 'Save' : '저장')}</button></div><p className={`mt-1.5 text-[9px] ${available === true ? 'text-[#69c593]' : available === false ? 'text-[#e06b89]' : 'text-slate-500'}`}>{checking ? (locale === 'en' ? 'Checking availability...' : '사용 가능 여부 확인 중...') : available === true ? (locale === 'en' ? 'This ID is available.' : '사용 가능한 아이디예요.') : available === false ? (locale === 'en' ? 'This ID is unavailable or invalid.' : '이미 사용 중이거나 사용할 수 없는 아이디예요.') : (locale === 'en' ? '3–30 lower-case letters, numbers, or underscores.' : '영문 소문자·숫자·밑줄 3~30자')}</p>{notice && <p id="handle-notice" role="alert" className="mt-1.5 text-[10px] text-[#e06b89]">{notice}</p>}</SurfaceCard>;
}

/** 정의: 프로필 요약에 표시되는 하나의 수치와 레이블 단위다. */
function Metric({ value, label, color = 'text-white' }) { return <div className="rounded-md bg-[#f5f3ee] p-2 text-center"><strong className={`block font-headline text-base font-bold ${color}`}>{value}</strong><span className="font-mono text-[9px] uppercase text-slate-400">{label}</span></div>; }
/** 정의: 내 게시물의 카테고리별 평가 요약과 삭제 행동을 보여 주며 실제 나이는 어떤 목록에도 노출하지 않는다. */
function PostRow({ card, category, onDelete }) { const isAge = card.evaluationType === 'NUMERIC_AGE'; const total = isAge ? card.ageVoteCount : card.yesVotes + card.noVotes; const yesRate = Math.round((card.yesVotes / Math.max(total, 1)) * 100); const noRate = 100 - yesRate; return <SurfaceCard as="article" className="flex items-center gap-3 p-2.5"><Media card={card} /><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2 text-[10px]"><span style={{ color: category.color }}>{category.label}</span><span className="truncate text-slate-400">@{card.author}</span></div><strong className="mt-1 block truncate font-headline text-sm text-white">{card.question.replace('\n', ' ')}</strong>{isAge ? <div className="mt-1.5 flex items-center justify-between"><span className="font-mono text-[10px]" style={{ color: category.color }}>평균 예상 {card.ageEstimate.toFixed(1)}세</span><span className="text-[9px] text-slate-500">주관적 첫인상</span></div> : <div className="mt-1.5"><div className="mb-1 flex items-center justify-between font-mono text-[9px]"><span style={{ color: category.color }}>호감 {yesRate}%</span><span className="text-[#9b5c55]">비호감 {noRate}%</span></div><div className="flex h-1 overflow-hidden rounded-full bg-slate-800"><span style={{ width: `${yesRate}%`, backgroundColor: category.color }} /><span className="bg-[#b6847c]" style={{ width: `${noRate}%` }} /></div></div>}<small className="mt-1 block text-[10px] text-slate-500">유효 평가 {total.toLocaleString()}명</small></div><button type="button" onClick={onDelete} className="text-sm font-bold text-[#9b5c55]">삭제</button></SurfaceCard>; }
/** 정의: 계정 본인에게만 보이는 Scraps 목록 항목이며, 접근 불가 게시물은 서버 RLS·삭제 cascade로 제외된다. */
function ScrapRow({ locale, card, category, onRemove }) { return <SurfaceCard as="article" className="flex items-center gap-3 p-2.5"><Media card={card} /><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2 text-[10px]"><span style={{ color: category.color }}>{category.label}</span><span className="truncate text-slate-400">@{card.author}</span></div><strong className="mt-1 block truncate font-headline text-sm text-white">{card.question.replace('\n', ' ')}</strong><small className="mt-1 block text-[10px] text-slate-500">{locale === 'en' ? 'Only visible to you' : '나만 볼 수 있는 스크랩'}</small></div><button type="button" onClick={onRemove} aria-label={locale === 'en' ? 'Remove from Scraps' : '스크랩에서 제거'} className="rounded-md border border-[#c4c6cd] px-2 py-1 text-[11px] font-bold text-[#74777d]">{locale === 'en' ? 'Remove' : '제거'}</button></SurfaceCard>; }
/** 정의: 프로필 목록에서 사진·동영상 미디어를 공통 썸네일로 렌더링한다. */
function Media({ card }) { return card.mediaType === 'video' ? <video className="h-14 w-14 shrink-0 rounded-md object-cover" src={card.imageUrl} muted playsInline /> : <img className="h-14 w-14 shrink-0 rounded-md object-cover" src={card.imageUrl} alt="" />; }
