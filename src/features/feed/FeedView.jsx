import { useEffect, useRef, useState } from 'react';
import { Bookmark } from 'lucide-react';
import { getSampleStatus, SAMPLE_STATUS } from '../../services/mockApi.js';

/** 정의: 카테고리 필터, 카드 제스처, 투표와 댓글 요약을 제공하는 콘텐츠 중심 피드 화면이다. */
export default function FeedView({ locale = 'ko', categories, cards, card, currentIndex, activeCategory, hasVoted, savedPostIds, onCategoryChange, onPrevious, onNext, onShuffle, onVote, onShare, onToggleSave, onBoost, onStartUpload, onAddComment }) {
  const [expandedComments, setExpandedComments] = useState(false);
  const [draft, setDraft] = useState('');
  const gestureStart = useRef(null);
  const wheelLocked = useRef(false);
  const [mediaIndex, setMediaIndex] = useState(0);
  const [carouselKick, setCarouselKick] = useState('');
  const [dragOffset, setDragOffset] = useState(0);
  const [isDraggingMedia, setIsDraggingMedia] = useState(false);
  const [feedMotion, setFeedMotion] = useState('');
  const [saveNotice, setSaveNotice] = useState('');
  const feedLocked = useRef(false);
  const categoryRailRef = useRef(null);
  const categoryDrag = useRef(null);
  useEffect(() => { setExpandedComments(false); setDraft(''); setMediaIndex(0); setSaveNotice(''); }, [card.id]);
  if (!card) return <section className="mt-4 rounded-xl border border-surface-container-high bg-surface-container-low p-6 text-center text-slate-400">표시할 사진이 없습니다.</section>;
  const theme = categories[card.category];
  const cardMedia = card.media?.length ? card.media : [{ id: `${card.id}-main`, type: card.mediaType ?? 'image', url: card.imageUrl, objectPosition: card.objectPosition }];
  const hasMultipleMedia = cardMedia.length > 1;
  const activeMedia = cardMedia[mediaIndex];
  const isAgeEvaluation = card.evaluationType === 'NUMERIC_AGE';
  const total = isAgeEvaluation ? card.ageVoteCount : card.yesVotes + card.noVotes;
  const yesPercent = isAgeEvaluation ? 0 : Math.round((card.yesVotes / total) * 100);
  const noPercent = 100 - yesPercent;
  const isSaved = savedPostIds?.has(card.id) ?? false;

  async function toggleSavedCard() {
    const result = await onToggleSave(card.id);
    if (result?.ok) setSaveNotice(result.saved ? (locale === 'en' ? 'Saved to Scraps' : '스크랩에 저장됨') : (locale === 'en' ? 'Removed from Scraps' : '스크랩에서 제거됨'));
  }

  /** 정의: 카드 표면의 시작 좌표를 기록해 가로 앨범·세로 피드 제스처를 구분한다. @param {PointerEvent} event 포인터 이벤트 */
  function startCardGesture(event) {
    if (event.target.closest('button, input, textarea')) return;
    gestureStart.current = { x: event.clientX, y: event.clientY, pointerType: event.pointerType };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }
  /** 정의: 가로 이동 거리를 중앙 사진에 반영해 손으로 잡고 넘기는 앨범 전환 감각을 제공한다. @param {PointerEvent} event 포인터 이벤트 */
  function moveCardGesture(event) {
    if (!gestureStart.current || cardMedia.length < 2) return;
    const deltaX = event.clientX - gestureStart.current.x;
    const deltaY = event.clientY - gestureStart.current.y;
    if (Math.abs(deltaX) <= Math.abs(deltaY)) return;
    setIsDraggingMedia(true);
    setDragOffset(Math.max(-82, Math.min(82, deltaX)));
  }
  /** 정의: 가로 스와이프는 같은 카드의 미디어를, 세로 터치 스와이프는 이전·다음 카드를 표시한다. @param {PointerEvent} event 포인터 이벤트 */
  function finishCardGesture(event) {
    if (!gestureStart.current) return;
    const start = gestureStart.current;
    gestureStart.current = null;
    const deltaX = event.clientX - start.x;
    const deltaY = event.clientY - start.y;
    const resetDrag = () => { setIsDraggingMedia(false); setDragOffset(0); };
    if (Math.max(Math.abs(deltaX), Math.abs(deltaY)) < 42) { resetDrag(); return; }
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      const direction = deltaX < 0 ? 'left' : 'right';
      setCarouselKick(`media-carousel--kick-${direction}`);
      setIsDraggingMedia(false);
      setDragOffset(deltaX < 0 ? -150 : 150);
      window.setTimeout(() => {
        setMediaIndex((index) => Math.max(0, Math.min(cardMedia.length - 1, index + (deltaX < 0 ? 1 : -1))));
        setDragOffset(deltaX < 0 ? 42 : -42);
        window.requestAnimationFrame(() => setDragOffset(0));
      }, 130);
      window.setTimeout(() => setCarouselKick(''), 300);
      return;
    }
    resetDrag();
    if (start.pointerType !== 'mouse') {
      navigateFeed(deltaY < 0 ? 1 : -1);
    }
  }
  /** 정의: 데스크톱 휠의 세로 이동으로 피드를 한 장씩 안전하게 순환한다. @param {WheelEvent} event 마우스 휠 이벤트 */
  function moveCardByWheel(event) {
    if (Math.abs(event.deltaY) < 12 || wheelLocked.current) return;
    event.preventDefault();
    wheelLocked.current = true;
    navigateFeed(event.deltaY > 0 ? 1 : -1);
    window.setTimeout(() => { wheelLocked.current = false; }, 420);
  }

  /** 정의: 현재 피드를 먼저 부드럽게 밀어낸 뒤 다음 또는 이전 카드를 진입시키는 세로 탐색 전환 제어다. @param {1|-1} direction 1은 다음, -1은 이전 */
  function navigateFeed(direction) {
    if (feedLocked.current) return;
    feedLocked.current = true;
    setFeedMotion(direction === 1 ? 'feed-card--exit-up' : 'feed-card--exit-down');
    window.setTimeout(() => {
      if (direction === 1) onNext(); else onPrevious();
      setFeedMotion(direction === 1 ? 'feed-card--enter-up' : 'feed-card--enter-down');
      window.setTimeout(() => { setFeedMotion(''); feedLocked.current = false; }, 310);
    }, 150);
  }

  /** 정의: PC에서도 스크롤바 없이 카테고리 탭 띠를 잡아 좌우로 탐색한다. */
  function startCategoryDrag(event) { categoryDrag.current = { x: event.clientX, scrollLeft: categoryRailRef.current?.scrollLeft ?? 0 }; }
  function moveCategoryDrag(event) { if (!categoryDrag.current || !categoryRailRef.current) return; categoryRailRef.current.scrollLeft = categoryDrag.current.scrollLeft - (event.clientX - categoryDrag.current.x); }
  function endCategoryDrag() { categoryDrag.current = null; }

  return <section className="editorial-feed relative flex h-full w-full min-h-0 flex-col items-center">
    <div ref={categoryRailRef} onPointerDown={startCategoryDrag} onPointerMove={moveCategoryDrag} onPointerUp={endCategoryDrag} onPointerCancel={endCategoryDrag} className="mb-0 flex w-full cursor-grab items-center gap-1 overflow-x-auto px-4 pb-1 no-scrollbar active:cursor-grabbing">
      <CategoryButton label="셔플" active={activeCategory === 'ALL'} color="#00f0ff" idleColor="#735c00" icon="shuffle" onClick={onShuffle} />
      {Object.entries(categories).map(([id, category]) => <CategoryButton key={id} label={category.label} active={activeCategory === id} color={category.color} onClick={() => onCategoryChange(id)} />)}
    </div>

    <div className={`media-carousel relative flex min-h-0 w-full flex-1 items-center ${carouselKick}`}>
    <article onPointerDown={startCardGesture} onPointerMove={moveCardGesture} onPointerUp={finishCardGesture} onPointerCancel={() => { gestureStart.current = null; setIsDraggingMedia(false); setDragOffset(0); }} onWheel={moveCardByWheel} className={`relative z-10 h-full min-h-0 w-full touch-none overflow-hidden rounded-xl border border-surface-container-high/60 bg-[#fbfaf7] shadow-2xl ${feedMotion}`}>
      {hasMultipleMedia && mediaIndex > 0 && <MediaPeek side="left" card={card} media={cardMedia[mediaIndex - 1]} onClick={() => setMediaIndex((index) => index - 1)} />}
      {hasMultipleMedia && mediaIndex < cardMedia.length - 1 && <MediaPeek side="right" card={card} media={cardMedia[mediaIndex + 1]} onClick={() => setMediaIndex((index) => index + 1)} />}
      <div className={`media-primary absolute ${cardMedia.length > 1 ? 'inset-y-2 left-3 right-3' : 'inset-0'} z-10 overflow-hidden ${isDraggingMedia ? 'media-primary--dragging' : ''}`} style={{ transform: `translateX(${dragOffset}px)` }}><CardMedia card={card} media={activeMedia} className="h-full w-full object-cover object-center brightness-[1.02] contrast-[1.03]" /></div>
      <div className={`absolute ${cardMedia.length > 1 ? 'inset-y-2 left-3 right-3' : 'inset-0'} z-10 bg-[linear-gradient(180deg,rgba(1,8,17,.62)_0%,rgba(1,8,17,.05)_32%,rgba(1,8,17,.12)_52%,rgba(1,8,17,.88)_100%)]`} />
      {hasMultipleMedia && <div className="media-card-photo-nav" aria-label="사진 탐색"><button type="button" onClick={() => setMediaIndex((index) => index - 1)} aria-label="이전 사진" className={`media-card-photo-nav__button media-card-photo-nav__button--left ${mediaIndex === 0 ? 'invisible' : ''}`}><span className="material-symbols-outlined">chevron_left</span></button><button type="button" onClick={() => setMediaIndex((index) => index + 1)} aria-label="다음 사진" className={`media-card-photo-nav__button media-card-photo-nav__button--right ${mediaIndex === cardMedia.length - 1 ? 'invisible' : ''}`}><span className="material-symbols-outlined">chevron_right</span></button></div>}
      <div className="scan-line absolute left-0 top-0 z-20 h-px w-full" style={{ backgroundColor: theme.color, boxShadow: `0 0 13px 2px ${theme.color}` }} />
      <div className="absolute left-0 top-0 z-30 flex w-full items-start justify-between px-4 pt-3"><div className="flex items-center gap-1 rounded-full border border-white/20 bg-black/35 px-2 py-0.5 shadow-lg backdrop-blur-sm"><span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ backgroundColor: theme.color, boxShadow: `0 0 8px ${theme.color}` }} /><span className="font-mono text-[8px] font-bold leading-none tracking-wide text-white">LIVE STREAM</span><span className="font-mono text-[8px] leading-none text-white/75">{card.timestamp}</span></div><UserBadge author={card.author} /></div>
      {hasMultipleMedia && <MediaProgress locale={locale} media={cardMedia} mediaIndex={mediaIndex} color={theme.color} onSelect={setMediaIndex} />}
      <div className="absolute left-0 top-0 z-30 flex w-full items-center px-4 pt-7"><CategoryBadge theme={theme} category={card.category} /></div>
      <div className="absolute right-3 top-1/2 z-30 flex -translate-y-1/2 flex-col gap-2"><div className="flex flex-col gap-2.5"><ArrowButton label="이전 카드" icon="expand_less" onClick={() => navigateFeed(-1)} /><ArrowButton label="다음 카드" icon="expand_more" onClick={() => navigateFeed(1)} /></div><ShareRailButton onClick={() => onShare(card)} /></div>
      <div className="card-details absolute bottom-0 left-0 z-20 flex w-full flex-col px-4 pb-2 pt-9"><div className="mb-2"><h1 className="feed-card__question whitespace-pre-line font-headline text-lg font-bold leading-snug text-white sm:text-xl">{card.question}</h1></div>
        {hasVoted ? isAgeEvaluation ? <AgeResult card={card} color={theme.color} onNext={() => navigateFeed(1)} onBoost={onBoost} onStartUpload={onStartUpload} /> : <Result yesPercent={yesPercent} noPercent={noPercent} total={total} color={theme.color} onNext={() => navigateFeed(1)} onBoost={onBoost} onStartUpload={onStartUpload} /> : isAgeEvaluation ? <AgeVotePanel card={card} color={theme.color} onVote={onVote} /> : <div className="flex w-full gap-2.5"><button type="button" onClick={() => onVote(true)} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border py-1 text-[13px] font-extrabold tracking-wider text-[#051424] active:scale-95" style={{ borderColor: theme.color, backgroundColor: theme.color }}>YES <span className="material-symbols-outlined text-[15px]">check_circle</span></button><button type="button" onClick={() => onVote(false)} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border bg-surface-container-low/70 py-1 text-[13px] font-bold tracking-wider active:scale-95" style={{ borderColor: `${theme.color}aa`, color: theme.color }}>NO <span className="material-symbols-outlined text-[15px]">cancel</span></button></div>}
        {card.commentsAllowed && <CommentPreview comments={card.comments ?? []} onExpand={() => setExpandedComments(true)} />}
        <SavedPostButton locale={locale} saved={isSaved} color={theme.color} notice={saveNotice} onToggle={toggleSavedCard} />
      </div>
    </article></div>
    {card.commentsAllowed && expandedComments && <CommentPanel card={card} media={activeMedia} comments={card.comments ?? []} draft={draft} onDraftChange={setDraft} onClose={() => setExpandedComments(false)} onSubmit={() => { onAddComment(card.id, draft); setDraft(''); }} />}
  </section>;
}

/** 정의: 현재 선택된 카테고리 상태를 보여 주고 필터 변경을 요청하는 버튼이다. */
function CategoryButton({ label, active, color, idleColor, icon, onClick }) { return <button type="button" onClick={onClick} className="flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-1 font-mono text-[11px] transition-all" style={active ? { color, borderColor: color, backgroundColor: `${color}1a`, fontWeight: 700 } : { color: idleColor ?? '#44474c', borderColor: idleColor ? `${idleColor}99` : '#c4c6cd', backgroundColor: '#ffffff', fontWeight: idleColor ? 700 : 400 }}>{icon && <span className="material-symbols-outlined text-[13px]">{icon}</span>}{label}</button>; }
/** 정의: 카드 위 카테고리 표기를 LIVE·사용자 표기와 같은 소형 밀도로 보여 주는 배지다. */
function CategoryBadge({ theme, category }) { return <div className="flex items-center gap-1 rounded-full border border-white/20 bg-black/35 px-2 py-0.5 shadow-lg backdrop-blur-sm"><span className="material-symbols-outlined text-[12px]" style={{ color: theme.color }}>{theme.icon}</span><span className="font-mono text-[8px] font-semibold leading-none uppercase tracking-wider text-white">{theme.feedLabel ?? category}</span></div>; }
/** 정의: 카드 위 작성자 핸들을 LIVE와 동일한 소형 반투명 배지로 보여 준다. */
function UserBadge({ author }) { return <div className="flex items-center gap-1 rounded-full border border-white/20 bg-black/35 py-0.5 pl-1 pr-2 shadow-lg backdrop-blur-sm"><span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary-container/80"><span className="material-symbols-outlined text-[11px] text-white">person</span></span><span className="font-mono text-[8px] font-semibold leading-none tracking-wide text-white">@{author}</span></div>; }
/** 정의: LIVE·작성자 배지와 같은 상단 오버레이 행 중앙에 다중 사진 진행 표시기를 둔다. */
function MediaProgress({ locale, media, mediaIndex, color, onSelect }) { return <div className="media-progress absolute left-1/2 top-3 z-30 flex h-[3px] -translate-x-1/2 gap-1" aria-label={locale === 'en' ? `${media.length} uploaded photos` : `등록된 사진 ${media.length}장`}>{media.map((item, index) => <button key={item.id} type="button" aria-label={locale === 'en' ? `View photo ${index + 1}` : `${index + 1}번째 사진 보기`} aria-current={mediaIndex === index ? 'true' : undefined} onClick={() => onSelect(index)} className="min-w-5 flex-1 rounded-full bg-white/25 p-0"><span className="block h-full rounded-full transition-colors" style={{ backgroundColor: mediaIndex === index ? color : 'transparent' }} /></button>)}</div>; }
/** 정의: 로그인 계정에만 저장되는 비공개 Scrap 제어다. */
function SavedPostButton({ locale, saved, color, notice, onToggle }) { const copy = locale === 'en' ? (saved ? { label: 'Saved', action: 'Remove from Scraps' } : { label: 'Save', action: 'Save to Scraps' }) : (saved ? { label: '저장됨', action: '스크랩에서 제거' } : { label: '저장', action: '스크랩에 저장' }); return <div className="saved-post-control relative ml-auto mt-1 flex min-h-11 items-center justify-end"><p role="status" aria-live="polite" className="saved-post-control__notice">{notice}</p><button type="button" onClick={onToggle} aria-pressed={saved} aria-label={copy.action} className="saved-post-control__button" style={saved ? { color, borderColor: `${color}cc`, backgroundColor: `${color}24` } : undefined}><Bookmark aria-hidden="true" size={17} strokeWidth={2.1} fill={saved ? 'currentColor' : 'none'} /><span>{copy.label}</span></button></div>; }
/** 정의: 사진 또는 동영상 카드 자산을 동일한 피드 미디어 규칙으로 렌더링한다. */
function CardMedia({ card, media, className, muted = false }) { const source = media ?? { type: card.mediaType ?? 'image', url: card.imageUrl, objectPosition: card.objectPosition }; return source.type === 'video' ? <video className={className} style={{ objectPosition: source.objectPosition ?? card.objectPosition }} src={source.url} autoPlay loop muted={muted || undefined} playsInline controls={!muted} aria-label={`${card.author}의 ${card.category} 동영상`} /> : <img className={className} style={{ objectPosition: source.objectPosition ?? card.objectPosition }} src={source.url} alt={`${card.author}의 ${card.category} 사진`} />; }
/** 정의: 다중 미디어 카드의 좌우 다음·이전 사진을 좁게 미리 보이고 해당 사진으로 이동시키는 제어다. */
function MediaPeek({ side, card, media, onClick }) { return <button type="button" aria-label={side === 'left' ? '이전 사진 미리보기' : '다음 사진 미리보기'} onClick={onClick} className={`media-peek media-peek--${side}`}><CardMedia card={card} media={media} className="h-full w-full object-cover" muted /></button>; }
/** 정의: 카드 이동을 위한 접근성 레이블 포함 화살표 버튼이다. */
function ArrowButton({ label, icon, onClick }) { return <button type="button" onClick={onClick} aria-label={label} className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/50 text-white shadow-md backdrop-blur active:scale-90"><span className="material-symbols-outlined text-xl">{icon}</span></button>; }
/** 정의: 공유 기능을 카드 탐색 제어와 같은 터치 영역으로 제공한다. */
function ShareRailButton({ onClick }) { return <button type="button" onClick={onClick} aria-label="이 피드 공유하기" title="공유하기" className="flex h-9 w-9 items-center justify-center rounded-full border border-[#D94C70]/60 bg-[#D94C70]/85 text-white shadow-[0_5px_14px_rgba(217,76,112,0.24)] transition-all duration-150 hover:bg-[#D94C70] active:scale-90"><span className="material-symbols-outlined text-[19px]">share</span></button>; }
/** 정의: 투표 완료 뒤 Result를 표본 상태별로 정직하게 표시하고 적격 상태에서만 Boost를 제안한다. */
function Result({ yesPercent, noPercent, total, color, onNext, onBoost, onStartUpload }) {
  const noColor = '#B42318';
  const sampleStatus = getSampleStatus(total);
  const canOfferBoost = sampleStatus === SAMPLE_STATUS.EARLY_SIGNAL || sampleStatus === SAMPLE_STATUS.BASE_RESULT;
  if (sampleStatus === SAMPLE_STATUS.INSUFFICIENT) return <ResultShell total={total} color={color} onNext={onNext} onStartUpload={onStartUpload}><p className="text-[11px] leading-relaxed text-white/80">아직 충분한 첫인상이 모이지 않았어요. 10명의 반응이 모이면 첫 경향을 알려드릴게요.</p></ResultShell>;
  return <ResultShell total={total} color={color} onNext={onNext} sampleStatus={sampleStatus} onBoost={canOfferBoost ? onBoost : undefined} onStartUpload={onStartUpload}><div className="mb-1 flex items-center justify-between font-mono text-xs font-bold"><span className="flex items-center gap-1" style={{ color }}><span className="material-symbols-outlined text-[14px]">thumb_up</span> YES {yesPercent}%</span><span className="flex items-center gap-1" style={{ color: noColor }}>NO {noPercent}% <span className="material-symbols-outlined text-[14px]">thumb_down</span></span></div><div className="flex h-2 w-full overflow-hidden rounded-full border border-[#101828] bg-slate-800"><span className="result-bar--yes" style={{ width: `${yesPercent}%`, backgroundColor: color }} /><span className="result-bar--no" style={{ width: `${noPercent}%`, backgroundColor: noColor }} /></div></ResultShell>;
}

/** 정의: 모든 평가 유형이 같은 표본 상태·다음 탐색·Boost 원칙을 공유하는 Result 외곽이다. */
function ResultShell({ total, color, sampleStatus, onBoost, onStartUpload, onNext, children }) {
  const label = sampleStatus === SAMPLE_STATUS.EARLY_SIGNAL ? '초기 경향' : sampleStatus === SAMPLE_STATUS.BASE_RESULT ? '현재 결과' : sampleStatus === SAMPLE_STATUS.EXPANDED_SAMPLE ? '확장 표본' : '표본 수집 중';
  return <div className="feed-result mb-2.5 rounded-xl border border-white/30 bg-[#061225]/42 p-2.5 shadow-[0_8px_24px_rgba(0,0,0,.18)] backdrop-blur-[1px]"><div className="feed-result__meta mb-1.5 flex items-center justify-between gap-2"><span className="font-mono text-[10px] font-bold" style={{ color }}>{label}</span><span className="font-mono text-[10px] text-white/80">유효 평가 {total.toLocaleString()}명</span></div>{children}<div className="feed-result__actions mt-1.5 flex items-center justify-between gap-2"><div className="feed-result__secondary flex items-center gap-2">{onBoost && <button type="button" onClick={onBoost} className="feed-result__boost rounded-md border px-1.5 py-0.5 text-[10px] font-bold" style={{ color, borderColor: `${color}aa`, backgroundColor: `${color}20` }}>100명까지 Boost · ₩1,000</button>}{onStartUpload && <button type="button" onClick={onStartUpload} className="feed-result__self text-[10px] font-semibold text-white/85 underline decoration-white/35 underline-offset-2">나도 평가받기</button>}</div><button type="button" onClick={onNext} className="feed-result__next flex items-center text-[11px] font-bold" style={{ color }}>다음 사진 <span className="material-symbols-outlined text-[13px]">arrow_downward</span></button></div></div>;
}

/** 정의: PERCEIVED_AGE의 업로더 지정 범위 안에서 슬라이더·± 버튼으로 한 살씩 예상 나이를 선택하는 평가 제어다. */
function AgeVotePanel({ card, color, onVote }) {
  const min = card.ageMin ?? 18;
  const max = card.ageMax ?? 99;
  const [selectedAge, setSelectedAge] = useState(() => Math.round(card.ageEstimate || (min + max) / 2));
  useEffect(() => setSelectedAge(Math.round(card.ageEstimate || (min + max) / 2)), [card.id, card.ageEstimate, min, max]);
  const changeAge = (value) => setSelectedAge(Math.min(max, Math.max(min, Number(value))));
  return <div className="age-vote-panel rounded-xl border border-white/30 bg-[#061225]/28 px-2.5 py-1.5 shadow-[0_4px_14px_rgba(0,0,0,.12)]"><p className="mb-1 text-center text-[10px] font-semibold leading-none text-white">몇 살로 보이나요?</p><div className="flex items-center gap-1.5"><button type="button" onClick={() => changeAge(selectedAge - 1)} disabled={selectedAge <= min} aria-label="예상 나이 한 살 낮추기" className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-white/35 text-white disabled:opacity-35"><span className="material-symbols-outlined text-[12px]">remove</span></button><span className="shrink-0 font-mono text-[10px] font-bold" style={{ color }}>{min}</span><input type="range" min={min} max={max} step="1" value={selectedAge} onChange={(event) => changeAge(event.target.value)} aria-label="예상 나이 선택" className="age-vote-slider min-w-0 flex-1" style={{ accentColor: color }} /><span className="shrink-0 font-mono text-[10px] font-bold" style={{ color }}>{max}</span><button type="button" onClick={() => changeAge(selectedAge + 1)} disabled={selectedAge >= max} aria-label="예상 나이 한 살 높이기" className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-white/35 text-white disabled:opacity-35"><span className="material-symbols-outlined text-[12px]">add</span></button><button type="button" onClick={() => onVote(selectedAge)} className="ml-0.5 shrink-0 rounded-md px-2 py-1 text-[10px] font-bold leading-none text-[#051424]" style={{ backgroundColor: color }}>선택</button></div><output className="mt-1 block pl-6 font-mono text-xs font-bold leading-none" style={{ color }}>{selectedAge}세</output></div>;
}

/** 정의: 숫자 평가 결과도 표본이 충분할 때만 평균을 현재 결과로 표현하고 실제 나이는 비공개로 유지한다. */
function AgeResult({ card, color, onNext, onBoost, onStartUpload }) {
  const total = card.ageVoteCount ?? 0;
  const sampleStatus = getSampleStatus(total);
  const canOfferBoost = sampleStatus === SAMPLE_STATUS.EARLY_SIGNAL || sampleStatus === SAMPLE_STATUS.BASE_RESULT;
  if (sampleStatus === SAMPLE_STATUS.INSUFFICIENT) return <ResultShell total={total} color={color} onNext={onNext} onStartUpload={onStartUpload}><p className="text-[11px] leading-relaxed text-white/80">아직 충분한 첫인상이 모이지 않았어요. 10명의 반응이 모이면 첫 경향을 알려드릴게요.</p></ResultShell>;
  return <ResultShell total={total} color={color} sampleStatus={sampleStatus} onBoost={canOfferBoost ? onBoost : undefined} onStartUpload={onStartUpload} onNext={onNext}><div className="flex items-end justify-between"><span><span className="block text-[10px] text-white/80">평균 예상 나이</span><strong className="font-mono text-2xl" style={{ color }}>{card.ageEstimate.toFixed(1)}<small className="ml-0.5 text-xs">세</small></strong></span><span className="text-right text-[10px] text-white/80">참여자의 주관적<br />첫인상이에요</span></div></ResultShell>;
}

/** 정의: 카드 위에 첫 댓글만 간결하게 보여 주고 전체 댓글 열기를 제공하는 요약 영역이다. */
function CommentPreview({ comments, onExpand }) {
  const comment = comments[0];
  return <div className="comment-preview relative mt-2 overflow-hidden bg-gradient-to-b from-transparent via-[#061225]/10 to-transparent px-1 py-1.5" aria-label="댓글 미리보기">
    <div className="absolute right-0 top-1/2 z-10 flex -translate-y-1/2 items-center gap-1"><button type="button" onClick={onExpand} aria-label="댓글 더 보기" className="flex items-center gap-0.5 px-1 text-[12px] font-bold text-cyan-glow"><span>더 보기</span><span className="material-symbols-outlined text-[16px]">more_horiz</span></button></div>
    {comment ? <p className="truncate pr-16 text-[13px] leading-5 text-white/90"><strong className="mr-1 text-cyan-50">@{comment.author}</strong>{comment.body}</p> : <p className="pr-16 text-[12px] text-slate-300/80">첫 번째 댓글을 남겨 보세요.</p>}
  </div>;
}

/** 정의: PC에서는 사진과 댓글을 나란히 보여 주는 게시물 상세 모달, 모바일에서는 확장 댓글 영역을 제공한다. */
function CommentPanel({ card, media, comments, draft, onDraftChange, onClose, onSubmit }) {
  const [visibleCount, setVisibleCount] = useState(10);
  const mediaItems = card.media?.length ? card.media : [media];
  const [mediaIndex, setMediaIndex] = useState(() => Math.max(0, mediaItems.findIndex((item) => item?.id === media?.id)));
  useEffect(() => setVisibleCount(10), [comments.length]);
  useEffect(() => setMediaIndex(Math.max(0, mediaItems.findIndex((item) => item?.id === media?.id))), [card.id, media?.id]);
  const visibleComments = comments.slice(0, visibleCount);
  const hasMore = comments.length > visibleCount;
  return <section className="comment-panel" role="dialog" aria-modal="true" aria-label="게시물 댓글 상세">
    <div className="comment-panel__dialog">
      <div className="comment-panel__sheet-heading"><span className="comment-panel__handle" aria-hidden="true" /><strong>댓글</strong></div>
      <button type="button" onClick={onClose} className="comment-panel__close" aria-label="댓글 상세 닫기"><span className="material-symbols-outlined">close</span></button>
      <div className="comment-panel__media"><CardMedia card={card} media={mediaItems[mediaIndex]} className="h-full w-full object-contain" muted />{mediaItems.length > 1 && <>{mediaIndex > 0 && <button type="button" onClick={() => setMediaIndex((index) => index - 1)} aria-label="이전 사진" className="comment-panel__media-nav comment-panel__media-nav--left"><span className="material-symbols-outlined">chevron_left</span></button>}{mediaIndex < mediaItems.length - 1 && <button type="button" onClick={() => setMediaIndex((index) => index + 1)} aria-label="다음 사진" className="comment-panel__media-nav comment-panel__media-nav--right"><span className="material-symbols-outlined">chevron_right</span></button>}<span className="comment-panel__media-count">{mediaIndex + 1} / {mediaItems.length}</span></>}</div>
      <div className="comment-panel__content">
        <header className="flex shrink-0 items-center gap-2 border-b border-[#e4e2dd] px-4 py-3"><Avatar author={card.author} /><div className="min-w-0 flex-1"><strong className="block truncate text-[13px] text-[#1b1c19]">@{card.author}</strong><span className="block truncate text-[10px] text-[#74777d]">{card.timestamp}</span></div><span className="material-symbols-outlined text-[19px] text-[#44474c]">more_horiz</span></header>
        <div className="comment-panel__comments">{visibleComments.length ? <><div className="mb-4 flex gap-2"><Avatar author={card.author} /><p className="min-w-0 text-xs leading-relaxed text-[#44474c]"><strong className="mr-1 text-[#1b1c19]">@{card.author}</strong>{card.question.replace('\n', ' ')}</p></div>{visibleComments.map((comment) => <div key={comment.id} className="mb-4"><div className="flex gap-2"><Avatar author={comment.author} /><p className="min-w-0 text-xs leading-relaxed text-[#44474c]"><strong className="mr-1 text-[#1b1c19]">@{comment.author}</strong>{comment.body}<span className="ml-1.5 font-mono text-[10px] text-[#8d8d87]">{comment.createdAt}</span></p></div>{comment.replies.map((reply) => <div key={reply.id} className="ml-7 mt-2 flex gap-2 border-l border-[#e4e2dd] pl-2"><Avatar author={reply.author} small /><p className="min-w-0 text-xs leading-relaxed text-[#55575c]"><strong className="mr-1 text-[#1b1c19]">@{reply.author}</strong>{reply.body}<span className="ml-1.5 font-mono text-[10px] text-[#8d8d87]">{reply.createdAt}</span></p></div>)}</div>)}</> : <p className="py-2 text-xs text-[#74777d]">첫 번째 의견을 남겨 보세요.</p>}</div>
        {hasMore && <button type="button" onClick={() => setVisibleCount((count) => count + 10)} className="mx-4 flex w-[calc(100%-2rem)] items-center justify-center gap-1 border-t border-[#e4e2dd] py-3 text-xs font-bold text-[#735c00]"><span className="material-symbols-outlined text-base">expand_more</span>댓글 10개 더 보기</button>}
        <form className="comment-panel__form" onSubmit={(event) => { event.preventDefault(); onSubmit(); }}><label className="sr-only" htmlFor="comment-draft">댓글 작성</label><span className="material-symbols-outlined text-[23px] text-[#44474c]">sentiment_satisfied</span><input id="comment-draft" value={draft} onChange={(event) => onDraftChange(event.target.value)} maxLength="500" placeholder="댓글 달기..." className="min-w-0 flex-1 border-0 bg-transparent px-1 py-2 text-xs text-[#1b1c19] placeholder:text-[#8d8d87] focus:outline-none" /><button type="submit" disabled={!draft.trim()} className="text-xs font-bold text-[#5865F2] disabled:cursor-not-allowed disabled:opacity-40">게시</button></form>
      </div>
    </div>
  </section>;
}

/** 정의: 작성자 핸들의 첫 글자로 만드는 개인정보 비노출형 아바타다. */
function Avatar({ author, small = false }) { return <span aria-hidden="true" className={`flex shrink-0 items-center justify-center rounded-full bg-primary-container/40 font-mono font-bold text-cyan-glow ${small ? 'h-4 w-4 text-[8px]' : 'h-5 w-5 text-[9px]'}`}>{author.slice(0, 1).toUpperCase()}</span>; }
