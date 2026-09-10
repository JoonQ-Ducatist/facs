import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { categories, initialCards } from './data/cards.js';
import FeedView from './features/feed/FeedView.jsx';
import UploadView from './features/upload/UploadView.jsx';
import RankingView from './features/ranking/RankingView.jsx';
import ProfileView from './features/profile/ProfileView.jsx';
import SplashView from './features/auth/SplashView.jsx';
import logoUrl from './assets/facs-snake-logo.png';
import StatePanel from './components/ui/StatePanel.jsx';
import SkipLink from './components/ui/SkipLink.jsx';
import { submitCardVote } from './services/voteService.js';
import { ANALYTICS_EVENT, trackEvent } from './services/analytics.js';
import { localeUrl, resolveLocale } from './services/locale.js';
import { applySeoMetadata } from './services/seo.js';
import { buildShareUrl } from './services/share.js';
import { supabase } from './services/supabaseClient.js';
import { createSupabasePublishedPost } from './services/supabaseApi.js';
import { getMyScrapPostIds, toggleMyScrap } from './services/scrapsApi.js';
import { getAuthCallbackCode, getAuthCallbackFailure, getPublicAuthConfig } from './services/authConfig.js';
import { AUTH_ACTION_ERROR, requestEmailMagicLink, signOutCurrentSession } from './services/authService.js';
import { checkHandleAvailability, getHandleSuggestionsWithAvailability, getMyProfile, isConfiguredHandle, updateMyHandle } from './services/profileService.js';

/** 정의: 앱 전역 하단 탐색 메뉴의 식별자·아이콘·표시명·선택 색상 목록이다. */
const tabs = [
  ['feed', 'dynamic_feed', 'Feed', '#2BA8E8'],
  ['upload', 'add_circle', 'Upload', '#E65B7A'],
  ['ranking', 'emoji_events', 'Ranking', '#18B9B5'],
  ['profile', 'account_circle', 'Profile', '#EAAF2D'],
];

/** 정의: 모바일은 전체 폭, PC·태블릿은 중앙 SNS 콘텐츠 컬럼으로 렌더링하는 반응형 프레임이다. */
function CanvasStage({ children }) { return <div className="app-stage"><div className="app-canvas">{children}</div></div>; }

/** 정의: 인증 진입, 탭 상태, 피드 목업 데이터와 사용자 상호작용을 조합하는 루트 화면 컴포넌트다. */
export default function App() {
  const [locale, setLocale] = useState(() => resolveLocale());
  const authConfig = useMemo(() => getPublicAuthConfig(import.meta.env ?? {}), []);
  const sharedPostId = new URLSearchParams(window.location.search).get('post');
  const authPreview = new URLSearchParams(window.location.search).get('authPreview') === '1';
  // 정의: 명시적 preview URL만 세션 유무와 관계없이 스플래시부터 시작한다.
  // 로컬 개발은 실제 Mailpit 인증 흐름을 검증할 수 있도록 세션을 그대로 반영한다.
  const previewMode = authPreview || new URLSearchParams(window.location.search).has('preview');
  const [isGuest, setIsGuest] = useState(() => previewMode || !sharedPostId);
  const [authReady, setAuthReady] = useState(() => !supabase);
  const [authUser, setAuthUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [isSharedGuest, setIsSharedGuest] = useState(() => Boolean(sharedPostId));
  const [activeTab, setActiveTab] = useState('feed');
  const [cards, setCards] = useState(initialCards);
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [currentIndex, setCurrentIndex] = useState(() => Math.max(initialCards.findIndex((card) => card.id === sharedPostId), 0));
  const [votedIds, setVotedIds] = useState(() => new Set());
  const [savedPostIds, setSavedPostIds] = useState(() => new Set());
  const [toast, setToast] = useState('');
  const [viewportEpoch, setViewportEpoch] = useState(0);
  const [previewState, setPreviewState] = useState(() => new URLSearchParams(window.location.search).get('state') ?? 'ready');
  const tabGestureStart = useRef(null);
  const mainRef = useRef(null);
  const authCallbackHandled = useRef(false);
  const authCallbackExchange = useRef(null);
  const displayCategories = useMemo(() => localizeCategories(categories, locale), [locale]);
  const displayCards = useMemo(() => cards.map((card) => localizeCard(card, locale)), [cards, locale]);

  const visibleCards = useMemo(() => activeCategory === 'ALL' ? displayCards : displayCards.filter((card) => card.category === activeCategory), [activeCategory, displayCards]);
  const safeIndex = visibleCards.length ? currentIndex % visibleCards.length : 0;
  const currentCard = visibleCards[safeIndex];

  /** 정의: 언어만 전환하고 인증·탭·피드 상태는 현재 화면에 그대로 유지한다. */
  function switchLocale(nextLocale) {
    window.history.replaceState(null, '', localeUrl(nextLocale));
    setLocale(nextLocale);
  }

  useEffect(() => {
    const syncLocaleFromHistory = () => setLocale(resolveLocale());
    window.addEventListener('popstate', syncLocaleFromHistory);
    return () => window.removeEventListener('popstate', syncLocaleFromHistory);
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(''), 1800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  /** Keeps the prototype UI in sync with an actual Supabase email session. */
  useEffect(() => {
    if (!supabase) return undefined;
    let active = true;
    const callbackCode = getAuthCallbackCode(window.location.search);

    const finishAuthenticatedEntry = (session) => {
      if (!session || previewMode) return;
      setAuthUser(session.user ?? null);
      setIsGuest(false);

      // Magic-link tokens belong only in the one-time callback URL. Once
      // Supabase has persisted the session, remove them and land on the feed.
      const hash = new URLSearchParams(window.location.hash.slice(1));
      const isAuthCallback = hash.has('access_token') || new URLSearchParams(window.location.search).has('code');
      if (isAuthCallback && !authCallbackHandled.current) {
        authCallbackHandled.current = true;
        setIsSharedGuest(false);
        setActiveTab('feed');
        const query = new URLSearchParams(window.location.search);
        query.delete('code');
        query.delete('facs_remember');
        window.history.replaceState(null, '', `${window.location.pathname}${query.size ? `?${query}` : ''}`);
      }
    };

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setAuthUser(null);
        return;
      }
      finishAuthenticatedEntry(session);
    });

    async function bootstrapAuth() {
      let session = null;

      // Magic-link callbacks can arrive as a PKCE `code`. Exchange it before
      // rendering the guest screen so successful authentication lands on Feed.
      if (callbackCode) {
        if (!authCallbackExchange.current) {
          authCallbackExchange.current = supabase.auth.exchangeCodeForSession(callbackCode);
        }
        const { data, error } = await authCallbackExchange.current;
        if (!error) session = data.session;
      }

      if (!session) {
        const { data } = await supabase.auth.getSession();
        session = data.session;
      }
      if (!active) return;
      finishAuthenticatedEntry(session);
      setAuthReady(true);
    }

    bootstrapAuth();
    return () => { active = false; subscription.subscription.unsubscribe(); };
  }, [previewMode]);

  /** Loads private Scraps only after a real authenticated session exists. */
  useEffect(() => {
    let active = true;
    if (!authUser) { setSavedPostIds(new Set()); return undefined; }
    getMyScrapPostIds().then((result) => {
      if (active && result.data) setSavedPostIds(result.data);
    });
    return () => { active = false; };
  }, [authUser?.id]);

  /** Loads the public handle only for the authenticated member, never from email. */
  useEffect(() => {
    let active = true;
    if (!authUser) { setProfile(null); setProfileLoading(false); return undefined; }
    setProfileLoading(true);
    getMyProfile().then((result) => {
      if (!active) return;
      setProfile(result.data ?? null);
      setProfileLoading(false);
    });
    return () => { active = false; };
  }, [authUser?.id]);

  /** Shows only a generic callback failure and removes provider-provided details from the URL. */
  useEffect(() => {
    if (!getAuthCallbackFailure(window.location.search)) return;
    const query = new URLSearchParams(window.location.search);
    ['error', 'error_code', 'error_description'].forEach((key) => query.delete(key));
    window.history.replaceState(null, '', `${window.location.pathname}${query.size ? `?${query}` : ''}${window.location.hash}`);
    setToast(locale === 'en' ? 'Sign-in could not be completed. Please try again.' : '로그인을 완료하지 못했습니다. 다시 시도해 주세요.');
  }, [locale]);

  /** 정의: 동일 브라우저 세션의 첫 진입만 Visitor 이벤트로 남겨 새로고침에 따른 과대 계수를 막는다. */
  useEffect(() => {
    const sessionKey = 'facs_visitor_tracked_v1';
    if (window.sessionStorage.getItem(sessionKey)) return;
    window.sessionStorage.setItem(sessionKey, '1');
    trackEvent(ANALYTICS_EVENT.VISITOR_OPENED, { locale, source: sharedPostId ? 'shared_post' : 'direct' });
  }, [locale, sharedPostId]);

  /** 정의: iOS Safari·모바일 브라우저의 탭/세션 복원 뒤에도 헤더와 본문 시작 좌표를 재계산한다. 복귀 시 고정 레이어를 다시 마운트해 이전 합성 레이어가 남는 현상을 막는다. */
  useEffect(() => {
    let delayedReset;
    const resetDocumentViewport = () => {
      const reset = () => {
        document.documentElement.style.setProperty('--xc-app-height', `${window.innerHeight}px`);
        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
        mainRef.current?.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      };
      reset();
      window.requestAnimationFrame(() => {
        reset();
        window.requestAnimationFrame(reset);
      });
      window.clearTimeout(delayedReset);
      delayedReset = window.setTimeout(reset, 120);
    };
    const onResume = () => { resetDocumentViewport(); setViewportEpoch((value) => value + 1); };
    const onVisibilityChange = () => { if (document.visibilityState === 'visible') onResume(); };
    // iOS Safari resizes visualViewport when the keyboard opens. Rebuilding fixed
    // layers at that moment pulls the splash upward, so preserve the current
    // focused form position and only recalculate for real viewport changes.
    const onVisualViewportResize = () => {
      const isEditing = document.activeElement?.matches('input, textarea, select');
      if (isEditing && window.visualViewport && window.visualViewport.height < window.innerHeight) return;
      resetDocumentViewport();
    };
    window.addEventListener('pageshow', onResume);
    window.addEventListener('focus', onResume);
    window.visualViewport?.addEventListener('resize', onVisualViewportResize);
    document.addEventListener('visibilitychange', onVisibilityChange);
    resetDocumentViewport();
    return () => {
      window.removeEventListener('pageshow', onResume);
      window.removeEventListener('focus', onResume);
      window.visualViewport?.removeEventListener('resize', onVisualViewportResize);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.clearTimeout(delayedReset);
    };
  }, []);

  useEnglishUi(locale);
  useEffect(() => { applySeoMetadata(locale); }, [locale]);

  /** 정의: 메뉴 전환마다 이전 화면의 스크롤 위치를 0으로 초기화해 상단 헤더·본문이 잘린 채 렌더링되는 것을 막는다. */
  useLayoutEffect(() => {
    const main = mainRef.current;
    if (main) main.scrollTop = 0;
    window.scrollTo(0, 0);
  }, [activeTab]);

  /** 정의: 피드 카테고리를 변경하고 새 목록의 첫 카드로 이동한다. @param {string} category 카테고리 식별자 */
  function changeCategory(category) {
    setActiveCategory(category);
    setCurrentIndex(0);
  }

  /** 정의: 현재 필터 결과 안에서 이전 또는 다음 카드를 순환 이동한다. @param {number} direction -1 또는 1 */
  function moveCard(direction) {
    if (!visibleCards.length) return;
    setCurrentIndex((index) => (index + direction + visibleCards.length) % visibleCards.length);
  }

  /** 정의: 모든 카테고리에서 임의의 카드를 선택하고 안내 토스트를 표시한다. */
  function shuffle() {
    setActiveCategory('ALL');
    setCurrentIndex(Math.floor(Math.random() * cards.length));
    setToast(locale === 'en' ? 'Here is a fresh photo.' : '새로운 사진을 보여드릴게요');
  }

  /** 정의: 모바일은 시스템 공유 시트, 그 외 환경은 링크 복사를 우선해 설치된 SNS·메신저와 미래 앱 딥링크를 함께 지원한다. */
  async function shareCard(card) {
    trackEvent(ANALYTICS_EVENT.SHARE_REQUESTED, { category: card.category, evaluationType: card.evaluationType, locale });
    const url = buildShareUrl(card.id, locale);
    const shareData = locale === 'en'
      ? { title: 'FACt.Smack First Impression', text: `Share your first impression of @${card.author}.`, url }
      : { title: 'FACt.Smack 첫인상', text: `@${card.author}의 첫인상 평가에 참여해 보세요.`, url };
    try {
      if (navigator.share) await navigator.share(shareData);
      else if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(url); setToast(locale === 'en' ? 'Evaluation link copied.' : '평가 참여 링크를 복사했습니다.'); }
      else window.prompt(locale === 'en' ? 'Copy the evaluation link.' : '평가 참여 링크를 복사하세요.', url);
    } catch (error) {
      if (error?.name !== 'AbortError' && navigator.clipboard?.writeText) { await navigator.clipboard.writeText(url); setToast(locale === 'en' ? 'Evaluation link copied.' : '평가 참여 링크를 복사했습니다.'); }
    }
  }

  /** 정의: 카테고리 평가 유형에 맞춰 BINARY 또는 NUMERIC_AGE 투표를 기록하고 카드 집계를 동기화한다. @param {boolean|number} value YES/NO 또는 예상 나이 */
  async function vote(value) {
    const payload = currentCard.evaluationType === 'NUMERIC_AGE' ? { type: 'age', value } : value ? 'yes' : 'no';
    // 정의: 지원 기기에서 YES는 잔잔한 단일 진동, NO는 분명한 이중 진동을 제공하며 비지원 브라우저는 조용히 통과한다.
    if (currentCard.evaluationType !== 'NUMERIC_AGE' && typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') navigator.vibrate(value ? 12 : [24, 34, 42]);
    const result = await submitCardVote(currentCard, payload, votedIds);
    if (result.error) { setToast(result.error.message); return; }
    setCards((items) => items.map((card) => card.id === currentCard.id ? result.data.post : card));
    setVotedIds((ids) => new Set([...ids, currentCard.id]));
    trackEvent(votedIds.size === 0 ? ANALYTICS_EVENT.FIRST_VOTE : ANALYTICS_EVENT.VOTE_COMPLETED, { category: currentCard.category, evaluationType: currentCard.evaluationType, locale });
    trackEvent(ANALYTICS_EVENT.RESULT_VIEWED, { category: currentCard.category, evaluationType: currentCard.evaluationType, locale });
    setToast(locale === 'en'
      ? (currentCard.evaluationType === 'NUMERIC_AGE' ? `You chose age ${value}.` : value ? 'Your YES vote was recorded.' : 'Your NO vote was recorded.')
      : (currentCard.evaluationType === 'NUMERIC_AGE' ? `${value}세로 첫인상을 남겼습니다.` : value ? 'YES 의견을 남겼습니다.' : 'NO 의견을 남겼습니다.'));
  }

  /** 정의: 유효한 댓글을 현재 목업 카드에 추가한다. @param {string} cardId 게시물 ID @param {string} body 댓글 내용 */
  function addComment(cardId, body) {
    if (!isConfiguredHandle(profile?.handle)) {
      setActiveTab('profile');
      setToast(locale === 'en' ? 'Set your public ID before commenting.' : '댓글을 남기기 전에 공개 아이디를 설정해 주세요.');
      return;
    }
    const trimmed = body.trim();
    if (!trimmed) return;
    setCards((items) => items.map((item) => item.id === cardId ? {
      ...item,
      comments: [...(item.comments ?? []), { id: `local-${Date.now()}`, author: 'you', body: trimmed, createdAt: '방금', replies: [] }],
    } : item));
    setToast(locale === 'en' ? 'Comment posted.' : '댓글을 남겼습니다.');
  }

  /** Stores selected media privately, publishes only after storage confirms it, then shows the server-backed card. */
  async function addCard(card) {
    if (!isConfiguredHandle(profile?.handle)) {
      setActiveTab('profile');
      setToast(locale === 'en' ? 'Set your public ID before publishing.' : '게시 전에 공개 아이디를 설정해 주세요.');
      return;
    }
    const result = await createSupabasePublishedPost({
      category: card.category,
      evaluationType: card.evaluationType,
      question: card.question,
      ageMin: card.ageMin ?? null,
      ageMax: card.ageMax ?? null,
      media: card.media,
    });
    if (result.error) {
      setToast(locale === 'en' ? 'Your photo could not be uploaded. Please try again.' : '사진을 업로드하지 못했어요. 다시 시도해 주세요.');
      return;
    }
    const serverMedia = result.data.media;
    const publishedCard = {
      ...card,
      id: result.data.post.id,
      author: profile.handle,
      imageUrl: serverMedia[0].url,
      mediaType: serverMedia[0].type,
      media: serverMedia.map((item) => ({ ...item, objectPosition: card.objectPosition })),
      publishedAt: result.data.post.published_at,
    };
    setCards((items) => [publishedCard, ...items]);
    setActiveCategory('ALL');
    setCurrentIndex(0);
    setActiveTab('feed');
    trackEvent(ANALYTICS_EVENT.UPLOAD_COMPLETED, { category: publishedCard.category, evaluationType: publishedCard.evaluationType, locale });
    setToast(locale === 'en' ? 'Your new post is now first in the feed.' : '새 사진이 피드 맨 앞에 등록되었습니다.');
  }

  async function saveHandle(handle) {
    const result = await updateMyHandle(handle);
    if (!result.ok) return { ok: false, message: result.error?.message ?? '아이디를 저장하지 못했어요.' };
    setProfile(result.data);
    setToast(locale === 'en' ? 'Your public ID is ready.' : '공개 아이디를 설정했어요.');
    return { ok: true };
  }

  async function checkHandle(handle) {
    const result = await checkHandleAvailability(handle);
    return result.error ? { ok: false, message: result.error.message } : { ok: true, data: result.data };
  }

  async function loadHandleSuggestions(profileId) {
    const result = await getHandleSuggestionsWithAvailability(profileId);
    return result.error ? { ok: false, message: result.error.message } : { ok: true, data: result.data };
  }

  function openUpload() {
    if (isSharedGuest || !authUser) { setIsSharedGuest(false); setIsGuest(true); return; }
    setActiveTab('upload');
    setToast(!profileLoading && !isConfiguredHandle(profile?.handle)
      ? (locale === 'en' ? 'Set your public ID before publishing.' : '게시 전에 공개 아이디를 설정해 주세요.')
      : (locale === 'en' ? 'Let people see your first impression too.' : '내 사진도 첫인상을 받아보세요.'));
  }

  /** Ends the actual Supabase browser session and returns to the safe guest entry. */
  async function signOut() {
    if (!authUser) {
      setIsSharedGuest(false);
      setActiveTab('feed');
      setIsGuest(true);
      return;
    }
    const result = await signOutCurrentSession();
    if (!result.ok) {
      setToast(locale === 'en' ? 'We could not sign you out. Please try again.' : '로그아웃하지 못했어요. 다시 시도해 주세요.');
      return;
    }
    setAuthUser(null);
    setProfile(null);
    setSavedPostIds(new Set());
    setVotedIds(new Set());
    setIsSharedGuest(false);
    setActiveCategory('ALL');
    setCurrentIndex(0);
    setActiveTab('feed');
    setIsGuest(true);
  }

  function openTab(id) {
    if (id === 'upload') { openUpload(); return; }
    setActiveTab(id);
  }

  async function requestEmailAuth(email, remember) {
    const result = await requestEmailMagicLink(email, authConfig, remember);
    const message = result.ok
      ? (locale === 'en' ? 'Check your email to finish signing in.' : '이메일의 로그인 링크를 확인해 주세요.')
      : result.code === AUTH_ACTION_ERROR.EMAIL_RATE_LIMITED
        ? (locale === 'en' ? 'For security, wait about a minute before requesting another email.' : '보안을 위해 약 1분 뒤에 다시 요청해 주세요.')
        : result.code === AUTH_ACTION_ERROR.EMAIL_REDIRECT_REJECTED
          ? (locale === 'en' ? 'Sign-in is being updated. Please try again shortly.' : '인증 주소를 점검 중입니다. 잠시 후 다시 시도해 주세요.')
          : (locale === 'en' ? 'We could not send the sign-in email. Please try again shortly.' : '인증 메일을 보내지 못했어요. 잠시 후 다시 시도해 주세요.');
    setToast(message);
    return { ok: result.ok, code: result.code, message };
  }

  /** 정의: 랭킹에서 선택한 카드의 피드 위치로 이동한다. @param {{ id: string }} target 대상 카드 */
  function openRankingCard(target) {
    setActiveCategory('ALL');
    setCurrentIndex(Math.max(cards.findIndex((item) => item.id === target.id), 0));
    setActiveTab('feed');
  }

  /** 정의: 목업 프로필에서 카드 노출을 제거하고 완료 안내를 표시한다. @param {string} id 카드 ID */
  function deleteCard(id) { setCards((items) => items.filter((item) => item.id !== id)); setToast(locale === 'en' ? 'Post deleted.' : '게시물을 삭제했습니다.'); }

  /** Sends guests to the existing sign-in screen; signed-in users persist a private Scrap. */
  async function toggleSavedPost(postId) {
    if (!authUser) {
      setIsSharedGuest(false);
      setIsGuest(true);
      setToast(locale === 'en' ? 'Sign in to save this post to Scraps.' : '스크랩에 저장하려면 로그인해 주세요.');
      return { ok: false, authRequired: true };
    }
    const wasSaved = savedPostIds.has(postId);
    const result = await toggleMyScrap(postId, wasSaved);
    if (result.error) {
      setToast(locale === 'en' ? 'Scraps could not be updated. Please try again.' : '스크랩을 변경하지 못했습니다. 다시 시도해 주세요.');
      return { ok: false };
    }
    setSavedPostIds((current) => {
      const next = new Set(current);
      if (result.data.saved) next.add(postId); else next.delete(postId);
      return next;
    });
    return { ok: true, saved: result.data.saved };
  }

  /** 정의: 본문에서의 가로 터치를 기록하되 카드 앨범·입력·버튼과 같은 자체 제스처 영역은 탭 이동 대상에서 제외한다. @param {PointerEvent} event 포인터 시작 이벤트 */
  function startTabGesture(event) {
    if (event.pointerType !== 'touch' || event.target.closest('button, input, textarea, select, a, [role="dialog"], .media-carousel')) return;
    tabGestureStart.current = { x: event.clientX, y: event.clientY };
  }

  /** 정의: 가로 터치가 세로 스크롤보다 충분히 클 때 Feed·Upload·Ranking·Profile을 인접 순서로 이동한다. @param {PointerEvent} event 포인터 종료 이벤트 */
  function finishTabGesture(event) {
    const start = tabGestureStart.current;
    tabGestureStart.current = null;
    if (!start || event.pointerType !== 'touch') return;
    const deltaX = event.clientX - start.x;
    const deltaY = event.clientY - start.y;
    if (Math.abs(deltaX) < 72 || Math.abs(deltaX) <= Math.abs(deltaY) * 1.2) return;
    const currentTabIndex = tabs.findIndex(([id]) => id === activeTab);
    const nextIndex = Math.min(Math.max(currentTabIndex + (deltaX < 0 ? 1 : -1), 0), tabs.length - 1);
    if (nextIndex !== currentTabIndex) setActiveTab(tabs[nextIndex][0]);
  }

  if (!authReady) return <CanvasStage locale={locale}><StatePanel state="loading" pageName="FACt.Smack" /></CanvasStage>;
  if (isGuest) return <CanvasStage locale={locale}><SplashView cards={cards} locale={locale} onLocaleChange={switchLocale} onEmailAuth={requestEmailAuth} onPreview={() => { setIsGuest(false); setIsSharedGuest(false); setActiveTab('feed'); setToast(locale === 'en' ? 'Preview mode opened the feed.' : '미리보기 모드로 피드를 열었습니다.'); }} /></CanvasStage>;

  return <CanvasStage locale={locale}><div className="editorial-app h-full bg-background text-on-background font-body">
    <SkipLink />
    <header key={`header-${viewportEpoch}`} className="fixed top-0 z-50 w-full border-b border-[#e4e2dd] bg-[#fbf9f4]/95 backdrop-blur-xl">
      <div className="mx-auto flex h-[44px] max-w-none items-center justify-between gap-2 px-4">
        <button type="button" onClick={() => setActiveTab('feed')} className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden text-left" aria-label="FACt.Smack 피드로 이동">
          <img src={logoUrl} width="38" height="28" className="h-7 w-9 shrink-0 object-contain" alt="FACt.Smack 뱀 로고" />
          <span className="flex min-w-0 items-center gap-1.5">
            <BrandWordmark compact />
            <span aria-label="AI" className="brand-ai-mark hidden shrink-0 md:inline-flex">AI</span>
          </span>
          <span lang="en" className="hidden whitespace-nowrap font-mono text-[8px] leading-none tracking-wide text-[#735c00] lg:inline">MORE VIEWS, MORE YOU</span>
        </button>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            className="flex h-6 min-w-0 items-center justify-center rounded-md border border-[#c5a059]/55 bg-[#fbf9f4] px-1.5 font-latin text-[9px] font-semibold tracking-tight text-[#735c00]/85 hover:bg-surface-container"
            onClick={() => switchLocale(locale === 'ko' ? 'en' : 'ko')}
            aria-label={locale === 'ko' ? '영어로 보기' : 'View in Korean'}
            title={locale === 'ko' ? 'English' : '한국어'}
          >
            <span aria-hidden="true">{locale === 'ko' ? 'EN' : '한글'}</span>
            <span className="sr-only">{locale === 'ko' ? 'English' : '한국어'}</span>
          </button>
          <button type="button" className="relative flex h-10 w-10 items-center justify-center rounded-full hover:bg-surface-container" onClick={() => setToast('새 알림은 없습니다.')} aria-label="알림"><span className="material-symbols-outlined text-[22px] text-on-surface-variant">notifications</span><span className="absolute right-2 top-2 h-2 w-2 animate-pulse rounded-full bg-[#c5a059] ring-2 ring-background" /></button>
          <button type="button" onClick={() => setActiveTab('profile')} className="h-9 w-9 overflow-hidden rounded-full border border-[#c5a059]/60 p-0.5" aria-label="프로필"><img className="h-full w-full rounded-full object-cover" src={initialCards[0].imageUrl} alt="내 프로필" /></button>
        </div>
      </div>
    </header>

    <main key={`main-${activeTab}-${viewportEpoch}`} ref={mainRef} id="main-content" tabIndex="-1" onPointerDown={startTabGesture} onPointerUp={finishTabGesture} onPointerCancel={() => { tabGestureStart.current = null; }} className={`editorial-main mx-auto flex h-full w-full max-w-none flex-col px-4 pb-11 pt-[52px] sm:px-5 ${activeTab === 'feed' ? 'editorial-main--feed' : 'editorial-main--scroll'}`}>
      {previewState !== 'ready' ? <StatePanel state={previewState} pageName={tabs.find(([id]) => id === activeTab)?.[2] ?? 'FACt.Smack'} onAction={() => { if (previewState === 'permission') setIsGuest(true); else if (previewState === 'review') setActiveTab('profile'); setPreviewState('ready'); }} /> : <>
        {activeTab === 'feed' && <FeedView locale={locale} categories={displayCategories} cards={visibleCards} card={currentCard} currentIndex={safeIndex} activeCategory={activeCategory} hasVoted={currentCard && votedIds.has(currentCard.id)} savedPostIds={savedPostIds} onCategoryChange={changeCategory} onPrevious={() => moveCard(-1)} onNext={() => moveCard(1)} onShuffle={shuffle} onVote={vote} onShare={shareCard} onToggleSave={toggleSavedPost} onBoost={() => setToast(locale === 'en' ? 'Boost never changes the result; it only increases reach and sample size.' : 'Boost는 결과를 바꾸지 않고 추가 노출과 표본만 늘립니다. 결제 연결은 다음 단계에서 적용합니다.')} onStartUpload={openUpload} onAddComment={addComment} />}
        {activeTab === 'upload' && <UploadView categories={displayCategories} locale={locale} onSubmit={addCard} onMessage={setToast} />}
        {activeTab === 'ranking' && <RankingView cards={displayCards} categories={displayCategories} onOpen={openRankingCard} />}
        {activeTab === 'profile' && <ProfileView locale={locale} cards={displayCards} categories={displayCategories} savedPostIds={savedPostIds} profile={profile} profileLoading={profileLoading} isAuthenticated={Boolean(authUser)} onCheckHandle={checkHandle} onLoadHandleSuggestions={loadHandleSuggestions} onSaveHandle={saveHandle} onDelete={deleteCard} onRemoveScrap={(postId) => toggleSavedPost(postId)} onUpload={openUpload} onSignOut={signOut} />}
      </>}
    </main>

    <DesktopRecommendationAside cards={displayCards} onProfile={() => setActiveTab('profile')} />

    {toast && <div role="status" className="fixed left-1/2 top-[60px] z-[60] w-full max-w-xs -translate-x-1/2 px-4"><div className="flex items-center gap-2 rounded-lg border border-[#e4e2dd] bg-white/95 px-3.5 py-2.5 text-xs text-[#1b1c19] shadow-lg backdrop-blur"><span className="material-symbols-outlined text-base text-cyan-glow">check_circle</span>{toast}</div></div>}

    <nav className="fixed bottom-0 z-50 w-full border-t border-[#e4e2dd] bg-[#fbf9f4]/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_20px_rgba(0,0,0,0.03)] backdrop-blur-xl" aria-label="주요 메뉴">
      <button type="button" onClick={() => setActiveTab('feed')} className="desktop-nav-brand" aria-label="FACt.Smack 피드로 이동"><img src={logoUrl} width="30" height="24" alt="" /><BrandWordmark /></button>
      <button type="button" className="desktop-nav-language" onClick={() => switchLocale(locale === 'ko' ? 'en' : 'ko')} aria-label={locale === 'ko' ? '영어로 보기' : 'View in Korean'} title={locale === 'ko' ? 'English' : '한국어'}><span className="desktop-nav-language__mark" aria-hidden="true">{locale === 'ko' ? 'A' : '가'}</span><span>{locale === 'ko' ? 'English' : '한국어'}</span></button>
      <div className="desktop-nav-items mx-auto flex h-[44px] max-w-none items-center justify-around px-2">{tabs.map(([id, icon, label, color]) => <button key={id} type="button" onClick={() => openTab(id)} aria-label={label} aria-current={activeTab === id ? 'page' : undefined} style={activeTab === id ? { color } : undefined} className={`flex h-[38px] w-16 flex-col items-center justify-center transition-all ${activeTab === id ? 'scale-[1.03]' : 'text-slate-400 hover:text-[#1b1c19]'}`}><span className="material-symbols-outlined text-[20px]">{icon}</span><span className="mt-px font-mono text-[10px] font-bold">{label}</span></button>)}</div>
    </nav>
  </div></CanvasStage>;
}

/** 정의: 이전 심볼에 의존하지 않고 공식 서비스명 FACt.Smack을 일관되게 표기하는 접근 가능한 워드마크다. */
function BrandWordmark({ compact = false }) {
  return <span lang="en" aria-label="FACt.Smack" className={`shrink-0 whitespace-nowrap font-latin font-extrabold leading-none tracking-tight text-[#1b1c19] ${compact ? 'text-[15px] sm:text-[17px] md:text-xl' : 'text-[15px]'}`}><span className="brand-wordmark__facs">FAC</span>t.<span className="brand-wordmark__facs">S</span>mack</span>;
}

/** 정의: 넓은 PC 화면에서 중앙 피드와 병렬로 표시하는 Instagram형 사용자·추천 콘텐츠 영역이다. */
function DesktopRecommendationAside({ cards, onProfile }) {
  const suggestions = cards.slice(1, 6);
  return <aside className="desktop-recommendations" aria-label="회원님을 위한 추천">
    <button type="button" onClick={onProfile} className="mb-7 flex w-full items-center gap-3 text-left">
      <img className="h-11 w-11 rounded-full border border-[#c5a059]/60 object-cover p-0.5" src={cards[0]?.imageUrl} alt="내 프로필" />
      <span className="min-w-0 flex-1"><strong className="block truncate text-[13px] text-[#1b1c19]">my_look_daily</strong><span className="block truncate text-[12px] text-[#74777d]">나의 Look Book</span></span>
      <span className="font-mono text-[11px] font-bold text-[#5865F2]">전환</span>
    </button>
    <div className="mb-3 flex items-center justify-between"><h2 className="text-[13px] font-bold text-[#44474c]">회원님을 위한 추천</h2><button type="button" className="text-[11px] font-bold text-[#1b1c19]">모두 보기</button></div>
    <div className="space-y-3">{suggestions.map((item) => <div key={item.id} className="flex items-center gap-2.5"><img className="h-8 w-8 rounded-full object-cover" src={item.imageUrl} alt="" /><div className="min-w-0 flex-1"><strong className="block truncate text-[12px] text-[#1b1c19]">@{item.author}</strong><span className="block truncate text-[10px] text-[#74777d]">{item.subtext}</span></div><button type="button" className="text-[11px] font-bold text-[#5865F2]">팔로우</button></div>)}</div>
    <p className="mt-8 text-[10px] leading-relaxed text-[#9a9a95]">소개 · 도움말 · 안전 · 개인정보처리방침 · 약관 · 위치 · 언어</p>
    <p className="mt-3 font-mono text-[10px] text-[#9a9a95]">© 2026 FACt.Smack</p>
  </aside>;
}

/** 정의: 영어권 미리보기와 실제 로케일 전환에서 카테고리의 표시명을 원본 데이터와 분리한다. */
function localizeCategories(source, locale) {
  if (locale !== 'en') return source;
  const labels = { PerceivedAge: 'How Old Do I Look?', Outfit: "Today's Look", Date: 'Date', Fitness: 'Fitness', Work: 'Work', SocialProfile: 'Profile' };
  return Object.fromEntries(Object.entries(source).map(([id, category]) => [id, { ...category, label: labels[id] ?? category.label, feedLabel: id === 'PerceivedAge' ? 'AGE CHECK' : category.feedLabel }]));
}

/** 정의: 영어권 사용자는 원본 피드 데이터는 바꾸지 않고, 한국어 샘플 문구의 영어 표시 사본만 본다. */
function localizeCard(card, locale) {
  if (locale !== 'en') return card;
  return { ...card, question: translateKorean(card.question), subtext: translateKorean(card.subtext), timestamp: translateKorean(card.timestamp), comments: (card.comments ?? []).map((comment) => ({ ...comment, body: translateKorean(comment.body), createdAt: translateKorean(comment.createdAt), replies: (comment.replies ?? []).map((reply) => ({ ...reply, body: translateKorean(reply.body), createdAt: translateKorean(reply.createdAt) })) })) };
}

const EN_COPY = {
  '오늘 이 스타일,\n괜찮아 보여요?': 'Does this look\nwork for today?',
  '오늘의 스타일이 주는 첫인상이에요.': 'A first impression from today’s look.',
  '사람들은 저를\n몇 살로 볼까요?': 'How old do I look\nto people?',
  '사진 속 첫인상은 몇 살로 느껴지나요?': 'What age does this first impression suggest?',
  '자전거 라이딩 후의 저는\n몇 살로 보여요?': 'How old do I look\nafter this bike ride?',
  '활동적인 분위기가 주는 첫인상이에요.': 'A first impression with active energy.',
  '일하다 잠깐 찍은 이 사진,\n몇 살로 보여요?': 'How old do I look\nin this workday photo?',
  '일하는 순간의 첫인상이에요.': 'A first impression from a moment at work.',
  '첫 만남이라면\n호감이 가나요?': 'Would this make\na lovely first impression?',
  '첫 만남에서 느껴지는 인상이에요.': 'A first impression for a first date.',
  '건강하고 매력적인 인상을\n주나요?': 'Does this look feel\nhealthy and confident?',
  '건강하고 자신감 있는 첫인상이에요.': 'A healthy, confident first impression.',
  '직장에서 좋은 첫인상을\n줄 것 같나요?': 'Would this make a great\nfirst impression at work?',
  '직장에서 느껴지는 첫인상이에요.': 'A first impression at work.',
  '이 사진, SNS 프로필로\n매력적으로 보이나요?': 'Does this work as an\nappealing profile photo?',
  '프로필 사진으로 남는 첫인상이에요.': 'A first impression that stays in a profile photo.',
  '서울 거리의 자연광과 룩이 잘 어울려요.': 'The Seoul street light works beautifully with this look.',
  '수영장에서도 생기 있는 첫인상이에요.': 'You look lively even by the pool.',
  '건강하고 밝은 에너지가 느껴져요.': 'It gives off healthy, bright energy.',
  '차분하고 자신감 있는 분위기예요.': 'It feels calm and confident.',
  '밝고 다정한 인상이 느껴져요.': 'It feels bright and warm.',
  '활동적인 에너지가 잘 보여요.': 'Your active energy comes through well.',
  '차분하고 믿음직한 분위기입니다.': 'It feels calm and trustworthy.',
  '의견 감사합니다!': 'Thanks for your thoughts!',
  '8분 전': '8 min ago', '9분 전': '9 min ago', '12분 전': '12 min ago', '14분 전': '14 min ago', '18분 전': '18 min ago', '20분 전': '20 min ago', '45분 전': '45 min ago', '1시간 전': '1 hr ago', '6분 전': '6 min ago',
};

function translateKorean(value) {
  if (EN_COPY[value] !== undefined) return EN_COPY[value];
  const minutes = typeof value === 'string' && value.match(/^(\d+)분 전$/);
  if (minutes) return `${minutes[1]} min ago`;
  return value;
}

/** 정의: 컴포넌트에 분산된 고정 메뉴·버튼 카피를 영어권 화면에서 일관되게 치환하고, 이후 렌더도 감시한다. */
function useEnglishUi(locale) {
  useEffect(() => {
    document.documentElement.lang = locale;
    if (locale !== 'en') return undefined;
    const replacements = {
      '셔플': 'Shuffle', '몇 살로 보여?': 'How Old Do I Look?', '오늘의 룩': "Today's Look", '데이트': 'Date', '운동': 'Fitness', '출근': 'Work', 'SNS 프로필': 'Profile',
      '더 보기': 'More', '다음 사진': 'Next photo', '이전 사진': 'Previous photo', '이전 카드': 'Previous post', '다음 카드': 'Next post', '사진 탐색': 'Photo navigation', '등록된 사진': 'Photos', '유효 평가': 'Valid ratings', '명': '', '평균 예상': 'Average perceived', '평균 예상 나이': 'Average perceived age', '평균 호감도': 'Average approval', '호감도': 'Approval', '호감': 'YES', '비호감': 'NO', '세': ' years', '주관적 첫인상': 'Subjective first impression', '참여자의 주관적': 'Participants’ subjective', '첫인상이에요': 'first impression', '몇 살로 보이나요?': 'How old do I look?', '선택': 'Select',
      '초기 경향': 'Early signal', '현재 결과': 'Current result', '확장 표본': 'Expanded sample', '표본 수집 중': 'Collecting ratings', '100명까지 Boost · ₩1,000': 'Boost to 100 · $1', '나도 평가받기': 'Get feedback too', '아직 충분한 첫인상이 모이지 않았어요. 10명의 반응이 모이면 첫 경향을 알려드릴게요.': 'Not enough first impressions yet. We’ll show an early signal after 10 ratings.',
      '회원님을 위한 추천': 'Suggested for you', '모두 보기': 'See all', '팔로우': 'Follow', '전환': 'Switch', '나의 Look Book': 'My Look Book', '소개 · 도움말 · 안전 · 개인정보처리방침 · 약관 · 위치 · 언어': 'About · Help · Safety · Privacy · Terms · Location · Language',
      '오늘의 룩과 일상의 순간을 기록하고 있어요.': 'Documenting today’s looks and everyday moments.', '내 업로드': 'My uploads', '받은 투표': 'Ratings received', '내가 업로드한 사진 분석': 'My uploaded photo insights', '새로 업로드': 'New upload', '삭제': 'Delete',
      '가장 많은 공감을 받은 오늘의 룩을 살펴보세요.': 'Explore today’s most appreciated looks.', '전체 TOP': 'Top picks', '이전 10위': 'Previous 10', '다음 10위': 'Next 10', '랭킹 페이지': 'Ranking pages',
      '댓글 더 보기': 'More comments', '댓글 달기...': 'Add a comment…', '댓글': 'Comments', '게시': 'Post', '첫 번째 의견을 남겨 보세요.': 'Leave the first thought.', '첫 번째 댓글을 남겨 보세요.': 'Leave the first comment.', '댓글 10개 더 보기': 'View 10 more comments', '공유하기': 'Share', '이 피드 공유하기': 'Share this post',
      '새로운 룩 공유하기': 'Share a new look', '사진 최대 5개와 10초 이하 동영상 1개를 함께 선택할 수 있습니다.': 'Choose up to 5 photos and one video under 10 seconds.', '사진 또는 짧은 동영상 선택': 'Choose photos or a short video', '이미지 5개 + 동영상 1개 · 동영상 최대 10초 · 파일당 15MB': 'Up to 5 photos + 1 video · 10 seconds max · 15 MB per file', '로컬 디바이스에서 파일 찾기': 'Browse files', '파일을 이 영역에 끌어다 놓아도 바로 추가할 수 있어요': 'Or drag files here to add them.', '이미지': 'Photos', '동영상': 'Video', '클릭 또는 드롭하여 추가': 'Click or drop to add', '최대 선택 완료': 'Maximum selected', '1. 카테고리 선택': '1. Choose a category', '2. 어떤 점을 평가받고 싶나요?': '2. What would you like feedback on?', '사진을 올리면 상황에 맞게 다듬어지는 추천 질문': 'Suggested questions tailored to your photo', '선택한 사진·영상에 맞춰 제안하는 질문': 'Suggested questions for your selected media', '예: 오늘 이 룩, 저와 잘 어울리나요?': 'Example: Does this look suit me today?', '지우고 다시 작성': 'Clear and rewrite', '3. 평가 나이 범위': '3. Rating age range', '평가자는 이 범위 안에서 슬라이더와 ± 버튼으로 예상 나이를 선택합니다.': 'Raters choose an age within this range using the slider or ± buttons.', '최소 나이': 'Minimum age', '최대 나이': 'Maximum age', '4. 실제 나이 비교 (선택)': '4. Compare actual age (optional)', '결과에서만 실제 나이와 비교하기': 'Compare with my actual age in results only', '실제 나이는 평가자·프로필·피드에 공개되지 않으며, 본인 결과 비교에만 사용됩니다.': 'Your actual age stays private and is used only for your own result comparison.', '실제 나이 (18~99)': 'Actual age (18–99)', '닉네임 / 핸들': 'Username / handle', '피드에 업로드하기': 'Share to feed', '사진을 추가해 주세요.': 'Add a photo to continue.',
      '현재는 브라우저 목업입니다. 실서비스에서는 권리 동의·검토·안전한 미디어 저장 절차가 적용됩니다.': 'This is a browser mockup. The live service will require rights consent, review, and secure media storage.',
      '이미지 또는 동영상 파일만 선택할 수 있습니다.': 'Choose an image or video file.', '각 파일은 15MB 이하만 선택할 수 있습니다.': 'Each file must be 15 MB or smaller.', '동영상은 1개만 선택할 수 있습니다.': 'Choose no more than one video.', '동영상은 10초 이하만 업로드할 수 있습니다.': 'Videos must be 10 seconds or shorter.', '카메라 촬영은 모바일 환경에서 사용할 수 있는 기능이에요.': 'Camera capture is available on mobile devices.', '닉네임은 2~30자의 한글·영문·숫자·밑줄만 사용할 수 있어요.': 'Use 2–30 letters, numbers, or underscores for the username.', '질문은 4자 이상으로 작성하거나 추천 질문을 선택해 주세요.': 'Write at least 4 characters or choose a suggested question.', '최소·최대 나이는 18~99세 사이며 최소가 최대보다 작아야 해요.': 'The age range must be 18–99 and the minimum must be below the maximum.', '사진 또는 동영상을 선택해 주세요.': 'Choose a photo or video.',
      '룩을 준비하고 있어요.': 'Preparing your looks.', '잠시만 기다리면 새로운 콘텐츠를 보여드릴게요.': 'Fresh content will be ready in a moment.', '아직 보여드릴 룩이 없어요.': 'Nothing to show yet.', '조금 뒤 다시 확인하거나, 오늘의 첫 룩을 직접 공유해 보세요.': 'Check back soon or share today’s first look.', '새로고침': 'Refresh', '화면을 불러오지 못했어요.': 'Could not load this screen.', '연결 상태를 확인한 뒤 다시 시도해 주세요.': 'Check your connection and try again.', '다시 시도': 'Try again', '로그인 후 이용할 수 있어요.': 'Sign in to continue.', 'FACt.Smack에 가입하고 더 많은 시선으로 오늘의 룩을 확인해 보세요.': 'Join FACt.Smack and see today’s look through more perspectives.', '로그인하기': 'Sign in', '게시물을 검토하고 있어요.': 'Your post is under review.', '안전한 커뮤니티를 위해 확인이 끝나면 피드에 공개됩니다.': 'It will appear in the feed after our safety review.', '내 프로필 보기': 'View my profile', '상태 안내': 'status',
      '본문으로 바로가기': 'Skip to main content', 'FACt.Smack 피드로 이동': 'Go to the FACt.Smack feed', 'FACt.Smack 로고': 'FACt.Smack logo', 'FACt.Smack 뱀 로고': 'FACt.Smack snake logo', '알림': 'Notifications', '프로필': 'Profile', '내 프로필': 'My profile', '주요 메뉴': 'Main navigation', '카메라로 촬영하기': 'Take a photo', '미디어 추가': 'Add media', '랭킹 카드 미리보기': 'Ranking post preview', '미리보기 닫기': 'Close preview', '대화 상자': 'Dialog', '호감도 높은 순으로 정렬': 'Sort by highest approval', '호감도 낮은 순으로 정렬': 'Sort by lowest approval', '호감도 높은 순': 'Highest approval first', '호감도 낮은 순': 'Lowest approval first', '댓글 미리보기': 'Comment preview', '게시물 댓글 상세': 'Post comments', '댓글 상세 닫기': 'Close comments', '댓글 작성': 'Write a comment', '이전 사진 미리보기': 'Previous photo preview', '다음 사진 미리보기': 'Next photo preview',
    };
    const translateText = (text) => {
      const leading = text.match(/^\s*/)?.[0] ?? '';
      const trailing = text.match(/\s*$/)?.[0] ?? '';
      const core = text.trim();
      let replacement = replacements[core];
      if (replacement === undefined) {
        if (/^이미지는 최대 \d+개까지 선택할 수 있습니다\.$/.test(core)) replacement = core.replace(/^이미지는 최대 (\d+)개까지 선택할 수 있습니다\.$/, 'Choose no more than $1 images.');
        else if (/^평균 예상 [\d.]+세$/.test(core)) replacement = core.replace(/^평균 예상 ([\d.]+)세$/, 'Average perceived age $1 years');
        else if (/^호감도 \d+%$/.test(core)) replacement = core.replace(/^호감도 (\d+)%$/, 'Approval $1%');
        else if (/^유효 평가 [\d,]+명$/.test(core)) replacement = core.replace(/^유효 평가 ([\d,]+)명$/, 'Valid ratings $1');
        else if (/^호감 \d+%$/.test(core)) replacement = core.replace(/^호감 (\d+)%$/, 'YES $1%');
        else if (/^비호감 \d+%$/.test(core)) replacement = core.replace(/^비호감 (\d+)%$/, 'NO $1%');
        else if (/^\d+분 전$/.test(core)) replacement = core.replace('분 전', ' min ago');
        else if (/^\d+시간 전$/.test(core)) replacement = core.replace('시간 전', ' hr ago');
      }
      return replacement === undefined ? text : `${leading}${replacement}${trailing}`;
    };
    const translateAttribute = (value) => {
      if (!value) return value;
      if (replacements[value] !== undefined) return replacements[value];
      let match = value.match(/^등록된 사진 (\d+)장$/);
      if (match) return `${match[1]} uploaded photos`;
      match = value.match(/^(\d+)번째 사진 보기$/);
      if (match) return `View photo ${match[1]}`;
      match = value.match(/^(.+)의 (\d+)번째 사진$/);
      if (match) return `${match[1]}'s photo ${match[2]}`;
      match = value.match(/^(.+)의 (.+) 사진$/);
      if (match) return `${match[1]}'s ${match[2]} photo`;
      match = value.match(/^(.+) 순서 (앞으로|뒤로)$/);
      if (match) return `Move ${match[1]} ${match[2] === '앞으로' ? 'earlier' : 'later'}`;
      match = value.match(/^(.+) 제거$/);
      if (match) return `Remove ${match[1]}`;
      match = value.match(/^(\d+)번째 선택 이미지$/);
      if (match) return `Selected image ${match[1]}`;
      match = value.match(/^(.+) 상태 안내$/);
      if (match) return `${match[1]} status`;
      return value;
    };
    const translateNode = (node) => {
      if (node.nodeType === Node.TEXT_NODE) { const replacement = translateText(node.nodeValue); if (replacement !== node.nodeValue) node.nodeValue = replacement; return; }
      if (node.nodeType !== Node.ELEMENT_NODE || node.closest('[data-no-translate]')) return;
      ['aria-label', 'title', 'placeholder', 'alt'].forEach((attribute) => { const value = node.getAttribute(attribute); const replacement = translateAttribute(value); if (replacement !== value) node.setAttribute(attribute, replacement); });
      node.childNodes.forEach(translateNode);
    };
    translateNode(document.body);
    const observer = new MutationObserver((mutations) => mutations.forEach((mutation) => {
      if (mutation.type === 'characterData' || mutation.type === 'attributes') translateNode(mutation.target);
      else mutation.addedNodes.forEach(translateNode);
    }));
    observer.observe(document.body, { childList: true, characterData: true, attributes: true, attributeFilter: ['aria-label', 'title', 'placeholder', 'alt'], subtree: true });
    return () => observer.disconnect();
  }, [locale]);
}
