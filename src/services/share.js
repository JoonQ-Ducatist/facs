import { localeUrl } from './locale.js';

/** Builds a stable, locale-preserving guest evaluation URL without analytics-only query state. */
export function buildShareUrl(postId, locale = 'ko', href = window.location.href) {
  const source = new URL(href);
  const url = new URL(localeUrl(locale, href), source.origin);
  url.search = '';
  url.searchParams.set('post', postId);
  url.searchParams.set('shared', '1');
  return url.href;
}
