import { localeUrl } from './locale.js';

const POST_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const AUTH_SHARED_POST_KEY = 'facs_auth_shared_post';
const AUTH_SHARED_POST_TTL = 30 * 60 * 1000;

export function normalizeSharedPostId(value) {
  return typeof value === 'string' && POST_ID.test(value) ? value.toLowerCase() : null;
}

export function rememberSharedPostForAuth(value, locale, storage, now = Date.now()) {
  try {
    const session = storage ?? window.sessionStorage;
    const id = normalizeSharedPostId(value);
    if (id) session.setItem(AUTH_SHARED_POST_KEY, JSON.stringify({ id, locale, expiresAt: now + AUTH_SHARED_POST_TTL }));
    else session.removeItem(AUTH_SHARED_POST_KEY);
  } catch { /* Private browsing can deny session storage. */ }
}

export function readSharedPostForAuth(storage, now = Date.now()) {
  try {
    const session = storage ?? window.sessionStorage;
    const intent = JSON.parse(session.getItem(AUTH_SHARED_POST_KEY));
    if (!Number.isFinite(intent?.expiresAt) || intent.expiresAt <= now) return null;
    const id = normalizeSharedPostId(intent.id);
    return id ? { id, locale: intent.locale === 'ko' ? 'ko' : 'en' } : null;
  } catch { return null; }
}

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
