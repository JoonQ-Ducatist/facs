/* Shared with the classic service worker; accepts only this service's destinations. */
self.facsPushMessage = function(value) {
  if (!value || typeof value.body !== 'string') return null;
  let url; try { url = new URL(value.url, self.location.origin); } catch { return null; }
  if (url.origin !== self.location.origin || !['/', '/ko/'].includes(url.pathname)) return null;
  const test = value.type === 'notification-test';
  if (test) {
    if (url.search !== '?notification_test=1' || url.hash) return null;
  } else if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(url.searchParams.get('post') || '')) return null;
  return { test, body: value.body.slice(0, 160), tag: String(value.tag || 'rating').slice(0, 80), url: url.href };
};
