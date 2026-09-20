const COPY = {
  ko: {
    title: 'FACt.Smack | 사람들의 평가를 데이터로',
    description: '사진에 대한 사람들의 주관적인 평가를 안전하고 투명하게 확인하는 FACt.Smack 피드백 플랫폼입니다.',
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
  const url = new URL(window.location.href);
  url.searchParams.delete('state');
  document.documentElement.lang = locale;
  document.title = copy.title;
  upsertMeta('meta[name="description"]', { name: 'description', content: copy.description });
  upsertMeta('meta[property="og:title"]', { property: 'og:title', content: copy.title });
  upsertMeta('meta[property="og:description"]', { property: 'og:description', content: copy.description });
  upsertMeta('meta[property="og:url"]', { property: 'og:url', content: url.href });
  upsertMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: copy.title });
  upsertMeta('meta[name="twitter:description"]', { name: 'twitter:description', content: copy.description });
}
