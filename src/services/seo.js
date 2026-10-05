const COPY = {
  ko: {
    title: 'FACt.Smack | 사람들의 평가를 데이터로',
    description: '사진과 오늘의 룩에 대한 사람들의 주관적 피드백을 안전하고 투명하게 확인하는 FACt.Smack 커뮤니티입니다.',
  },
  en: {
    title: 'FACt.Smack | Feedback, made visible',
    description: 'FACt.Smack is a transparent feedback platform for understanding people’s subjective ratings of your photos.',
  },
};

function upsertMeta(selector, attributes) {
  let node = document.head.querySelector(selector);
  if (!node) { node = document.createElement('meta'); document.head.append(node); }
  Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, value));
}

/** Keeps the SPA's search and share metadata aligned with the selected language. */
export function applySeoMetadata(locale = 'ko') {
  if (typeof document === 'undefined') return;
  const copy = COPY[locale] ?? COPY.ko;
  // Auth callback state and QA query flags describe a browser session, not a
  // discoverable page. Search and share URLs therefore always canonicalize to
  // the single public application URL.
  const url = new URL('/', window.location.origin);
  document.documentElement.lang = locale;
  document.title = copy.title;
  upsertMeta('meta[name="description"]', { name: 'description', content: copy.description });
  upsertMeta('meta[property="og:title"]', { property: 'og:title', content: copy.title });
  upsertMeta('meta[property="og:description"]', { property: 'og:description', content: copy.description });
  upsertMeta('meta[property="og:url"]', { property: 'og:url', content: url.href });
  upsertMeta('meta[property="og:image"]', { property: 'og:image', content: new URL('/icon-512.png', url).href });
  upsertMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: copy.title });
  upsertMeta('meta[name="twitter:description"]', { name: 'twitter:description', content: copy.description });
  upsertMeta('meta[name="twitter:image"]', { name: 'twitter:image', content: new URL('/icon-512.png', url).href });
  let canonical = document.head.querySelector('link[rel="canonical"]');
  if (!canonical) { canonical = document.createElement('link'); canonical.setAttribute('rel', 'canonical'); document.head.append(canonical); }
  canonical.setAttribute('href', url.href);
}
