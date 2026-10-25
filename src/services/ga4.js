const EVENT_NAMES = new Set(['visitor_opened', 'signup_completed', 'first_vote', 'vote_completed', 'upload_completed', 'result_viewed', 'share_requested', 'boost_requested']);
const PRODUCTION_HOSTS = new Set(['www.factsmack.com', 'factsmack.com']);

function productionOrigin(windowRef) {
  try {
    const url = new URL(windowRef?.location?.origin);
    return url.protocol === 'https:' && PRODUCTION_HOSTS.has(url.hostname) ? url.origin : null;
  } catch { return null; }
}

function referralOrigin(documentRef) {
  try {
    const url = new URL(documentRef?.referrer);
    return ['https:', 'http:'].includes(url.protocol) ? `${url.origin}/` : '';
  } catch { return ''; }
}

function isAuthReferral(documentRef) {
  try {
    return ['accounts.google.com', 'rrcntobfmxlwbbjtlbge.supabase.co'].includes(new URL(documentRef?.referrer).hostname);
  } catch { return false; }
}

function measurementId(environment = import.meta.env ?? {}) {
  const value = String(environment.VITE_GA_MEASUREMENT_ID ?? '').trim();
  return /^G-[A-Z0-9]+$/i.test(value) ? value : null;
}

/** Loads privacy-reduced GA4 and never supplies email, handles, media URLs, or member IDs. */
export function initializeGa4({ environment = import.meta.env ?? {}, documentRef = globalThis.document, windowRef = globalThis.window } = {}) {
  const id = measurementId(environment);
  const origin = productionOrigin(windowRef);
  if (!id || !documentRef?.head || !origin) return false;
  try {
    windowRef.dataLayer ??= [];
    windowRef.gtag ??= function gtag() { windowRef.dataLayer.push(arguments); };
    if (!documentRef.querySelector(`script[data-facs-ga4="${id}"]`)) {
      const script = documentRef.createElement('script');
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
      script.dataset.facsGa4 = id;
      documentRef.head.append(script);
      windowRef.gtag('js', new Date());
      windowRef.gtag('config', id, {
        anonymize_ip: true,
        allow_google_signals: false,
        allow_ad_personalization_signals: false,
        send_page_view: true,
        page_location: `${origin}/`,
        page_title: 'FACt.Smack',
        page_referrer: isAuthReferral(documentRef) ? '' : referralOrigin(documentRef),
        ...(isAuthReferral(documentRef) ? { ignore_referrer: true } : {}),
      });
    }
    return true;
  } catch { return false; }
}

/** Emits only a bounded product milestone with no free-form or identifying properties. */
export function trackGa4Event(name, { environment = import.meta.env ?? {}, windowRef = globalThis.window } = {}) {
  if (!EVENT_NAMES.has(name) || !initializeGa4({ environment, windowRef, documentRef: windowRef?.document })) return false;
  try {
    windowRef.gtag('event', name);
    // The first vote is also a completed vote. Keep the existing milestone and
    // total-vote series without adding properties or touching server analytics.
    if (name === 'first_vote') windowRef.gtag('event', 'vote_completed');
    return true;
  } catch { return false; }
}
