/* Network-only PWA: never cache posts, media, authentication responses or app bundles. */
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || event.request.mode !== 'navigate' || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(fetch(event.request).catch(() => new Response(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>FACt.Smack · Offline</title><style>body{margin:0;padding:32px;min-height:80vh;display:grid;place-content:center;background:#fbf9f4;color:#182335;font:16px/1.6 system-ui}a{color:#a82d50}h1{font-size:24px}</style><main><h1>Connect for another perspective.</h1><p>Reconnect to the internet, then try again.</p><p lang="ko">인터넷에 연결한 후 다시 열어 주세요.</p><a href="/">Try again · 다시 시도</a></main></html>`, { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } })));
});
