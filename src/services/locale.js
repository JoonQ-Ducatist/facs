/** Resolve explicit URL choice first, then browser preference outside Korea. */
export const DEFAULT_LOCALE = 'ko';
export const AVAILABLE_LOCALES = ['ko', 'en'];
export const PLANNED_LOCALES = ['zh'];
const PENDING_AUTH_LOCALE_KEY = 'facs_pending_auth_locale';
const PENDING_AUTH_LOCALE_TTL_MS = 30 * 60 * 1000;

export function rememberAuthLocale(locale, browser = window) {
  if (!AVAILABLE_LOCALES.includes(locale)) return;
  const value = JSON.stringify({ locale, expiresAt: Date.now() + PENDING_AUTH_LOCALE_TTL_MS });
  try {
    browser.localStorage?.setItem(PENDING_AUTH_LOCALE_KEY, value);
    return;
  } catch { /* Fall back to tab storage in private browsing. */ }
  try { browser.sessionStorage?.setItem(PENDING_AUTH_LOCALE_KEY, value); } catch { /* Storage can be unavailable in private browsing. */ }
}

function consumePendingAuthLocale(browser) {
  if (!/^\/auth\/callback\/?$/.test(browser?.location?.pathname ?? '')) return null;
  for (const storageName of ['localStorage', 'sessionStorage']) {
    try {
      const storage = browser[storageName];
      const saved = JSON.parse(storage?.getItem(PENDING_AUTH_LOCALE_KEY) ?? 'null');
      storage?.removeItem(PENDING_AUTH_LOCALE_KEY);
      if (saved?.expiresAt > Date.now() && AVAILABLE_LOCALES.includes(saved?.locale)) return saved.locale;
    } catch { /* Try the other browser storage area. */ }
  }
  return null;
}

export function resolveLocale(search = window.location.search, browser = window) {
  const requested = new URLSearchParams(search).get('locale');
  if (AVAILABLE_LOCALES.includes(requested)) return requested;

  const pendingAuthLocale = consumePendingAuthLocale(browser);
  if (pendingAuthLocale) return pendingAuthLocale;

  const hostname = browser?.location?.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1') return DEFAULT_LOCALE;

  const languagePreferences = browser?.navigator?.languages?.length
    ? browser.navigator.languages
    : [browser?.navigator?.language];
  const preferredLocale = languagePreferences
    .map((language) => String(language ?? '').toLowerCase().split('-')[0])
    .find((language) => AVAILABLE_LOCALES.includes(language));

  if (preferredLocale) return preferredLocale;
  return DEFAULT_LOCALE;
}

export function localeUrl(locale, href = window.location.href) {
  const url = new URL(href);
  // Preserve an explicit manual selection in the URL. Removing `locale=ko`
  // would make a browser-language heuristic able to override the user's click.
  if (AVAILABLE_LOCALES.includes(locale)) url.searchParams.set('locale', locale);
  return `${url.pathname}${url.search}${url.hash}`;
}
