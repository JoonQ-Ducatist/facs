/** English is the public default; Korean has a stable /ko/ URL. */
export const DEFAULT_LOCALE = 'en';
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
  const pathname = browser?.location?.pathname ?? '/';
  if (/^\/ko(?:\/|$)/.test(pathname)) return 'ko';

  // Authentication providers return through this route. Preserve the locale
  // selected before sign-in instead of interpreting the callback path.
  const pendingAuthLocale = consumePendingAuthLocale(browser);
  if (pendingAuthLocale) return pendingAuthLocale;

  // Backward compatibility for links already shared with ?locale=...
  const requested = new URLSearchParams(search).get('locale');
  if (AVAILABLE_LOCALES.includes(requested)) return requested;
  return DEFAULT_LOCALE;
}

export function localeUrl(locale, href = window.location.href) {
  const url = new URL(href);
  if (!AVAILABLE_LOCALES.includes(locale)) return `${url.pathname}${url.search}${url.hash}`;

  if (/^\/auth\/callback\/?$/.test(url.pathname)) {
    url.searchParams.set('locale', locale);
    return `${url.pathname}${url.search}${url.hash}`;
  }

  const basePath = url.pathname.replace(/^\/ko(?=\/|$)/, '') || '/';
  url.pathname = locale === 'ko'
    ? `/ko${basePath.startsWith('/') ? basePath : `/${basePath}`}`
    : basePath;
  if (locale === 'ko' && url.pathname === '/ko') url.pathname = '/ko/';
  url.searchParams.delete('locale');
  return `${url.pathname}${url.search}${url.hash}`;
}
