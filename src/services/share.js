import { localeUrl } from './locale.js';

/** Builds a stable, locale-preserving guest evaluation URL without analytics-only query state. */
export function buildShareUrl(postId, locale = 'ko', href = window.location.href, preview = false) {
  const source = new URL(href);
  if(preview && /^[0-9a-f-]{36}$/i.test(postId)){const link=new URL('/s/'+postId,source.origin);if(locale==='ko')link.searchParams.set('locale','ko');return link.href;}
  const url = new URL(localeUrl(locale, href), source.origin);
  url.search = '';
  url.searchParams.set('post', postId);
  url.searchParams.set('shared', '1');
  return url.href;
}
