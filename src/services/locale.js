/** Resolve explicit URL choice first, then browser preference outside Korea. */
export const DEFAULT_LOCALE = 'ko';
export const AVAILABLE_LOCALES = ['ko', 'en'];
export const PLANNED_LOCALES = ['zh'];

export function resolveLocale(search = window.location.search, browser = window) {
  const requested = new URLSearchParams(search).get('locale');
  if (AVAILABLE_LOCALES.includes(requested)) return requested;

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
