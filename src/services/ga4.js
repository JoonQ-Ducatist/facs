const CONSENT_KEY = 'facs_ga4_consent_v1';
const EVENT_NAMES = new Set(['visitor_opened', 'signup_completed', 'first_vote', 'vote_completed', 'upload_completed', 'result_viewed', 'share_requested', 'boost_requested']);

function measurementId(environment = import.meta.env ?? {}) {
  const value = String(environment.VITE_GA_MEASUREMENT_ID ?? '').trim();
  return /^G-[A-Z0-9]+$/i.test(value) ? value : null;
}

/** GA4 remains off until a visitor has explicitly opted in. */
export function hasAnalyticsConsent(storage = globalThis.localStorage) {
  try { return storage?.getItem(CONSENT_KEY) === 'granted'; } catch { return false; }
}

export function setAnalyticsConsent(granted, storage = globalThis.localStorage) {
  try { storage?.setItem(CONSENT_KEY, granted ? 'granted' : 'denied'); } catch { /* Private browsing may deny storage. */ }
}

/** Loads gtag only after consent and never supplies email, handles, media URLs, or member IDs. */
export function initializeGa4({ environment = import.meta.env ?? {}, documentRef = globalThis.document, windowRef = globalThis.window } = {}) {
  const id = measurementId(environment);
  if (!id || !hasAnalyticsConsent(windowRef?.localStorage) || !documentRef?.head || !windowRef) return false;
  windowRef.dataLayer ??= [];
  windowRef.gtag ??= function gtag() { windowRef.dataLayer.push(arguments); };
  if (!documentRef.querySelector(`script[data-facs-ga4="${id}"]`)) {
    const script = documentRef.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
    script.dataset.facsGa4 = id;
    documentRef.head.append(script);
    windowRef.gtag('js', new Date());
    windowRef.gtag('config', id, { anonymize_ip: true, send_page_view: true });
  }
  return true;
}

/** Emits only a bounded product milestone with no free-form or identifying properties. */
export function trackGa4Event(name, { environment = import.meta.env ?? {}, windowRef = globalThis.window } = {}) {
  if (!EVENT_NAMES.has(name) || !initializeGa4({ environment, windowRef, documentRef: windowRef?.document })) return false;
  windowRef.gtag('event', name);
  return true;
}
