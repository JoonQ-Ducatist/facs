const COPY = {
  ko: {
    tabTitle: 'FACt.Smack',
    title: 'FACt.Smack | 사람들의 평가를 데이터로',
    description: '사진과 오늘의 룩에 대한 사람들의 주관적 피드백을 안전하고 투명하게 확인하는 FACt.Smack 커뮤니티입니다.',
    ogLocale: 'ko_KR',
    ogAlternateLocale: 'en_US',
  },
  en: {
    tabTitle: 'FACt.Smack',
    title: 'FACt.Smack | Feedback, made visible',
    description: 'FACt.Smack is a transparent feedback platform for understanding people’s subjective ratings of your photos.',
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
  const copy = COPY[locale] ?? COPY.ko;
  const origin = window.location.origin.replace(/^http:\/\/(?:www\.)?factsmack\.com$/i, 'https://www.factsmack.com')
    .replace(/^https:\/\/factsmack\.com$/i, 'https://www.factsmack.com');
  const url = new URL(locale === 'ko' ? '/ko/' : '/', origin);
  const englishUrl = new URL('/', origin).href;
  const koreanUrl = new URL('/ko/', origin).href;
  document.documentElement.lang = locale;
  document.title = copy.tabTitle;
  upsertMeta('meta[name="description"]', { name: 'description', content: copy.description });
  upsertMeta('meta[property="og:title"]', { property: 'og:title', content: copy.title });
  upsertMeta('meta[property="og:description"]', { property: 'og:description', content: copy.description });
  upsertMeta('meta[property="og:url"]', { property: 'og:url', content: url.href });
  upsertMeta('meta[property="og:image"]', { property: 'og:image', content: new URL('/icon-512.png', url).href });
  upsertMeta('meta[property="og:locale"]', { property: 'og:locale', content: copy.ogLocale });
  upsertMeta('meta[property="og:locale:alternate"]', { property: 'og:locale:alternate', content: copy.ogAlternateLocale });
  upsertMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: copy.title });
  upsertMeta('meta[name="twitter:description"]', { name: 'twitter:description', content: copy.description });
  upsertMeta('meta[name="twitter:image"]', { name: 'twitter:image', content: new URL('/icon-512.png', url).href });
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
}
