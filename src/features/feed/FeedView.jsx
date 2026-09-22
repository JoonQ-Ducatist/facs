import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Bookmark, Share2, UserCheck, UserPlus } from 'lucide-react';
import { getSampleStatus, SAMPLE_STATUS } from '../../services/mockApi.js';
import { enterNativeVideoFullscreen } from './videoFullscreen.js';
import { resolveTouchFeedDirection, resolveWheelFeedDirection } from './feedNavigation.js';
import MothMark from '../../components/brand/MothMark.jsx';
import { formatPublishedTime } from '../../services/publishedTime.js';

/** 정의: 카테고리 필터, 카드 제스처, 투표와 댓글 요약을 제공하는 콘텐츠 중심 피드 화면이다. */
export default function FeedView({ locale = 'ko', categories, cards, card, currentIndex, activeCategory, hasVoted, isOwnPost = false, boostEligible = false, boostRequested = false, canViewLiveReactions = false, liveReactions = [], savedPostIds, followingIds, currentUserId, onCategoryChange, onPrevious, onNext, onShuffle, onVote, onShare, onToggleSave, onToggleFollow, onBlockAuthor, onReportPost, onBoost, onStartUpload, onAddComment }) {
  const [expandedComments, setExpandedComments] = useState(false);
  const [draft, setDraft] = useState('');
  const gestureStart = useRef(null);
  const touchGestureStart = useRef(null);
  const wheelLocked = useRef(false);
  const [mediaIndex, setMediaIndex] = useState(0);
  const [carouselKick, setCarouselKick] = useState('');
  const [dragOffset, setDragOffset] = useState(0);
  const [isDraggingMedia, setIsDraggingMedia] = useState(false);
  const [feedMotion, setFeedMotion] = useState('');
  const [saveNotice, setSaveNotice] = useState('');
  const [reportOpen, setReportOpen] = useState(false);
  const [clockNow, setClockNow] = useState(() => Date.now());
  const feedLocked = useRef(false);
  const mediaLocked = useRef(false);
  const mediaCardRef = useRef(null);
  const carouselKickTimer = useRef(null);
  const categoryRailRef = useRef(null);
  const categoryDrag = useRef(null);
  useEffect(() => { setExpandedComments(false); setDraft(''); setMediaIndex(0); setSaveNotice(''); }, [card?.id]);
  useEffect(() => {
    const timer = window.setInterval(() => setClockNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  useLayoutEffect(() => {
    const cardElement = mediaCardRef.current;
    const carousel = cardElement?.closest('.media-carousel');
    const main = cardElement?.closest('.editorial-main--feed');
    if (carousel) carousel.scrollTop = 0;
    if (main) main.scrollTop = 0;
  }, [card?.id]);
  if (!card) return <EmptyFeed locale={locale} onStartUpload={onStartUpload} />;
  const theme = categories[card.category];
  const cardMedia = card.media?.length ? card.media : [{ id: `${card.id}-main`, type: card.mediaType ?? 'image', url: card.imageUrl, objectPosition: card.objectPosition }];
  const hasMultipleMedia = cardMedia.length > 1;
  const activeMedia = cardMedia[mediaIndex];
  const isAgeEvaluation = card.evaluationType === 'NUMERIC_AGE';
  const total = isAgeEvaluation ? card.ageVoteCount : card.yesVotes + card.noVotes;
  const yesPercent = isAgeEvaluation ? 0 : Math.round((card.yesVotes / total) * 100);
  const noPercent = 100 - yesPercent;
  const isSaved = savedPostIds?.has(card.id) ?? false;
  const publishedTime = formatPublishedTime(card.publishedAt, { locale, now: clockNow }) || card.timestamp;

  /** Prevent browser image-save affordances while leaving explicit controls usable. */
  function protectMediaEvent(event) {
    const target = event.target instanceof Element ? event.target : null;
    if (target?.closest('button, input, textarea, select, a, [role="dialog"]')) return;
    event.preventDefault();
  }

  async function toggleSavedCard() {
    const result = await onToggleSave(card.id);
    if (result?.ok) setSaveNotice(result.saved ? (locale === 'en' ? 'Saved to Scraps' : '스크랩에 저장됨') : (locale === 'en' ? 'Removed from Scraps' : '스크랩에서 제거됨'));
  }

  /** Clears every part of a card gesture so native media controls cannot leave a stale pointer behind. */
  function resetCardGesture() {
    gestureStart.current = null;
    setIsDraggingMedia(false);
    setDragOffset(0);
  }
  function cancelCapturedCardGesture() { if (gestureStart.current) resetCardGesture(); }

  /** The landscape carousel owns body scrolling below the fixed category row;
   * portrait keeps the main feed as its zero-range gesture boundary. */
  function getCardScrollOwner(element) {
    const carousel = element.closest('.media-carousel');
    if (carousel && carousel.scrollHeight > carousel.clientHeight + 2) return carousel;
    return element.closest('.editorial-main--feed');
  }

  /** 정의: 카드 표면의 시작 좌표를 기록해 가로 앨범·세로 피드 제스처를 구분한다. @param {PointerEvent} event 포인터 이벤트 */
  function startCardGesture(event) {
    const target = event.target instanceof Element ? event.target : null;
    if (!target || target.closest('button, input, textarea, [data-video-fullscreen-button]')) { resetCardGesture(); return; }
    if (event.target instanceof HTMLVideoElement) {
      const bounds = event.target.getBoundingClientRect();
      // Native iOS video controls live along the bottom edge. Keep that strip
      // dedicated to playhead/volume interactions while the rest of the video
      // remains part of the card swipe surface.
      if (event.clientY >= bounds.bottom - 58) { resetCardGesture(); return; }
    }
    gestureStart.current = { x: event.clientX, y: event.clientY, pointerType: event.pointerType, pointerId: event.pointerId };
    // Touch must keep its native vertical scroll path. Capturing it here made
    // landscape cards switch feeds instead of revealing their lower content.
    if (event.pointerType === 'mouse') event.currentTarget.setPointerCapture?.(event.pointerId);
  }
  /** 정의: 가로 이동 거리를 중앙 사진에 반영해 손으로 잡고 넘기는 앨범 전환 감각을 제공한다. @param {PointerEvent} event 포인터 이벤트 */
  function moveCardGesture(event) {
    if (!gestureStart.current || gestureStart.current.pointerId !== event.pointerId || cardMedia.length < 2) return;
    const deltaX = event.clientX - gestureStart.current.x;
    const deltaY = event.clientY - gestureStart.current.y;
    if (Math.abs(deltaX) <= Math.abs(deltaY)) return;
    const width = Math.max(1, mediaCardRef.current?.clientWidth ?? window.innerWidth ?? 320);
    const atStartBoundary = mediaIndex === 0 && deltaX > 0;
    const atEndBoundary = mediaIndex === cardMedia.length - 1 && deltaX < 0;
    const resistedDelta = (atStartBoundary || atEndBoundary) ? deltaX * 0.2 : deltaX;
    const travelLimit = Math.max(120, width * 0.96);
    setIsDraggingMedia(true);
    setDragOffset(Math.max(-travelLimit, Math.min(travelLimit, resistedDelta)));
  }
  /** 같은 카드 안에서만 사진을 부드럽게 교체한다. 양옆 미리보기·가로 스와이프·데스크톱 화살표가 같은 전환을 사용한다. */
  function navigateMedia(direction) {
    if (mediaLocked.current) return;
    const nextIndex = Math.max(0, Math.min(cardMedia.length - 1, mediaIndex + direction));
    if (nextIndex === mediaIndex) return;
    mediaLocked.current = true;
    const movingLeft = direction > 0;
    const travel = Math.max(1, mediaCardRef.current?.clientWidth ?? window.innerWidth ?? 320);
    setCarouselKick(`media-carousel--kick-${movingLeft ? 'left' : 'right'}`);
    setIsDraggingMedia(false);
    setDragOffset(movingLeft ? -travel : travel);
    window.setTimeout(() => {
      setMediaIndex(nextIndex);
      setDragOffset(movingLeft ? travel * 0.08 : -travel * 0.08);
      window.requestAnimationFrame(() => setDragOffset(0));
    }, 130);
    window.clearTimeout(carouselKickTimer.current);
    carouselKickTimer.current = window.setTimeout(() => { setCarouselKick(''); mediaLocked.current = false; }, 300);
  }
  function bounceMedia(direction) {
    setIsDraggingMedia(false);
    setDragOffset(0);
    setCarouselKick(`media-carousel--resist-${direction}`);
    window.clearTimeout(carouselKickTimer.current);
    carouselKickTimer.current = window.setTimeout(() => setCarouselKick(''), 220);
  }
  /** 정의: 가로 스와이프는 같은 카드의 미디어를, 세로 터치 스와이프는 이전·다음 카드를 표시한다. @param {PointerEvent} event 포인터 이벤트 */
  function finishCardGesture(event) {
    const target = event.target instanceof Element ? event.target : null;
    if (!target || target.closest('button, input, textarea, [data-video-fullscreen-button]')) { resetCardGesture(); return; }
    if (!gestureStart.current || gestureStart.current.pointerId !== event.pointerId) { resetCardGesture(); return; }
    const start = gestureStart.current;
    gestureStart.current = null;
    const deltaX = event.clientX - start.x;
    const deltaY = event.clientY - start.y;
    const resetDrag = () => { setIsDraggingMedia(false); setDragOffset(0); };
    if (Math.max(Math.abs(deltaX), Math.abs(deltaY)) < 42) { resetDrag(); return; }
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      const atStartBoundary = mediaIndex === 0 && deltaX > 0;
      const atEndBoundary = mediaIndex === cardMedia.length - 1 && deltaX < 0;
      if (atStartBoundary || atEndBoundary) {
        bounceMedia(deltaX > 0 ? 'right' : 'left');
        return;
      }
      navigateMedia(deltaX < 0 ? 1 : -1);
      return;
    }
    resetDrag();
  }
  /** Keeps vertical touch navigation independent from Pointer Events. Mobile
   * browsers may cancel a pointer as soon as native scrolling begins, while
   * touchend still reports the completed gesture consistently. */
  function startCardTouch(event) {
    const target = event.target instanceof Element ? event.target : null;
    if (!target || target.closest('button, input, textarea, [data-video-fullscreen-button]')) { touchGestureStart.current = null; return; }
    const touch = event.touches[0];
    if (!touch) return;
    const scroller = getCardScrollOwner(event.currentTarget);
    touchGestureStart.current = {
      x: touch.clientX,
      y: touch.clientY,
      scrollTop: scroller?.scrollTop ?? 0,
      maxScrollTop: Math.max(0, (scroller?.scrollHeight ?? 0) - (scroller?.clientHeight ?? 0)),
    };
  }
  function finishCardTouch(event) {
    const start = touchGestureStart.current;
    touchGestureStart.current = null;
    const touch = event.changedTouches[0];
    if (!start || !touch) return;
    const direction = resolveTouchFeedDirection({ startX: start.x, startY: start.y, endX: touch.clientX, endY: touch.clientY, scrollTop: start.scrollTop, maxScrollTop: start.maxScrollTop });
    if (direction) navigateFeed(direction);
  }
  /** 정의: 데스크톱 휠의 세로 이동으로 피드를 한 장씩 안전하게 순환한다. @param {WheelEvent} event 마우스 휠 이벤트 */
  function moveCardByWheel(event) {
    if (wheelLocked.current) return;
    const scroller = getCardScrollOwner(event.currentTarget);
    const direction = resolveWheelFeedDirection({ deltaY: event.deltaY, scrollTop: scroller?.scrollTop ?? 0, scrollHeight: scroller?.scrollHeight ?? 0, clientHeight: scroller?.clientHeight ?? 0 });
    if (!direction) return;
    event.preventDefault();
    wheelLocked.current = true;
    navigateFeed(direction);
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
  function startCategoryDrag(event) {
    // A tap on a category button must remain a click; only the empty rail is draggable.
    if (event.target.closest('button')) { categoryDrag.current = null; return; }
    categoryDrag.current = { x: event.clientX, scrollLeft: categoryRailRef.current?.scrollLeft ?? 0 };
  }
  function moveCategoryDrag(event) { if (!categoryDrag.current || !categoryRailRef.current) return; categoryRailRef.current.scrollLeft = categoryDrag.current.scrollLeft - (event.clientX - categoryDrag.current.x); }
  function endCategoryDrag() { categoryDrag.current = null; }

  return <section className="editorial-feed relative flex h-full w-full min-h-0 flex-col items-center">
    <div ref={categoryRailRef} onPointerDown={startCategoryDrag} onPointerMove={moveCategoryDrag} onPointerUp={endCategoryDrag} onPointerCancel={endCategoryDrag} className="feed-category-rail relative z-40 mb-0 flex w-full cursor-grab items-center gap-1 overflow-x-auto px-4 py-0.5 no-scrollbar touch-pan-x active:cursor-grabbing">
      <CategoryButton label="셔플" active={activeCategory === 'ALL'} color="#00f0ff" idleColor="#735c00" icon="shuffle" onClick={onShuffle} />
      {Object.entries(categories).map(([id, category]) => <CategoryButton key={id} label={category.label} active={activeCategory === id} color={category.color} onClick={() => onCategoryChange(id)} />)}
    </div>

    <div className={`media-carousel relative flex min-h-0 w-full flex-1 items-center ${carouselKick}`}>
    <article ref={mediaCardRef} onPointerDown={startCardGesture} onPointerMove={moveCardGesture} onPointerUp={finishCardGesture} onPointerCancel={resetCardGesture} onLostPointerCapture={cancelCapturedCardGesture} onTouchStart={startCardTouch} onTouchEnd={finishCardTouch} onTouchCancel={() => { touchGestureStart.current = null; }} onWheel={moveCardByWheel} onContextMenu={protectMediaEvent} onDragStart={protectMediaEvent} className={`media-card relative z-10 h-full min-h-0 w-full touch-pan-y overflow-hidden rounded-xl border border-surface-container-high/60 bg-[#fbfaf7] shadow-2xl ${hasMultipleMedia ? 'media-card--multi' : ''} ${isDraggingMedia ? 'media-card--dragging' : ''} ${feedMotion}`}>
      {hasMultipleMedia && mediaIndex > 0 && <div className="media-peek media-peek--continuous media-peek--left" style={{ transform: `translate3d(calc(-100% + var(--media-peek-width) + ${dragOffset}px), 0, 0) scale(.96)` }}><button type="button" onClick={() => navigateMedia(-1)} aria-label="이전 사진 미리보기"><CardMedia card={card} media={cardMedia[mediaIndex - 1]} className="h-full w-full object-cover object-center" /></button></div>}
      {hasMultipleMedia && mediaIndex < cardMedia.length - 1 && <div className="media-peek media-peek--continuous media-peek--right" style={{ transform: `translate3d(calc(100% - var(--media-peek-width) + ${dragOffset}px), 0, 0) scale(.96)` }}><button type="button" onClick={() => navigateMedia(1)} aria-label="다음 사진 미리보기"><CardMedia card={card} media={cardMedia[mediaIndex + 1]} className="h-full w-full object-cover object-center" /></button></div>}
      <div className={`media-primary absolute z-10 overflow-hidden ${isDraggingMedia ? 'media-primary--dragging' : ''}`} style={{ transform: `translate3d(${dragOffset}px, 0, 0)` }}><CardMedia card={card} media={activeMedia} className="h-full w-full object-cover object-center brightness-[1.02] contrast-[1.03]" showFullscreen /></div>
      <div className="pointer-events-none absolute inset-0 z-10 bg-[linear-gradient(180deg,rgba(1,8,17,.62)_0%,rgba(1,8,17,.05)_32%,rgba(1,8,17,.12)_52%,rgba(1,8,17,.88)_100%)]" />
      {hasMultipleMedia && <div className="media-card-photo-nav" aria-label="사진 탐색"><button type="button" onClick={() => navigateMedia(-1)} aria-label="이전 사진" className={`media-card-photo-nav__button media-card-photo-nav__button--left ${mediaIndex === 0 ? 'invisible' : ''}`}><span className="material-symbols-outlined">chevron_left</span></button><button type="button" onClick={() => navigateMedia(1)} aria-label="다음 사진" className={`media-card-photo-nav__button media-card-photo-nav__button--right ${mediaIndex === cardMedia.length - 1 ? 'invisible' : ''}`}><span className="material-symbols-outlined">chevron_right</span></button></div>}
      <div className="scan-line absolute left-0 top-0 z-20 h-px w-full" style={{ backgroundColor: theme.color, boxShadow: `0 0 13px 2px ${theme.color}` }} />
      <div className="feed-top-overlay"><div className="feed-top-overlay__row"><div className="flex items-center gap-1 rounded-full border border-white/20 bg-black/35 px-2 py-0.5 shadow-lg backdrop-blur-sm"><span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ backgroundColor: theme.color, boxShadow: `0 0 8px ${theme.color}` }} /><span className="font-mono text-[8px] font-bold leading-none tracking-wide text-white">LIVE STREAM</span><time dateTime={card.publishedAt || undefined} className="font-mono text-[8px] leading-none text-white/75">{publishedTime}</time></div><UserBadge author={card.author} canFollow={Boolean(card.author) && !card.isMyUpload && card.authorId !== currentUserId} canReport={Boolean(card.authorId) && !card.isMyUpload} following={followingIds?.has(card.authorId ?? `sample:${String(card.author).trim().toLowerCase()}`)} onToggleFollow={() => onToggleFollow?.(card.authorId ?? `sample:${String(card.author).trim().toLowerCase()}`)} onBlock={() => onBlockAuthor?.(card.authorId ?? `sample:${String(card.author).trim().toLowerCase()}`, card.author)} onReport={() => setReportOpen(true)} /></div><div className="feed-top-overlay__category"><CategoryBadge theme={theme} category={card.category} /></div></div>
      {hasMultipleMedia && <MediaProgress locale={locale} media={cardMedia} mediaIndex={mediaIndex} color={theme.color} onSelect={setMediaIndex} />}
      <div className="card-details absolute bottom-0 left-0 z-20 flex w-full flex-col px-4 pb-2 pt-9"><div className="mb-2 pr-[4.5rem] sm:pr-20"><h1 className="feed-card__question whitespace-pre-line font-headline text-lg font-bold leading-snug text-white sm:text-xl">{card.question}</h1></div>
        {hasVoted || isOwnPost || (canViewLiveReactions && liveReactions.length) ? <>{isAgeEvaluation ? <AgeResult card={card} color={theme.color} onBoost={isOwnPost && boostEligible && !boostRequested ? onBoost : undefined} onStartUpload={onStartUpload} uploadLabel={isOwnPost ? (locale === 'en' ? 'Get feedback on another look' : '다른 모습 평가받기') : (locale === 'en' ? 'Get feedback too' : '나도 평가받기')} /> : <Result yesPercent={yesPercent} noPercent={noPercent} total={total} color={theme.color} onBoost={isOwnPost && boostEligible && !boostRequested ? onBoost : undefined} onStartUpload={onStartUpload} uploadLabel={isOwnPost ? (locale === 'en' ? 'Get feedback on another look' : '다른 모습 평가받기') : (locale === 'en' ? 'Get feedback too' : '나도 평가받기')} />}{canViewLiveReactions && <LiveReactionBalloons reactions={liveReactions} />}</> : isAgeEvaluation ? <AgeVotePanel card={card} color={theme.color} onVote={onVote} /> : <div className="flex w-full gap-2.5"><button type="button" onClick={() => onVote(true)} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border py-1 text-[13px] font-extrabold tracking-wider text-[#051424] active:scale-95" style={{ borderColor: theme.color, backgroundColor: theme.color }}>YES <span className="material-symbols-outlined text-[15px]">check_circle</span></button><button type="button" onClick={() => onVote(false)} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border bg-surface-container-low/70 py-1 text-[13px] font-bold tracking-wider active:scale-95" style={{ borderColor: `${theme.color}aa`, color: theme.color }}>NO <span className="material-symbols-outlined text-[15px]">cancel</span></button></div>}
        {card.commentsAllowed && <CommentPreview locale={locale} comments={card.comments ?? []} saved={isSaved} color={theme.color} notice={saveNotice} onToggleSave={toggleSavedCard} onShare={() => onShare(card)} onExpand={() => setExpandedComments(true)} />}
      </div>
    </article></div>
    {card.commentsAllowed && expandedComments && <CommentPanel card={card} timestamp={publishedTime} media={activeMedia} comments={card.comments ?? []} draft={draft} onDraftChange={setDraft} onClose={() => setExpandedComments(false)} onSubmit={() => { onAddComment(card.id, draft); setDraft(''); }} />}
    {reportOpen && <ReportDialog author={card.author} onClose={() => setReportOpen(false)} onSubmit={(reason) => { onReportPost?.(card.id, reason); setReportOpen(false); }} />}
  </section>;
}

/** First-use Feed state: explain the absence and offer one clear next action. */
function EmptyFeed({ locale, onStartUpload }) {
  const korean = locale !== 'en';
  return <section className="editorial-feed feed-empty" aria-labelledby="empty-feed-title">
    <MothMark width="92" height="64" className="feed-empty__mark" alt="" />
    <p className="feed-empty__eyebrow">FACt.Smack</p>
    <h1 id="empty-feed-title">{korean ? '첫 피드의 주인공이 되어 보세요.' : 'Be the first to share a look.'}</h1>
    <p>{korean ? '첫 번째 룩을 공유하고, 다양한 시선으로 평가를 받아보세요.' : 'Share your first look and receive thoughtful ratings from different perspectives.'}</p>
    <button type="button" onClick={onStartUpload} className="feed-empty__action"><span className="material-symbols-outlined" aria-hidden="true">add_a_photo</span>{korean ? '첫 피드 올리기' : 'Share the first post'}</button>
  </section>;
}

/** Displays only anonymous post-evaluation signals; each bubble fades while it drifts upward. */
function LiveReactionBalloons({ reactions }) {
  if (!reactions.length) return null;
  const replayingPairs = reactions.length > 8;
  return <div className="live-reaction-layer" aria-live="polite" aria-label="새 평가 반응">{reactions.map((reaction, index) => {
    const lane = index % (replayingPairs ? 2 : 8);
    return <span key={reaction.id} className={`live-reaction live-reaction--${reaction.kind}`} style={{ '--reaction-left': `${replayingPairs ? 26 + lane * 36 : 7 + lane * 11}%`, '--reaction-bottom': `${replayingPairs ? 5 + (Math.floor(index / 2) % 4) * 9 : 4 + (lane % 4) * 10}%`, '--reaction-delay': `${reaction.animationDelayMs ?? 0}ms` }}><span>{reaction.value}</span></span>;
  })}</div>;
}

/** 정의: 현재 선택된 카테고리 상태를 보여 주고 필터 변경을 요청하는 버튼이다. */
function CategoryButton({ label, active, color, idleColor, icon, onClick }) { return <button type="button" onClick={onClick} className="flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-1 font-mono text-[11px] transition-all" style={active ? { color, borderColor: color, backgroundColor: `${color}1a`, fontWeight: 700 } : { color: idleColor ?? '#44474c', borderColor: idleColor ? `${idleColor}99` : '#c4c6cd', backgroundColor: '#ffffff', fontWeight: idleColor ? 700 : 400 }}>{icon && <span className="material-symbols-outlined text-[13px]">{icon}</span>}{label}</button>; }
/** 정의: 카드 위 카테고리 표기를 LIVE·사용자 표기와 같은 소형 밀도로 보여 주는 배지다. */
function CategoryBadge({ theme, category }) { return <div className="flex items-center gap-1 rounded-full border border-white/20 bg-black/35 px-2 py-0.5 shadow-lg backdrop-blur-sm"><span className="material-symbols-outlined text-[12px]" style={{ color: theme.color }}>{theme.icon}</span><span className="font-mono text-[8px] font-semibold leading-none uppercase tracking-wider text-white">{theme.feedLabel ?? category}</span></div>; }
/** 정의: 카드 위 작성자 핸들을 LIVE와 동일한 소형 반투명 배지로 보여 준다. */
function UserBadge({ author, canFollow = false, canReport = false, following = false, onToggleFollow, onBlock, onReport }) { const [menuOpen, setMenuOpen] = useState(false); const block = () => { if (window.confirm(`@${author} 계정을 차단할까요?\n서로의 피드와 팔로우 관계가 즉시 숨겨집니다.`)) onBlock?.(); setMenuOpen(false); }; const report = () => { onReport?.(); setMenuOpen(false); }; const showMenu = canFollow || canReport; return <div className="relative flex items-center gap-1 rounded-full border border-white/20 bg-black/35 py-0.5 pl-1 pr-1 shadow-lg backdrop-blur-sm"><span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary-container/80"><span className="material-symbols-outlined text-[11px] text-white">person</span></span><span className="font-mono text-[8px] font-semibold leading-none tracking-wide text-white">@{author}</span>{canFollow && <button type="button" onClick={onToggleFollow} aria-pressed={following} aria-label={following ? `@${author} 팔로우 취소` : `@${author} 팔로우`} title={following ? '팔로우 취소' : '팔로우'} className={`ml-0.5 flex h-4 w-4 items-center justify-center rounded-full border active:scale-90 ${following ? 'border-[#fff4bc] bg-black/50 text-[#fffde8] shadow-[0_0_7px_rgba(255,244,188,0.72)]' : 'border-white/55 bg-black/40 text-white shadow-[0_0_5px_rgba(255,255,255,0.35)]'}`}>{following ? <UserCheck size={10} strokeWidth={3} /> : <UserPlus size={10} strokeWidth={2.6} />}</button>}{showMenu && <><button type="button" onClick={() => setMenuOpen((open) => !open)} aria-expanded={menuOpen} aria-label={`@${author} 메뉴`} className="flex h-4 w-4 items-center justify-center text-white/90"><span className="material-symbols-outlined text-[13px]">more_horiz</span></button>{menuOpen && <div className="absolute right-0 top-6 z-50 min-w-28 rounded-md border border-white/20 bg-[#101b2b]/95 p-1 shadow-xl backdrop-blur">{canReport && <button type="button" onClick={report} className="w-full rounded px-2 py-1.5 text-left text-[10px] font-bold text-white hover:bg-white/10">신고</button>}<button type="button" onClick={block} className="w-full rounded px-2 py-1.5 text-left text-[10px] font-bold text-[#ffb1c4] hover:bg-white/10">차단</button></div>}</>}</div>; }

function ReportDialog({ author, onClose, onSubmit }) { const [reason, setReason] = useState('harassment'); const options = [['harassment', '괴롭힘 또는 위협'], ['sexual_content', '성적이거나 부적절한 콘텐츠'], ['privacy', '개인정보 노출'], ['spam', '스팸 또는 사기'], ['other', '기타']]; return <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/55 p-3 sm:items-center" role="presentation" onClick={onClose}><section role="dialog" aria-modal="true" aria-label="게시물 신고" className="w-full max-w-sm rounded-xl bg-white p-4 shadow-2xl" onClick={(event) => event.stopPropagation()}><div className="mb-3 flex items-start justify-between gap-3"><div><h2 className="text-base font-bold text-[#1b1c19]">게시물 신고</h2><p className="mt-1 text-xs leading-relaxed text-[#74777d]">@{author}에게 신고자 정보는 공개되지 않습니다.</p></div><button type="button" onClick={onClose} aria-label="신고 닫기" className="text-xl leading-none text-[#74777d]">×</button></div><div className="space-y-1.5">{options.map(([value, label]) => <label key={value} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${reason === value ? 'border-[#d94c70] bg-[#fff5f7] text-[#8e183c]' : 'border-[#e4e2dd] text-[#44474c]'}`}><input type="radio" name="report-reason" value={value} checked={reason === value} onChange={() => setReason(value)} />{label}</label>)}</div><div className="mt-4 flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded-md px-3 py-2 text-xs font-semibold text-[#55575c]">취소</button><button type="button" onClick={() => onSubmit(reason)} className="rounded-md bg-[#d94c70] px-3 py-2 text-xs font-bold text-white">신고 접수</button></div></section></div>; }
/** 정의: LIVE·작성자 배지와 같은 상단 오버레이 행 중앙에 다중 사진 진행 표시기를 둔다. */
function MediaProgress({ locale, media, mediaIndex, color, onSelect }) { return <div className="media-progress absolute left-1/2 top-3 z-30 flex -translate-x-1/2 items-center gap-1" aria-label={locale === 'en' ? `${media.length} uploaded photos` : `등록된 사진 ${media.length}장`}>{media.map((item, index) => <button key={item.id} type="button" aria-label={locale === 'en' ? `View photo ${index + 1}` : `${index + 1}번째 사진 보기`} aria-current={mediaIndex === index ? 'true' : undefined} onClick={() => onSelect(index)} className="rounded-full p-0"><span className="block rounded-full transition-colors" style={{ backgroundColor: mediaIndex === index ? color : 'rgba(255,255,255,.52)' }} /></button>)}</div>; }
/** 정의: 사진 또는 동영상 카드 자산을 동일한 피드 미디어 규칙으로 렌더링한다. */
function CardMedia({ card, media, className, muted = false, showFullscreen = false }) {
  const source = media ?? { type: card.mediaType ?? 'image', url: card.imageUrl, objectPosition: card.objectPosition };
  const isVideo = source.type === 'video' || String(source.type ?? '').startsWith('video/');
  const videoPoster = useVideoPoster(isVideo ? source.url : '');
  const videoRef = useRef(null);
  const protectMedia = (event) => event.preventDefault();
  const isolateVideoTouch = (event) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    if (event.clientY >= bounds.bottom - 58) event.stopPropagation();
  };
  const reportVideoEvent = (event) => {
    if (!import.meta.env.DEV) return;
    const video = event.currentTarget;
    const mediaError = video.error;
    console.debug('[FACS video]', event.type, {
      readyState: video.readyState,
      networkState: video.networkState,
      errorCode: mediaError?.code ?? null,
      source: String(video.currentSrc || source.url || '').split('?')[0],
    });
  };
  const enterFullscreen = (event) => {
    event.preventDefault();
    event.stopPropagation();
    const video = videoRef.current;
    if (!video) return;
    enterNativeVideoFullscreen(video);
  };
  const stopFullscreenGesture = (event) => event.stopPropagation();
  if (!isVideo) return <img className={className} style={{ objectPosition: source.objectPosition ?? card.objectPosition }} src={source.url} alt={`${card.author}의 ${card.category} 사진`} draggable="false" onContextMenu={protectMedia} onDragStart={protectMedia} />;
  const video = <video ref={videoRef} className={className} style={{ objectPosition: source.objectPosition ?? card.objectPosition }} src={source.url} poster={videoPoster || undefined} autoPlay={Boolean(muted)} loop={Boolean(muted)} muted={muted || undefined} playsInline preload={showFullscreen && !muted ? 'auto' : 'metadata'} controls={!muted} draggable="false" onLoadedMetadata={reportVideoEvent} onCanPlay={reportVideoEvent} onPlay={reportVideoEvent} onPause={reportVideoEvent} onWaiting={reportVideoEvent} onStalled={reportVideoEvent} onError={reportVideoEvent} onPointerDown={isolateVideoTouch} onPointerMove={isolateVideoTouch} onPointerUp={isolateVideoTouch} onPointerCancel={isolateVideoTouch} onContextMenu={protectMedia} onDragStart={protectMedia} aria-label={`${card.author}의 ${card.category} 동영상`} />;
  if (!showFullscreen || muted) return video;
  return <div className="feed-video-shell">{video}<button type="button" data-video-fullscreen-button aria-label="동영상 전체 화면" title="전체 화면" className="video-fullscreen-button" onPointerDown={stopFullscreenGesture} onPointerMove={stopFullscreenGesture} onPointerUp={stopFullscreenGesture} onClick={enterFullscreen}><span className="material-symbols-outlined" aria-hidden="true">fullscreen</span></button></div>;
}
function useVideoPoster(url) {
  const [poster, setPoster] = useState('');
  useEffect(() => {
    let cancelled = false;
    if (!url) { setPoster(''); return undefined; }
    createRemoteVideoPoster(url).then((nextPoster) => {
      if (!cancelled && nextPoster) setPoster(nextPoster);
    });
    return () => { cancelled = true; };
  }, [url]);
  return poster;
}
function createRemoteVideoPoster(url) { return new Promise((resolve) => { const video = document.createElement('video'); const canvas = document.createElement('canvas'); let settled = false; const finish = (poster = '') => { if (settled) return; settled = true; window.clearTimeout(timeout); video.removeAttribute('src'); video.load(); resolve(poster); }; const capture = () => { try { if (!video.videoWidth || !video.videoHeight) return finish(''); canvas.width = video.videoWidth; canvas.height = video.videoHeight; const context = canvas.getContext('2d'); context?.drawImage(video, 0, 0, canvas.width, canvas.height); finish(canvas.toDataURL('image/jpeg', .82)); } catch { finish(''); } }; const timeout = window.setTimeout(() => finish(''), 6000); video.crossOrigin = 'anonymous'; video.preload = 'auto'; video.muted = true; video.playsInline = true; video.onloadeddata = capture; video.onerror = () => finish(''); video.src = url; video.load(); }); }
/** 정의: 카드 이동을 위한 접근성 레이블 포함 화살표 버튼이다. */
/** 정의: 투표 완료 뒤 Result를 표본 상태별로 정직하게 표시하고 적격 상태에서만 Boost를 제안한다. */
function Result({ yesPercent, noPercent, total, color, onBoost, onStartUpload, uploadLabel }) {
  const noColor = '#B42318';
  const sampleStatus = getSampleStatus(total);
  const canOfferBoost = sampleStatus === SAMPLE_STATUS.EARLY_SIGNAL || sampleStatus === SAMPLE_STATUS.BASE_RESULT;
  if (total === 0) return <ResultShell total={total} color={color} onBoost={onBoost} onStartUpload={onStartUpload} uploadLabel={uploadLabel}><p className="text-[11px] leading-relaxed text-white/80">아직 평가가 모이지 않았어요. 더 많은 사람에게 보여드려 볼까요?</p></ResultShell>;
  return <ResultShell total={total} color={color} sampleStatus={sampleStatus} onBoost={canOfferBoost ? onBoost : undefined} onStartUpload={onStartUpload} uploadLabel={uploadLabel}><div className="mb-1 flex items-center justify-between font-mono text-xs font-bold"><span className="flex items-center gap-1" style={{ color }}><span className="material-symbols-outlined text-[14px]">thumb_up</span> YES {yesPercent}%</span><span className="flex items-center gap-1" style={{ color: noColor }}>NO {noPercent}% <span className="material-symbols-outlined text-[14px]">thumb_down</span></span></div><div className="flex h-2 w-full overflow-hidden rounded-full border border-[#101828] bg-slate-800"><span className="result-bar--yes" style={{ width: `${yesPercent}%`, backgroundColor: color }} /><span className="result-bar--no" style={{ width: `${noPercent}%`, backgroundColor: noColor }} /></div></ResultShell>;
}

/** 정의: 모든 평가 유형이 같은 표본 상태·다음 탐색·Boost 원칙을 공유하는 Result 외곽이다. */
function ResultShell({ total, color, sampleStatus, onBoost, onStartUpload, uploadLabel, children }) {
  const label = total === 0 ? '평가를 기다리고 있어요' : sampleStatus === SAMPLE_STATUS.EARLY_SIGNAL ? '초기 경향' : sampleStatus === SAMPLE_STATUS.BASE_RESULT ? '현재 결과' : sampleStatus === SAMPLE_STATUS.EXPANDED_SAMPLE ? '확장 표본' : '표본 수집 중';
  const boostLabel = total === 0 ? '더 많은 평가 받아보기' : '100명까지 Boost 요청';
  return <div className="feed-result mb-2.5 rounded-xl border border-white/30 bg-[#061225]/42 p-2.5 shadow-[0_8px_24px_rgba(0,0,0,.18)] backdrop-blur-[1px]"><div className="feed-result__meta mb-1.5"><span className="font-mono text-[10px] font-bold" style={{ color }}>{label} <strong className="font-extrabold text-[#fff4bc]">({total.toLocaleString()}명)</strong></span></div>{children}<div className="feed-result__actions mt-1.5 flex items-center"><div className="feed-result__secondary flex items-center gap-2">{onBoost && <button type="button" onClick={onBoost} className="feed-result__boost rounded-md border px-1.5 py-0.5 text-[10px] font-bold" style={{ color, borderColor: `${color}aa`, backgroundColor: `${color}20` }}>{boostLabel}</button>}{onStartUpload && <button type="button" onClick={onStartUpload} className="feed-result__self text-[10px] font-semibold text-white/85 underline decoration-white/35 underline-offset-2">{uploadLabel ?? '나도 평가받기'}</button>}</div></div></div>;
}

/** 정의: PERCEIVED_AGE의 업로더 지정 범위 안에서 슬라이더·± 버튼으로 한 살씩 예상 나이를 선택하는 평가 제어다. */
function AgeVotePanel({ card, color, onVote }) {
  const min = card.ageMin ?? 18;
  const max = card.ageMax ?? 99;
  const [selectedAge, setSelectedAge] = useState(() => Math.round(card.ageEstimate || (min + max) / 2));
  useEffect(() => setSelectedAge(Math.round(card.ageEstimate || (min + max) / 2)), [card.id, card.ageEstimate, min, max]);
  const changeAge = (value) => setSelectedAge(Math.min(max, Math.max(min, Number(value))));
  return <div className="age-vote-panel rounded-xl border border-white/30 bg-[#061225]/28 px-2.5 py-1.5 shadow-[0_4px_14px_rgba(0,0,0,.12)]"><p className="mb-1 text-center text-[10px] font-semibold leading-none text-white">몇 살로 보이나요?</p><div className="flex items-center gap-1.5"><button type="button" onClick={() => changeAge(selectedAge - 1)} disabled={selectedAge <= min} aria-label="예상 나이 한 살 낮추기" className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-white/35 text-white disabled:opacity-35"><span className="material-symbols-outlined text-[12px]">remove</span></button><span className="shrink-0 font-mono text-[10px] font-bold" style={{ color }}>{min}</span><input type="range" min={min} max={max} step="1" value={selectedAge} onChange={(event) => changeAge(event.target.value)} onPointerDown={(event) => event.stopPropagation()} onPointerMove={(event) => event.stopPropagation()} onPointerUp={(event) => event.stopPropagation()} aria-label="예상 나이 선택" aria-valuetext={`${selectedAge}세`} className="age-vote-slider min-w-0 flex-1" style={{ accentColor: color }} /><span className="shrink-0 font-mono text-[10px] font-bold" style={{ color }}>{max}</span><button type="button" onClick={() => changeAge(selectedAge + 1)} disabled={selectedAge >= max} aria-label="예상 나이 한 살 높이기" className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-white/35 text-white disabled:opacity-35"><span className="material-symbols-outlined text-[12px]">add</span></button><button type="button" onClick={() => onVote(selectedAge)} className="ml-0.5 shrink-0 rounded-md px-2 py-1 text-[10px] font-bold leading-none text-[#051424]" style={{ backgroundColor: color }}>선택</button></div><output className="mt-1 block pl-6 font-mono text-xs font-bold leading-none" style={{ color }}>{selectedAge}세</output></div>;
}

/** 정의: 숫자 평가 결과도 표본이 충분할 때만 평균을 현재 결과로 표현하고 실제 나이는 비공개로 유지한다. */
function AgeResult({ card, color, onBoost, onStartUpload, uploadLabel }) {
  const total = card.ageVoteCount ?? 0;
  const sampleStatus = getSampleStatus(total);
  const canOfferBoost = sampleStatus === SAMPLE_STATUS.EARLY_SIGNAL || sampleStatus === SAMPLE_STATUS.BASE_RESULT;
  if (total === 0) return <ResultShell total={total} color={color} onBoost={onBoost} onStartUpload={onStartUpload} uploadLabel={uploadLabel}><p className="text-[11px] leading-relaxed text-white/80">아직 평가가 모이지 않았어요. 더 많은 사람에게 보여드려 볼까요?</p></ResultShell>;
  return <ResultShell total={total} color={color} sampleStatus={sampleStatus} onBoost={canOfferBoost ? onBoost : undefined} onStartUpload={onStartUpload} uploadLabel={uploadLabel}><div className="flex items-end justify-between"><span><span className="block text-[10px] text-white/80">평균 예상 나이</span><strong className="font-mono text-2xl" style={{ color }}>{card.ageEstimate.toFixed(1)}<small className="ml-0.5 text-xs">세</small></strong></span><span className="text-right text-[10px] text-white/80">참여자의 주관적<br />평가예요</span></div></ResultShell>;
}

/** 정의: 카드 위에 첫 댓글만 간결하게 보여 주고 전체 댓글 열기를 제공하는 요약 영역이다. */
function CommentPreview({ locale, comments, saved, color, notice, onToggleSave, onShare, onExpand }) {
  const comment = comments[0];
  return <div className="comment-preview relative mt-2 overflow-hidden bg-gradient-to-b from-transparent via-[#061225]/10 to-transparent px-1 py-1.5" aria-label="댓글 미리보기">
    <div className="absolute right-0 top-1/2 z-10 flex h-6 -translate-y-1/2 items-center gap-0"><p role="status" aria-live="polite" className="sr-only">{notice}</p><button type="button" onClick={onToggleSave} aria-pressed={saved} aria-label={locale === 'en' ? (saved ? 'Remove from Scraps' : 'Save to Scraps') : (saved ? '스크랩에서 제거' : '스크랩에 저장')} title={locale === 'en' ? (saved ? 'Remove from Scraps' : 'Save to Scraps') : (saved ? '스크랩에서 제거' : '스크랩에 저장')} className="comment-preview__scrap"><Bookmark aria-hidden="true" size={16} strokeWidth={2.1} fill={saved ? 'currentColor' : 'none'} style={{ color: saved ? color : undefined }} /></button><button type="button" onClick={onShare} aria-label={locale === 'en' ? 'Share this post' : '이 게시물 공유하기'} title={locale === 'en' ? 'Share' : '공유하기'} className="flex h-6 w-6 items-center justify-center text-white/80 transition-colors hover:text-white active:scale-90"><Share2 aria-hidden="true" size={16} strokeWidth={2.1} /></button><button type="button" onClick={onExpand} aria-label="댓글 더 보기" className="flex h-6 items-center gap-0.5 px-1 text-[12px] font-bold text-cyan-glow"><span>더 보기</span><span className="material-symbols-outlined text-[16px]">more_horiz</span></button></div>
    {comment ? <p className="comment-preview__text truncate pr-32 text-white/90"><strong className="comment-preview__author mr-1 text-cyan-50">@{comment.author}</strong>{comment.body}</p> : <p className="comment-preview__empty pr-32 text-slate-300/80">첫 번째 댓글을 남겨 보세요.</p>}
  </div>;
}

/** 정의: PC에서는 사진과 댓글을 나란히 보여 주는 게시물 상세 모달, 모바일에서는 확장 댓글 영역을 제공한다. */
function CommentPanel({ card, timestamp, media, comments, draft, onDraftChange, onClose, onSubmit }) {
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
        <header className="flex shrink-0 items-center gap-2 border-b border-[#e4e2dd] px-4 py-3"><Avatar author={card.author} /><div className="min-w-0 flex-1"><strong className="block truncate text-[13px] text-[#1b1c19]">@{card.author}</strong><span className="block truncate text-[10px] text-[#74777d]">{timestamp}</span></div><span className="material-symbols-outlined text-[19px] text-[#44474c]">more_horiz</span></header>
        <div className="comment-panel__comments">{visibleComments.length ? <><div className="mb-4 flex gap-2"><Avatar author={card.author} /><p className="comment-panel__comment-text text-[#44474c]"><strong className="comment-panel__author mr-1 text-[#1b1c19]">@{card.author}</strong>{card.question.replace('\n', ' ')}</p></div>{visibleComments.map((comment) => <div key={comment.id} className="mb-4"><div className="flex gap-2"><Avatar author={comment.author} /><p className="comment-panel__comment-text text-[#44474c]"><strong className="comment-panel__author mr-1 text-[#1b1c19]">@{comment.author}</strong>{comment.body}<span className="ml-1.5 font-mono text-[10px] text-[#8d8d87]">{comment.createdAt}</span></p></div>{comment.replies.map((reply) => <div key={reply.id} className="ml-7 mt-2 flex gap-2 border-l border-[#e4e2dd] pl-2"><Avatar author={reply.author} small /><p className="comment-panel__comment-text text-[#55575c]"><strong className="comment-panel__author mr-1 text-[#1b1c19]">@{reply.author}</strong>{reply.body}<span className="ml-1.5 font-mono text-[10px] text-[#8d8d87]">{reply.createdAt}</span></p></div>)}</div>)}</> : <p className="py-2 text-xs text-[#74777d]">첫 번째 의견을 남겨 보세요.</p>}</div>
        {hasMore && <button type="button" onClick={() => setVisibleCount((count) => count + 10)} className="mx-4 flex w-[calc(100%-2rem)] items-center justify-center gap-1 border-t border-[#e4e2dd] py-3 text-xs font-bold text-[#735c00]"><span className="material-symbols-outlined text-base">expand_more</span>댓글 10개 더 보기</button>}
        <form className="comment-panel__form" onSubmit={(event) => { event.preventDefault(); onSubmit(); }}><label className="sr-only" htmlFor="comment-draft">댓글 작성</label><span className="material-symbols-outlined text-[23px] text-[#44474c]">sentiment_satisfied</span><input id="comment-draft" value={draft} onChange={(event) => onDraftChange(event.target.value)} maxLength="500" placeholder="댓글 달기..." className="min-w-0 flex-1 border-0 bg-transparent px-1 py-2 text-xs text-[#1b1c19] placeholder:text-[#8d8d87] focus:outline-none" /><button type="submit" disabled={!draft.trim()} className="text-xs font-bold text-[#5865F2] disabled:cursor-not-allowed disabled:opacity-40">게시</button></form>
      </div>
    </div>
  </section>;
}

/** 정의: 작성자 핸들의 첫 글자로 만드는 개인정보 비노출형 아바타다. */
function Avatar({ author, small = false }) { return <span aria-hidden="true" className={`flex shrink-0 items-center justify-center rounded-full bg-primary-container/40 font-mono font-bold text-cyan-glow ${small ? 'h-4 w-4 text-[8px]' : 'h-5 w-5 text-[9px]'}`}>{author.slice(0, 1).toUpperCase()}</span>; }
