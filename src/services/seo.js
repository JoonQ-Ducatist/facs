import { DISCOVERY_CONTENT } from './discoveryContent.js';

const COPY = {
  ko: {
    ogLocale: 'ko_KR',
    ogAlternateLocale: 'en_US',
  },
  en: {
    ogLocale: 'en_US',
    ogAlternateLocale: 'ko_KR',
  },
};

function upsertMeta(selector, attributes) {
  let node = document.head.querySelector(selector);
  if (!node) { node = document.createElement('meta'); document.head.append(node); }
  Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, value));
}

/** Keeps the SPA's search and share metadata aligned with the selected language. */
export function applySeoMetadata(locale = 'en') {
  if (typeof document === 'undefined') return;
  locale = locale === 'ko' ? 'ko' : 'en';
  const copy = { ...COPY[locale], ...DISCOVERY_CONTENT[locale] };
  const origin = window.location.origin.replace(/^http:\/\/(?:www\.)?factsmack\.com$/i, 'https://www.factsmack.com')
    .replace(/^https:\/\/factsmack\.com$/i, 'https://www.factsmack.com');
  const url = new URL(locale === 'ko' ? '/ko/' : '/', origin);
  const englishUrl = new URL('/', origin).href;
  const koreanUrl = new URL('/ko/', origin).href;
  document.documentElement.lang = locale;
  document.title = copy.title;
  upsertMeta('meta[name="description"]', { name: 'description', content: copy.description });
  upsertMeta('meta[property="og:title"]', { property: 'og:title', content: copy.title });
  upsertMeta('meta[property="og:description"]', { property: 'og:description', content: copy.description });
  upsertMeta('meta[property="og:url"]', { property: 'og:url', content: url.href });
  upsertMeta('meta[property="og:image"]', { property: 'og:image', content: new URL('/icon-512.png', url).href });
  upsertMeta('meta[property="og:image:alt"]', { property: 'og:image:alt', content: 'FACt.Smack' });
  upsertMeta('meta[property="og:locale"]', { property: 'og:locale', content: copy.ogLocale });
  upsertMeta('meta[property="og:locale:alternate"]', { property: 'og:locale:alternate', content: copy.ogAlternateLocale });
  upsertMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: copy.title });
  upsertMeta('meta[name="twitter:description"]', { name: 'twitter:description', content: copy.description });
  upsertMeta('meta[name="twitter:image"]', { name: 'twitter:image', content: new URL('/icon-512.png', url).href });
  upsertMeta('meta[name="twitter:image:alt"]', { name: 'twitter:image:alt', content: 'FACt.Smack' });
  let canonical = document.head.querySelector('link[rel="canonical"]');
  if (!canonical) { canonical = document.createElement('link'); canonical.setAttribute('rel', 'canonical'); document.head.append(canonical); }
  canonical.setAttribute('href', url.href);
  for (const [language, href] of [['en', englishUrl], ['ko', koreanUrl], ['x-default', englishUrl]]) {
    const selector = `link[rel="alternate"][hreflang="${language}"]`;
    let alternate = document.head.querySelector(selector);
    if (!alternate) {
      alternate = document.createElement('link');
      alternate.setAttribute('rel', 'alternate');
      alternate.setAttribute('hreflang', language);
      document.head.append(alternate);
    }
    alternate.setAttribute('href', href);
  }
  const structured = document.head.querySelector('script[type="application/ld+json"]');
  if (structured?.textContent) {
    try {
      const schema = JSON.parse(structured.textContent);
      const page = schema['@graph']?.find((node) => node['@type'] === 'WebPage');
      if (page) {
        Object.assign(page, { '@id': `${url.href}#webpage`, url: url.href, name: copy.title, description: copy.description, inLanguage: locale });
        structured.textContent = JSON.stringify(schema).replaceAll('<', '\\u003c');
      }
    } catch { /* A metadata failure must not affect authentication or feed access. */ }
  }
}
