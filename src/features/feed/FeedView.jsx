import { useEffect, useRef, useState } from 'react';
import { Bookmark, Pencil, Share2, Trash2, UserCheck, UserPlus } from 'lucide-react';
import { getSampleStatus, SAMPLE_STATUS } from '../../services/mockApi.js';
import { enterNativeVideoFullscreen } from './videoFullscreen.js';
import MothMark from '../../components/brand/MothMark.jsx';
import { formatPublishedTime } from '../../services/publishedTime.js';
import ResultCard from './ResultCard.jsx';
import ShareResultCard from './ShareResultCard.jsx';

/** 정의: 카드 전환 제스처가 아닌, 사용자의 스크롤 거리를 그대로 반영하는 연속 피드다. */
export default function FeedView({ locale = 'ko', categories, cards, activeCategory, hasMore = false, onLoadMore, votedIds, boostCandidateIds, liveReactions = [], savedPostIds, followingIds, currentUserId, onCategoryChange, onShuffle, onVote, onShare, onToggleSave, onToggleFollow, onBlockAuthor, onReportPost, onBoost, onStartUpload, onAddComment, onEditComment, onDeleteComment, onLoadComments }) {
  const [expandedPost, setExpandedPost] = useState(null);
  const [draft, setDraft] = useState('');
  const [clockNow, setClockNow] = useState(() => Date.now());
  const categoryRailRef = useRef(null);
  const categoryDrag = useRef(null);
  const feedRef = useRef(null);
  const pageSentinelRef = useRef(null);
  const loadMoreRef = useRef(onLoadMore);
  const loadMoreInFlight = useRef(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState(false);
  loadMoreRef.current = onLoadMore;
  useEffect(() => {
    const timer = window.setInterval(() => setClockNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    const sentinel = pageSentinelRef.current;
    if (!hasMore || !sentinel || !('IntersectionObserver' in window)) return undefined;
    const section = feedRef.current;
    const main = section?.closest('.editorial-main--feed');
    const sectionScrollable = section && /^(auto|scroll)$/.test(window.getComputedStyle(section).overflowY);
    const root = sectionScrollable ? section : main;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !loadMoreInFlight.current) void requestNextPage();
    }, { root, rootMargin: '640px 0px', threshold: 0 });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [cards.length, hasMore]);
  /** 정의: PC에서도 스크롤바 없이 카테고리 탭 띠를 잡아 좌우로 탐색한다. */
  function startCategoryDrag(event) {
    // A tap on a category button must remain a click; only the empty rail is draggable.
    if (event.target.closest('button')) { categoryDrag.current = null; return; }
    categoryDrag.current = { x: event.clientX, scrollLeft: categoryRailRef.current?.scrollLeft ?? 0 };
  }
  function moveCategoryDrag(event) { if (!categoryDrag.current || !categoryRailRef.current) return; categoryRailRef.current.scrollLeft = categoryDrag.current.scrollLeft - (event.clientX - categoryDrag.current.x); }
  function endCategoryDrag() { categoryDrag.current = null; }

  const expandedCard = expandedPost ? cards.find((item) => item.id === expandedPost.card.id) : null;
  return <>
    <div ref={categoryRailRef} onPointerDown={startCategoryDrag} onPointerMove={moveCategoryDrag} onPointerUp={endCategoryDrag} onPointerCancel={endCategoryDrag} className="feed-category-rail relative z-40 mb-0 flex w-full shrink-0 cursor-grab items-center gap-1 overflow-x-auto px-4 py-0.5 no-scrollbar touch-pan-x active:cursor-grabbing">
      <CategoryButton label="셔플" active={activeCategory === 'ALL'} color="#00f0ff" idleColor="#735c00" icon="shuffle" onClick={onShuffle} />
      {Object.entries(categories).map(([id, category]) => <CategoryButton key={id} label={category.label} active={activeCategory === id} color={category.color} onClick={() => onCategoryChange(id)} />)}
    </div>

    {cards.length ? <section ref={feedRef} className="editorial-feed editorial-feed--scroll relative flex w-full min-h-0 flex-col items-center">
      <div className="media-carousel media-carousel--scroll relative w-full">
        {cards.map((item) => <FeedPost key={item.id} card={item} locale={locale} categories={categories} clockNow={clockNow} hasVoted={votedIds?.has(item.id)} isOwnPost={Boolean(item.authorId === currentUserId || (item.isMyUpload && !item.authorId))} boostEligible={boostCandidateIds?.has(item.id)} boostRequested={item.boostStatus === 'active'} liveReactions={liveReactions.filter((reaction) => reaction.postId === item.id)} saved={savedPostIds?.has(item.id)} following={followingIds?.has(item.authorId ?? `sample:${String(item.author).trim().toLowerCase()}`)} currentUserId={currentUserId} onVote={onVote} onShare={onShare} onToggleSave={onToggleSave} onToggleFollow={onToggleFollow} onBlockAuthor={onBlockAuthor} onReportPost={onReportPost} onBoost={onBoost} onStartUpload={onStartUpload} onOpenComments={(post) => { setExpandedPost(post); setDraft(''); void onLoadComments?.(post.card.id); }} />)}
      </div>
      {hasMore && <div ref={pageSentinelRef} className="feed-page-sentinel" aria-live="polite">
        {loadMoreError || !('IntersectionObserver' in window) ? <button type="button" disabled={loadingMore} onClick={() => void requestNextPage()}>{loadingMore ? (locale === 'en' ? 'Loading…' : '불러오는 중…') : (locale === 'en' ? 'Load more' : '더 불러오기')}</button> : null}
      </div>}
      {expandedPost && expandedCard && <CommentPanel locale={locale} card={expandedCard} timestamp={expandedPost.timestamp} media={expandedPost.media} comments={expandedCard.comments ?? []} currentUserId={currentUserId} draft={draft} onDraftChange={setDraft} onClose={() => setExpandedPost(null)} onSubmit={async () => { if (await onAddComment(expandedCard.id, draft)) setDraft(''); }} onEdit={(commentId, body) => onEditComment?.(expandedCard.id, commentId, body)} onDelete={(commentId) => onDeleteComment?.(expandedCard.id, commentId)} />}
    </section> : <EmptyFeed locale={locale} onStartUpload={onStartUpload} />}
  </>;

  async function requestNextPage() {
    if (loadMoreInFlight.current || !loadMoreRef.current) return;
    loadMoreInFlight.current = true;
    setLoadingMore(true);
    setLoadMoreError(false);
    try {
      const loaded = await loadMoreRef.current();
      if (loaded === false) setLoadMoreError(true);
    } catch {
      setLoadMoreError(true);
    } finally {
      loadMoreInFlight.current = false;
      setLoadingMore(false);
    }
  }
}

function FeedPost({ card, locale, categories, clockNow, hasVoted, isOwnPost, boostEligible, boostRequested, liveReactions, saved, following, currentUserId, onVote, onShare, onToggleSave, onToggleFollow, onBlockAuthor, onReportPost, onBoost, onStartUpload, onOpenComments }) {
  const [mediaIndex, setMediaIndex] = useState(0);
  const [nearViewport, setNearViewport] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [saveNotice, setSaveNotice] = useState('');
  const [reportOpen, setReportOpen] = useState(false);
  const [sharePreviewOpen, setSharePreviewOpen] = useState(false);
  const videoRef = useRef(null);
  const articleRef = useRef(null);
  const mediaTrackRef = useRef(null);
  const mediaSwipeStart = useRef(null);
  useEffect(() => { setMediaIndex(0); setIsVideoPlaying(false); setSaveNotice(''); }, [card.id]);
  useEffect(() => {
    const article = articleRef.current;
    if (!article) return undefined;
    if (!('IntersectionObserver' in window)) { setNearViewport(true); return undefined; }
    const feed = article.closest('.editorial-feed--scroll');
    const main = article.closest('.editorial-main--feed');
    const feedScrollable = feed && /^(auto|scroll)$/.test(window.getComputedStyle(feed).overflowY);
    const observer = new IntersectionObserver(([entry]) => setNearViewport(entry.isIntersecting), {
      root: feedScrollable ? feed : main,
      rootMargin: '480px 0px',
      threshold: 0,
    });
    observer.observe(article);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!nearViewport) {
      videoRef.current?.pause();
      setIsVideoPlaying(false);
    }
  }, [nearViewport]);
  const theme = categories[card.category];
  const media = card.media?.length ? card.media : [{ id: `${card.id}-main`, type: card.mediaType ?? 'image', url: card.imageUrl, objectPosition: card.objectPosition }];
  const activeMedia = media[mediaIndex];
  const isVideo = activeMedia?.type === 'video' || String(activeMedia?.type ?? '').startsWith('video/');
  const isAge = card.evaluationType === 'NUMERIC_AGE';
  const total = isAge ? card.ageVoteCount : card.yesVotes + card.noVotes;
  const yesPercent = isAge || total === 0 ? 0 : Math.round((card.yesVotes / total) * 100);
  const noPercent = 100 - yesPercent;
  const timestamp = formatPublishedTime(card.publishedAt, { locale, now: clockNow }) || card.timestamp;
  const authorKey = card.authorId ?? `sample:${String(card.author).trim().toLowerCase()}`;
  function selectMedia(nextIndex) {
    const boundedIndex = Math.max(0, Math.min(media.length - 1, nextIndex));
    if (boundedIndex !== mediaIndex) {
      videoRef.current?.pause();
      setIsVideoPlaying(false);
      setMediaIndex(boundedIndex);
    }
  }
  function startMediaSwipe(event) {
    const target = event.target instanceof Element ? event.target : null;
    if (media.length < 2 || event.touches.length !== 1 || target?.closest('button, a, input, textarea, select, [role="dialog"]')) {
      mediaSwipeStart.current = null;
      return;
    }
    const touch = event.touches[0];
    if (target instanceof HTMLVideoElement) {
      const bounds = target.getBoundingClientRect();
      if (touch.clientY >= bounds.bottom - 58) { mediaSwipeStart.current = null; return; }
    }
    mediaSwipeStart.current = { x: touch.clientX, y: touch.clientY, time: event.timeStamp, width: event.currentTarget.getBoundingClientRect().width };
    mediaTrackRef.current?.classList.add('media-track--dragging');
  }
  function moveMediaSwipe(event) {
    const start = mediaSwipeStart.current;
    const touch = event.touches[0];
    if (!start || !touch || Math.abs(touch.clientX - start.x) <= Math.abs(touch.clientY - start.y)) return;
    const deltaX = touch.clientX - start.x;
    const atEdge = (mediaIndex === 0 && deltaX > 0) || (mediaIndex === media.length - 1 && deltaX < 0);
    const resistedDelta = atEdge ? deltaX * 0.28 : deltaX;
    mediaTrackRef.current?.style.setProperty('--media-drag-offset', `${resistedDelta}px`);
  }
  function finishMediaSwipe(event) {
    const start = mediaSwipeStart.current;
    mediaSwipeStart.current = null;
    mediaTrackRef.current?.classList.remove('media-track--dragging');
    const touch = event.changedTouches[0];
    if (!start || !touch || media.length < 2) { mediaTrackRef.current?.style.removeProperty('--media-drag-offset'); return; }
    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;
    const velocity = Math.abs(deltaX) / Math.max(1, event.timeStamp - start.time);
    const shouldAdvance = Math.abs(deltaX) >= start.width * 0.2 || (Math.abs(deltaX) >= 28 && velocity >= 0.35);
    const horizontal = Math.abs(deltaX) > Math.abs(deltaY);
    const direction = deltaX < 0 ? 1 : -1;
    mediaTrackRef.current?.style.removeProperty('--media-drag-offset');
    if (!horizontal || !shouldAdvance) return;
    selectMedia(mediaIndex + direction);
  }
  async function toggleSaved() { const result = await onToggleSave(card.id); if (result?.ok) setSaveNotice(result.saved ? (locale === 'en' ? 'Saved to Scraps' : '스크랩에 저장됨') : (locale === 'en' ? 'Removed from Scraps' : '스크랩에서 제거됨')); }
  const stopVideoControlGesture = (event) => event.stopPropagation();
  const toggleInlinePlayback = (event) => {
    event.preventDefault();
    event.stopPropagation();
    const video = videoRef.current;
    if (!video) return;
    if (!video.paused) { video.pause(); return; }
    if (video.ended) video.currentTime = 0;
    void video.play().catch(() => setIsVideoPlaying(false));
  };
  const toggleInlinePlaybackFromClick = (event) => {
    if (event.detail === 0) toggleInlinePlayback(event);
    else event.stopPropagation();
  };
  const enterFullscreen = (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (videoRef.current) enterNativeVideoFullscreen(videoRef.current);
  };
  return <article ref={articleRef} onTouchStart={startMediaSwipe} onTouchMove={moveMediaSwipe} onTouchEnd={finishMediaSwipe} onTouchCancel={() => { mediaSwipeStart.current = null; mediaTrackRef.current?.classList.remove('media-track--dragging'); mediaTrackRef.current?.style.removeProperty('--media-drag-offset'); }} className="media-card feed-post-card relative z-10 w-full overflow-hidden rounded-xl border border-surface-container-high/60 bg-[#fbfaf7] shadow-2xl">
    <div className="media-primary absolute overflow-hidden"><div ref={mediaTrackRef} className="media-primary__track" style={{ transform: `translate3d(calc(${-mediaIndex * 100}% + var(--media-drag-offset, 0px)), 0, 0)` }}>{media.map((slide, index) => <div key={slide.id ?? `${card.id}-media-${index}`} className="media-primary__slide"><CardMedia card={card} media={slide} className="h-full w-full object-cover object-center brightness-[1.02] contrast-[1.03]" showFullscreen={nearViewport && index === mediaIndex} videoControlRef={index === mediaIndex ? videoRef : undefined} onPlaybackChange={index === mediaIndex ? setIsVideoPlaying : undefined} loaded={nearViewport && Math.abs(index - mediaIndex) <= 1} interactive={nearViewport && index === mediaIndex} /></div>)}</div></div>
    {!isVideo && <div className="pointer-events-none absolute inset-0 z-10 bg-[linear-gradient(180deg,rgba(1,8,17,.62)_0%,rgba(1,8,17,.05)_32%,rgba(1,8,17,.12)_52%,rgba(1,8,17,.88)_100%)]" />}
    {media.length > 1 && <div className="media-card-photo-nav" aria-label="사진 탐색"><button type="button" onClick={() => selectMedia(mediaIndex - 1)} aria-label="이전 사진" className={`media-card-photo-nav__button media-card-photo-nav__button--left ${mediaIndex === 0 ? 'invisible' : ''}`}><span className="material-symbols-outlined">chevron_left</span></button><button type="button" onClick={() => selectMedia(mediaIndex + 1)} aria-label="다음 사진" className={`media-card-photo-nav__button media-card-photo-nav__button--right ${mediaIndex === media.length - 1 ? 'invisible' : ''}`}><span className="material-symbols-outlined">chevron_right</span></button></div>}
    <div className="scan-line absolute left-0 top-0 z-20 h-px w-full" style={{ backgroundColor: theme.color, boxShadow: `0 0 13px 2px ${theme.color}` }} />
    <div className="feed-top-overlay"><div className="feed-top-overlay__row"><div className="flex items-center gap-1 rounded-full border border-white/20 bg-black/35 px-2 py-0.5 shadow-lg backdrop-blur-sm"><span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ backgroundColor: theme.color, boxShadow: `0 0 8px ${theme.color}` }} /><span className="font-mono text-[8px] font-bold leading-none tracking-wide text-white">LIVE STREAM</span><time dateTime={card.publishedAt || undefined} className="font-mono text-[8px] leading-none text-white/75">{timestamp}</time></div><UserBadge author={card.author} canFollow={Boolean(card.author) && !isOwnPost && card.authorId !== currentUserId} canReport={Boolean(currentUserId && card.authorId) && card.authorId !== currentUserId} following={following} onToggleFollow={() => onToggleFollow?.(authorKey)} onBlock={() => onBlockAuthor?.(authorKey, card.author)} onReport={() => setReportOpen(true)} /></div><div className="feed-top-overlay__category"><CategoryBadge theme={theme} category={card.category} /></div></div>
    {media.length > 1 && <MediaProgress locale={locale} media={media} mediaIndex={mediaIndex} color={theme.color} onSelect={selectMedia} />}
    <div className="card-details absolute bottom-0 left-0 z-20 flex w-full flex-col px-4 pb-2 pt-9"><div className="mb-2 pr-[4.5rem] sm:pr-20"><h2 className="feed-card__question whitespace-pre-line font-headline text-lg font-bold leading-snug text-white sm:text-xl">{card.question}</h2></div>
      {hasVoted || isOwnPost || liveReactions.length ? <>{isAge ? <AgeResult locale={locale} card={card} category={theme} color={theme.color} onBoost={isOwnPost && boostEligible && !boostRequested ? () => onBoost(card) : undefined} onStartUpload={onStartUpload} uploadLabel={isOwnPost ? (locale === 'en' ? 'Get feedback on another look' : '다른 모습 평가받기') : (locale === 'en' ? 'Get feedback too' : '나도 평가받기')} /> : <Result locale={locale} card={card} category={theme} yesPercent={yesPercent} noPercent={noPercent} total={total} color={theme.color} onBoost={isOwnPost && boostEligible && !boostRequested ? () => onBoost(card) : undefined} onStartUpload={onStartUpload} uploadLabel={isOwnPost ? (locale === 'en' ? 'Get feedback on another look' : '다른 모습 평가받기') : (locale === 'en' ? 'Get feedback too' : '나도 평가받기')} />}{liveReactions.length > 0 && <LiveReactionBalloons reactions={liveReactions} />}</> : isAge ? <AgeVotePanel card={card} color={theme.color} onVote={(value) => onVote(value, card)} /> : <div className="flex w-full gap-2.5"><button type="button" onClick={() => onVote(true, card)} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border py-1 text-[13px] font-extrabold tracking-wider text-[#051424] active:scale-95" style={{ borderColor: theme.color, backgroundColor: theme.color }}>YES <span className="material-symbols-outlined text-[15px]">check_circle</span></button><button type="button" onClick={() => onVote(false, card)} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border bg-surface-container-low/70 py-1 text-[13px] font-bold tracking-wider active:scale-95" style={{ borderColor: `${theme.color}aa`, color: theme.color }}>NO <span className="material-symbols-outlined text-[15px]">cancel</span></button></div>}
      {card.commentsAllowed && <CommentPreview locale={locale} comments={card.comments ?? []} saved={saved} color={theme.color} notice={saveNotice} onToggleSave={toggleSaved} onShare={() => setSharePreviewOpen(true)} onExpand={() => onOpenComments({ card, media: activeMedia, timestamp })} />}
    </div>
    {isVideo && nearViewport && <div className="video-card-controls absolute inset-0 z-30 pointer-events-none"><button type="button" data-video-play-button aria-pressed={isVideoPlaying} aria-label={locale === 'en' ? (isVideoPlaying ? 'Pause video' : 'Play video') : (isVideoPlaying ? '동영상 일시정지' : '동영상 재생')} title={locale === 'en' ? (isVideoPlaying ? 'Pause video' : 'Play video') : (isVideoPlaying ? '동영상 일시정지' : '동영상 재생')} className="video-card-play-button" onPointerDown={stopVideoControlGesture} onPointerMove={stopVideoControlGesture} onPointerUp={toggleInlinePlayback} onClick={toggleInlinePlaybackFromClick}><span className="material-symbols-outlined" aria-hidden="true">{isVideoPlaying ? 'pause' : 'play_arrow'}</span></button><button type="button" data-video-fullscreen-button aria-label={locale === 'en' ? 'View video fullscreen' : '동영상 전체 화면'} title={locale === 'en' ? 'Fullscreen' : '전체 화면'} className="video-fullscreen-button" onPointerDown={stopVideoControlGesture} onPointerMove={stopVideoControlGesture} onPointerUp={stopVideoControlGesture} onClick={enterFullscreen}><span className="material-symbols-outlined" aria-hidden="true">fullscreen</span></button></div>}
    {reportOpen && <ReportDialog locale={locale} author={card.author} onClose={() => setReportOpen(false)} onSubmit={(reason) => onReportPost?.(card.id, reason)} />}
    {sharePreviewOpen && <ShareResultCard locale={locale} card={card} category={theme} color={theme.color} total={total} yesPercent={yesPercent} noPercent={noPercent} onClose={() => setSharePreviewOpen(false)} onShare={() => onShare(card)} />}
  </article>;
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

const REPORT_REASON_OPTIONS = [
  ['harassment', '괴롭힘 또는 위협', 'Harassment or threat'],
  ['sexual_content', '성적이거나 부적절한 콘텐츠', 'Sexual or inappropriate content'],
  ['privacy', '개인정보 노출', 'Privacy exposure'],
  ['spam', '스팸 또는 사기', 'Spam or scam'],
  ['hate', '혐오 또는 차별', 'Hate or discrimination'],
  ['defamation', '명예훼손 또는 허위 정보', 'Defamation or false information'],
  ['social_norm_violation', '사회 규범 위반', 'Violation of community norms'],
  ['other', '기타', 'Other'],
];

function ReportDialog({ locale, author, onClose, onSubmit }) {
  const korean = locale !== 'en';
  const [reason, setReason] = useState('harassment');
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState('');

  async function submit() {
    if (submitting) return;
    setSubmitting(true);
    setNotice('');
    const result = await onSubmit(reason);
    setSubmitting(false);
    if (result?.ok) {
      setNotice(korean ? '신고가 접수됐어요.' : 'Your report was received.');
      window.setTimeout(onClose, 750);
    } else {
      // The App toast carries the exact duplicate or retryable-error message.
      // Close this higher-layer dialog so that announcement is immediately visible.
      onClose();
    }
  }

  return <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/55 p-3 sm:items-center" role="presentation" onClick={submitting ? undefined : onClose}>
    <section role="dialog" aria-modal="true" aria-label={korean ? '게시물 신고' : 'Report post'} className="w-full max-w-sm rounded-xl bg-white p-4 shadow-2xl" onClick={(event) => event.stopPropagation()}>
      <div className="mb-3 flex items-start justify-between gap-3"><div><h2 className="text-base font-bold text-[#1b1c19]">{korean ? '게시물 신고' : 'Report post'}</h2><p className="mt-1 text-xs leading-relaxed text-[#74777d]">{korean ? `@${author}에게 신고자 정보는 공개되지 않습니다.` : `@${author} cannot see who reported this post.`}</p></div><button type="button" disabled={submitting} onClick={onClose} aria-label={korean ? '신고 닫기' : 'Close report'} className="text-xl leading-none text-[#74777d] disabled:opacity-40">×</button></div>
      <div className="space-y-1.5">{REPORT_REASON_OPTIONS.map(([value, koreanLabel, englishLabel]) => <label key={value} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${reason === value ? 'border-[#d94c70] bg-[#fff5f7] text-[#8e183c]' : 'border-[#e4e2dd] text-[#44474c]'}`}><input type="radio" name="report-reason" value={value} checked={reason === value} disabled={submitting} onChange={() => setReason(value)} />{korean ? koreanLabel : englishLabel}</label>)}</div>
      {notice && <p role="status" className="mt-3 rounded-md bg-[#edf9f1] px-3 py-2 text-xs font-semibold text-[#176b3a]">{notice}</p>}
      <div className="mt-4 flex justify-end gap-2"><button type="button" disabled={submitting} onClick={onClose} className="rounded-md px-3 py-2 text-xs font-semibold text-[#55575c] disabled:opacity-40">{korean ? '취소' : 'Cancel'}</button><button type="button" disabled={submitting} onClick={submit} className="rounded-md bg-[#d94c70] px-3 py-2 text-xs font-bold text-white disabled:opacity-55">{submitting ? (korean ? '접수 중...' : 'Sending...') : (korean ? '신고 접수' : 'Send report')}</button></div>
    </section>
  </div>;
}
/** 정의: LIVE·작성자 배지와 같은 상단 오버레이 행 중앙에 다중 사진 진행 표시기를 둔다. */
function MediaProgress({ locale, media, mediaIndex, color, onSelect }) { return <div className="media-progress absolute left-1/2 top-3 z-30 flex -translate-x-1/2 items-center gap-1" aria-label={locale === 'en' ? `${media.length} uploaded photos` : `등록된 사진 ${media.length}장`}>{media.map((item, index) => <button key={item.id} type="button" aria-label={locale === 'en' ? `View photo ${index + 1}` : `${index + 1}번째 사진 보기`} aria-current={mediaIndex === index ? 'true' : undefined} onClick={() => onSelect(index)} className="rounded-full p-0"><span className="block rounded-full transition-colors" style={{ backgroundColor: mediaIndex === index ? color : 'rgba(255,255,255,.52)' }} /></button>)}</div>; }
/** 정의: 사진 또는 동영상 카드 자산을 동일한 피드 미디어 규칙으로 렌더링한다. */
function CardMedia({ card, media, className, muted = false, showFullscreen = false, videoControlRef, onPlaybackChange, interactive = true, loaded = interactive }) {
  const source = media ?? { type: card.mediaType ?? 'image', url: card.imageUrl, objectPosition: card.objectPosition };
  const isVideo = source.type === 'video' || String(source.type ?? '').startsWith('video/');
  const videoPoster = useVideoPoster(isVideo && interactive ? source.url : '');
  const localVideoRef = useRef(null);
  const videoRef = videoControlRef ?? localVideoRef;
  const protectMedia = (event) => event.preventDefault();
  const isolateVideoTouch = (event) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    if (event.clientY >= bounds.bottom - 58) event.stopPropagation();
  };
  const reportVideoEvent = (event) => {
    if (event.type === 'play') onPlaybackChange?.(true);
    if (['pause', 'ended', 'error'].includes(event.type)) onPlaybackChange?.(false);
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
  if (!isVideo) return <img className={className} style={{ objectPosition: source.objectPosition ?? card.objectPosition }} src={loaded ? source.url : undefined} loading={loaded ? 'eager' : 'lazy'} alt={`${card.author}의 ${card.category} 사진`} draggable="false" onContextMenu={protectMedia} onDragStart={protectMedia} />;
  const video = <video ref={videoRef} className={className} style={{ objectPosition: source.objectPosition ?? card.objectPosition }} src={interactive ? source.url : undefined} poster={videoPoster || undefined} autoPlay={Boolean(muted)} loop={Boolean(muted)} muted={muted || undefined} playsInline preload={interactive ? (showFullscreen && !muted ? 'auto' : 'metadata') : 'none'} controls={interactive && !muted && !showFullscreen} draggable="false" onLoadedMetadata={reportVideoEvent} onCanPlay={reportVideoEvent} onPlay={reportVideoEvent} onPause={reportVideoEvent} onEnded={reportVideoEvent} onWaiting={reportVideoEvent} onStalled={reportVideoEvent} onError={reportVideoEvent} onPointerDown={isolateVideoTouch} onPointerMove={isolateVideoTouch} onPointerUp={isolateVideoTouch} onPointerCancel={isolateVideoTouch} onContextMenu={protectMedia} onDragStart={protectMedia} aria-label={`${card.author}의 ${card.category} 동영상`} />;
  return video;
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
function Result({ locale, card, category, yesPercent, noPercent, total, color, onBoost, onStartUpload, uploadLabel }) {
  const noColor = '#B42318';
  const sampleStatus = getSampleStatus(total);
  const canOfferBoost = sampleStatus === SAMPLE_STATUS.EARLY_SIGNAL || sampleStatus === SAMPLE_STATUS.BASE_RESULT;
  if (total === 0) return <ResultCard locale={locale} card={card} category={category} total={total} color={color} onBoost={onBoost} onStartUpload={onStartUpload} uploadLabel={uploadLabel}><p className="text-[11px] leading-relaxed text-white/80">{locale === 'en' ? 'No ratings yet. Would you like to reach more people?' : '아직 평가가 모이지 않았어요. 더 많은 사람에게 보여드려 볼까요?'}</p></ResultCard>;
  return <ResultCard locale={locale} card={card} category={category} total={total} color={color} sampleStatus={sampleStatus} onBoost={canOfferBoost ? onBoost : undefined} onStartUpload={onStartUpload} uploadLabel={uploadLabel}><div className="mb-1 flex items-center justify-between font-mono text-xs font-bold"><span className="flex items-center gap-1" style={{ color }}><span className="material-symbols-outlined text-[14px]">thumb_up</span> YES {yesPercent}%</span><span className="flex items-center gap-1" style={{ color: noColor }}>NO {noPercent}% <span className="material-symbols-outlined text-[14px]">thumb_down</span></span></div><div className="flex h-2 w-full overflow-hidden rounded-full border border-[#101828] bg-slate-800"><span className="result-bar--yes" style={{ width: `${yesPercent}%`, backgroundColor: color }} /><span className="result-bar--no" style={{ width: `${noPercent}%`, backgroundColor: noColor }} /></div></ResultCard>;
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
function AgeResult({ locale, card, category, color, onBoost, onStartUpload, uploadLabel }) {
  const total = card.ageVoteCount ?? 0;
  const sampleStatus = getSampleStatus(total);
  const canOfferBoost = sampleStatus === SAMPLE_STATUS.EARLY_SIGNAL || sampleStatus === SAMPLE_STATUS.BASE_RESULT;
  if (total === 0) return <ResultCard locale={locale} card={card} category={category} total={total} color={color} onBoost={onBoost} onStartUpload={onStartUpload} uploadLabel={uploadLabel}><p className="text-[11px] leading-relaxed text-white/80">{locale === 'en' ? 'No ratings yet. Would you like to reach more people?' : '아직 평가가 모이지 않았어요. 더 많은 사람에게 보여드려 볼까요?'}</p></ResultCard>;
  return <ResultCard locale={locale} card={card} category={category} total={total} color={color} sampleStatus={sampleStatus} onBoost={canOfferBoost ? onBoost : undefined} onStartUpload={onStartUpload} uploadLabel={uploadLabel}><div className="flex items-end justify-between"><span><span className="block text-[10px] text-white/80">{locale === 'en' ? 'Average perceived age' : '평균 예상 나이'}</span><strong className="font-mono text-2xl" style={{ color }}>{card.ageEstimate.toFixed(1)}<small className="ml-0.5 text-xs">{locale === 'en' ? 'years' : '세'}</small></strong></span><span className="text-right text-[10px] text-white/80">{locale === 'en' ? <>Participants’ subjective<br />evaluation</> : <>참여자의 주관적<br />평가예요</>}</span></div></ResultCard>;
}

/** 정의: 카드 위에 첫 댓글만 간결하게 보여 주고 전체 댓글 열기를 제공하는 요약 영역이다. */
function CommentPreview({ locale, comments, saved, color, notice, onToggleSave, onShare, onExpand }) {
  const comment = comments[0];
  return <div className="comment-preview relative mt-2 overflow-hidden bg-gradient-to-b from-transparent via-[#061225]/10 to-transparent px-1 py-1.5" aria-label="댓글 미리보기">
    <div className="absolute right-0 top-1/2 z-10 flex h-6 -translate-y-1/2 items-center gap-0"><p role="status" aria-live="polite" className="sr-only">{notice}</p><button type="button" onClick={onToggleSave} aria-pressed={saved} aria-label={locale === 'en' ? (saved ? 'Remove from Scraps' : 'Save to Scraps') : (saved ? '스크랩에서 제거' : '스크랩에 저장')} title={locale === 'en' ? (saved ? 'Remove from Scraps' : 'Save to Scraps') : (saved ? '스크랩에서 제거' : '스크랩에 저장')} className="comment-preview__scrap"><Bookmark aria-hidden="true" size={16} strokeWidth={2.1} fill={saved ? 'currentColor' : 'none'} style={{ color: saved ? color : undefined }} /></button><button type="button" onClick={onShare} aria-label={locale === 'en' ? 'Share this post' : '이 게시물 공유하기'} title={locale === 'en' ? 'Share' : '공유하기'} className="flex h-6 w-6 items-center justify-center text-white/80 transition-colors hover:text-white active:scale-90"><Share2 aria-hidden="true" size={16} strokeWidth={2.1} /></button><button type="button" onClick={onExpand} aria-label="댓글 더 보기" className="flex h-6 items-center gap-0.5 px-1 text-[12px] font-bold text-cyan-glow"><span>더 보기</span><span className="material-symbols-outlined text-[16px]">more_horiz</span></button></div>
    {comment ? <button type="button" onClick={onExpand} className="comment-preview__text block w-full truncate pr-32 text-left text-white/90 transition-colors hover:text-white focus:outline-none focus-visible:text-white"><strong className="comment-preview__author mr-1 text-cyan-50">@{comment.author}</strong>{comment.body}</button> : <button type="button" onClick={onExpand} className="comment-preview__empty pr-32 text-left text-slate-300/80 transition-colors hover:text-white focus:outline-none focus-visible:text-white">첫 번째 댓글을 남겨 보세요.</button>}
  </div>;
}

/** 정의: PC에서는 사진과 댓글을 나란히 보여 주는 게시물 상세 모달, 모바일에서는 확장 댓글 영역을 제공한다. */
function CommentPanel({ card, timestamp, media, comments, currentUserId, draft, onDraftChange, onClose, onSubmit, onEdit, onDelete }) {
  const [visibleCount, setVisibleCount] = useState(10);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingBody, setEditingBody] = useState('');
  const mediaItems = card.media?.length ? card.media : [media];
  const [mediaIndex, setMediaIndex] = useState(() => Math.max(0, mediaItems.findIndex((item) => item?.id === media?.id)));
  useEffect(() => { setVisibleCount(10); setEditingCommentId(null); }, [comments.length]);
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
        <div className="comment-panel__comments">{visibleComments.length ? visibleComments.map((comment) => <div key={comment.id} className="mb-4"><div className="flex gap-2"><Avatar author={comment.author} /><div className="min-w-0 flex-1">{editingCommentId === comment.id ? <form className="flex items-center gap-1" onSubmit={async (event) => { event.preventDefault(); if (await onEdit?.(comment.id, editingBody)) setEditingCommentId(null); }}><input aria-label="댓글 수정" value={editingBody} onChange={(event) => setEditingBody(event.target.value)} maxLength="500" className="min-w-0 flex-1 border-b border-[#735c00] bg-transparent py-0.5 text-xs text-[#1b1c19] focus:outline-none" autoFocus /><button type="submit" disabled={!editingBody.trim()} className="text-[11px] font-bold text-[#735c00] disabled:opacity-40">저장</button><button type="button" onClick={() => setEditingCommentId(null)} className="text-[11px] text-[#74777d]">취소</button></form> : <div className="flex items-start gap-1"><p className="comment-panel__comment-text min-w-0 flex-1 text-[#44474c]"><strong className="comment-panel__author mr-1 text-[#1b1c19]">@{comment.author}</strong>{comment.body}<span className="ml-1.5 font-mono text-[10px] text-[#8d8d87]">{comment.createdAt}</span></p>{comment.authorId === currentUserId && <span className="flex shrink-0 items-center gap-0.5"><button type="button" onClick={() => { setEditingCommentId(comment.id); setEditingBody(comment.body); }} aria-label="댓글 수정" title="댓글 수정" className="flex h-6 w-6 items-center justify-center text-[#74777d] hover:text-[#735c00]"><Pencil size={13} /></button><button type="button" onClick={() => onDelete?.(comment.id)} aria-label="댓글 삭제" title="댓글 삭제" className="flex h-6 w-6 items-center justify-center text-[#74777d] hover:text-[#cb2b58]"><Trash2 size={13} /></button></span>}</div>}</div></div>{comment.replies.map((reply) => <div key={reply.id} className="ml-7 mt-2 flex gap-2 border-l border-[#e4e2dd] pl-2"><Avatar author={reply.author} small /><p className="comment-panel__comment-text text-[#55575c]"><strong className="comment-panel__author mr-1 text-[#1b1c19]">@{reply.author}</strong>{reply.body}<span className="ml-1.5 font-mono text-[10px] text-[#8d8d87]">{reply.createdAt}</span></p></div>)}</div>) : <p className="py-2 text-xs text-[#74777d]">첫 번째 의견을 남겨 보세요.</p>}</div>
        {hasMore && <button type="button" onClick={() => setVisibleCount((count) => count + 10)} className="mx-4 flex w-[calc(100%-2rem)] items-center justify-center gap-1 border-t border-[#e4e2dd] py-3 text-xs font-bold text-[#735c00]"><span className="material-symbols-outlined text-base">expand_more</span>댓글 10개 더 보기</button>}
        <form className="comment-panel__form" onSubmit={(event) => { event.preventDefault(); onSubmit(); }}><label className="sr-only" htmlFor="comment-draft">댓글 작성</label><span className="material-symbols-outlined text-[23px] text-[#44474c]">sentiment_satisfied</span><input id="comment-draft" value={draft} onChange={(event) => onDraftChange(event.target.value)} maxLength="500" placeholder="댓글 달기..." className="min-w-0 flex-1 border-0 bg-transparent px-1 py-2 text-xs text-[#1b1c19] placeholder:text-[#8d8d87] focus:outline-none" /><button type="submit" disabled={!draft.trim()} className="text-xs font-bold text-[#5865F2] disabled:cursor-not-allowed disabled:opacity-40">게시</button></form>
      </div>
    </div>
  </section>;
}

/** 정의: 작성자 핸들의 첫 글자로 만드는 개인정보 비노출형 아바타다. */
function Avatar({ author, small = false }) { return <span aria-hidden="true" className={`flex shrink-0 items-center justify-center rounded-full bg-primary-container/40 font-mono font-bold text-cyan-glow ${small ? 'h-4 w-4 text-[8px]' : 'h-5 w-5 text-[9px]'}`}>{author.slice(0, 1).toUpperCase()}</span>; }
