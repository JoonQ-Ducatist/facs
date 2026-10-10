import { supabase } from './supabaseClient.js';
import { trackGa4Event } from './ga4.js';

/** Keeps the local QA trail while the server receives only the reduced funnel contract. */
const STORAGE_KEY = 'facs_analytics_v1';
const SESSION_KEY = 'facs_analytics_session_v1';
const MAX_EVENTS = 500;

/** 정의: 허용된 제품 이벤트만 저장해 화면 문구·사용자 입력·사진 URL 등 식별 가능 데이터를 수집하지 않는다. */
export const ANALYTICS_EVENT = {
  VISITOR_OPENED: 'visitor_opened',
  SIGNUP_COMPLETED: 'signup_completed',
  FIRST_VOTE: 'first_vote',
  VOTE_COMPLETED: 'vote_completed',
  UPLOAD_COMPLETED: 'upload_completed',
  RESULT_VIEWED: 'result_viewed',
  SHARE_REQUESTED: 'share_requested',
  BOOST_REQUESTED: 'boost_requested',
};

/** The server accepts only funnel milestones. Supporting product telemetry stays local. */
const SERVER_EVENT_NAMES = new Set([
  ANALYTICS_EVENT.VISITOR_OPENED,
  ANALYTICS_EVENT.SIGNUP_COMPLETED,
  ANALYTICS_EVENT.FIRST_VOTE,
  ANALYTICS_EVENT.UPLOAD_COMPLETED,
  ANALYTICS_EVENT.RESULT_VIEWED,
]);

function isUuid(value) {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

/** An anonymous, browser-session identifier; it is never derived from auth, email, or device data. */
export function getAnalyticsSessionId(storage = globalThis.sessionStorage) {
  try {
    const existing = storage?.getItem(SESSION_KEY);
    if (isUuid(existing)) return existing;
    const next = globalThis.crypto?.randomUUID?.();
    if (!isUuid(next)) return null;
    storage?.setItem(SESSION_KEY, next);
    return next;
  } catch { return null; }
}

/** Sends no client timestamp or free-form properties; PostgreSQL supplies the canonical time. */
export async function recordAnalyticsEvent(name, { postId = null, client = supabase, sessionId = getAnalyticsSessionId() } = {}) {
  if (!SERVER_EVENT_NAMES.has(name) || !isUuid(sessionId) || (postId !== null && !isUuid(postId)) || !client?.rpc) return false;
  const { error } = await client.rpc('record_analytics_event', {
    input_event_name: name,
    input_session_id: sessionId,
    input_post_id: postId,
  });
  return !error;
}

function readEvents() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY) ?? '[]';
    const events = JSON.parse(stored);
    return events;
  } catch { return []; }
}

/** @param {keyof typeof ANALYTICS_EVENT | string} name @param {{ postId?: string, category?: string, evaluationType?: string, locale?: string, source?: string }} [properties] */
export function trackEvent(name, properties = {}) {
  if (typeof window === 'undefined') return;
  const event = { name, occurredAt: new Date().toISOString(), properties };
  const events = [...readEvents(), event].slice(-MAX_EVENTS);
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(events)); } catch { /* 저장 불가 환경은 무시한다. */ }
  window.dispatchEvent(new CustomEvent('facs:analytics', { detail: event }));
  // The GA4 adapter requires a configured measurement ID and sends only the
  // bounded event name, never local QA properties or IDs.
  trackGa4Event(name);
  // Analytics must never delay a vote, upload, or navigation. The adapter only
  // receives the optional server post UUID, never the local QA properties.
  void recordAnalyticsEvent(name, { postId: properties.postId }).catch(() => {});
}

/** 정의: 개발·QA에서 퍼널 순서만 점검할 수 있는 읽기 전용 스냅샷이다. */
export function getAnalyticsSnapshot() { return readEvents(); }
