/* Network-only PWA: never cache posts, media, authentication responses or app bundles. */
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || event.request.mode !== 'navigate' || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(fetch(event.request).catch(() => new Response(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>FACt.Smack · Offline</title><style>body{margin:0;padding:32px;min-height:80vh;display:grid;place-content:center;background:#fbf9f4;color:#182335;font:16px/1.6 system-ui}a{color:#a82d50}h1{font-size:24px}</style><main><h1>Connect for another perspective.</h1><p>Reconnect to the internet, then try again.</p><p lang="ko">인터넷에 연결한 후 다시 열어 주세요.</p><a href="/">Try again · 다시 시도</a></main></html>`, { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } })));
});

self.addEventListener('push',event=>{
 let value;try{value=event.data?.json();}catch{return;}
 if(!value||typeof value.body!=='string')return;
 let url;try{url=new URL(value.url,self.location.origin);}catch{return;}
 if(url.origin!==self.location.origin||!['/','/ko/'].includes(url.pathname)||!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(url.searchParams.get('post')||''))return;
 event.waitUntil(self.registration.showNotification('FACt.Smack',{body:value.body.slice(0,160),icon:'/icon-192.png',badge:'/icon-192.png',tag:String(value.tag||'rating').slice(0,80),data:{url:url.href}}));
});
self.addEventListener('notificationclick',event=>{
 event.notification.close();let url;try{url=new URL(event.notification.data?.url);if(url.origin!==self.location.origin)return;}catch{return;}url=url.href;
 event.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(async windows=>{const existing=windows.find(w=>new URL(w.url).origin===self.location.origin);if(existing){await existing.navigate(url);return existing.focus();}return clients.openWindow(url);}));
});
