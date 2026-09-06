/** 정의: 외부 전송 없이 Cash Loop의 핵심 행동을 검증하는 개발용 익명 이벤트 저장소다. 실제 분석 도입 시 같은 이름·속성 계약을 서버 수집기로 교체한다. */
const STORAGE_KEY = 'facs_analytics_v1';
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
};

function readEvents() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY) ?? '[]';
    const events = JSON.parse(stored);
    return events;
  } catch { return []; }
}

/** @param {keyof typeof ANALYTICS_EVENT | string} name @param {{ category?: string, evaluationType?: string, locale?: string, source?: string }} [properties] */
export function trackEvent(name, properties = {}) {
  if (typeof window === 'undefined') return;
  const event = { name, occurredAt: new Date().toISOString(), properties };
  const events = [...readEvents(), event].slice(-MAX_EVENTS);
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(events)); } catch { /* 저장 불가 환경은 무시한다. */ }
  window.dispatchEvent(new CustomEvent('facs:analytics', { detail: event }));
}

/** 정의: 개발·QA에서 퍼널 순서만 점검할 수 있는 읽기 전용 스냅샷이다. */
export function getAnalyticsSnapshot() { return readEvents(); }
