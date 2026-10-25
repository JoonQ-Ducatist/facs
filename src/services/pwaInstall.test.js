import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { createInstallController, installPlatform, localDay, setPwaLocale } from './pwaInstall.js';

function fakeBrowser(storage = new Map()) {
  const handlers = new Map();
  const browser = {
    navigator: { userAgent: 'Android Chrome' },
    matchMedia: () => ({ matches: false }),
    localStorage: { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: (key) => storage.delete(key) },
    addEventListener: (name, listener) => handlers.set(name, listener),
    document: { addEventListener: (name, listener) => handlers.set(name, listener) },
    emit: (name, event = {}) => handlers.get(name)?.(event),
  };
  return browser;
}

test('closing survives screen remount and resume; hide-today also survives new visits until local midnight', () => {
  const storage = new Map();
  let date = new Date(2026, 9, 25, 23, 59);
  const browser = fakeBrowser(storage);
  const visit = createInstallController(browser, () => date);
  visit.start();
  assert.equal(visit.canShow(), true);
  visit.markShown(); visit.closeVisit();
  for (const event of ['pageshow', 'visibilitychange', 'storage']) { browser.emit(event); visit.start(); assert.equal(visit.canShow(), false); }
  const nextVisit = createInstallController(fakeBrowser(storage), () => date);
  nextVisit.start();
  assert.equal(nextVisit.canShow(), true);
  nextVisit.hideToday();
  const sameDay = createInstallController(fakeBrowser(storage), () => date);
  sameDay.start();
  assert.equal(sameDay.canShow(), false);
  date = new Date(2026, 9, 26, 0, 1);
  assert.equal(localDay(date), '2026-10-26');
  assert.equal(sameDay.canShow(), true);
  const blocked = fakeBrowser();
  Object.defineProperty(blocked, 'localStorage', { get() { throw new Error('storage blocked'); } });
  const resilient = createInstallController(blocked, () => date);
  resilient.start(); resilient.hideToday();
  assert.equal(resilient.canShow(), false);
});

test('local dismissal reset removes only the invitation choice and preserves authentication and installation', () => {
  const storage = new Map([['supabase-session', 'keep-session'], ['facs_pwa_installed_v1', 'yes']]);
  const browser = fakeBrowser(storage);
  const runtime = createInstallController(browser, () => new Date(2026, 9, 25));
  runtime.start(); runtime.hideToday();
  assert.equal(runtime.getSnapshot().suppressed, true);
  runtime.resetDismissalForLocalCheck();
  assert.equal(runtime.getSnapshot().suppressed, false);
  assert.equal(runtime.wasShown(), false);
  assert.equal(storage.get('supabase-session'), 'keep-session');
  assert.equal(runtime.getSnapshot().installed, true);
  assert.equal(runtime.canShow(), false);
  storage.delete('facs_pwa_installed_v1'); browser.emit('storage');
  const fresh = createInstallController(fakeBrowser(storage)); fresh.start();
  assert.equal(fresh.canShow(), true);
});

test('native prompt is consumed once; only installation evidence suppresses installed apps', async () => {
  const browser = fakeBrowser();
  const runtime = createInstallController(browser);
  runtime.start();
  let prompts = 0;
  let prevented = 0;
  browser.emit('beforeinstallprompt', { preventDefault() { prevented += 1; }, prompt() { prompts += 1; }, userChoice: Promise.resolve({ outcome: 'accepted' }) });
  assert.equal(runtime.getSnapshot().nativeReady, true);
  assert.equal(await runtime.install(), 'accepted');
  assert.equal(await runtime.install(), 'unavailable');
  assert.equal(prompts, 1); assert.equal(prevented, 1);
  assert.equal(runtime.getSnapshot().installed, false);
  browser.emit('beforeinstallprompt', { preventDefault() {}, prompt() {}, userChoice: Promise.resolve({ outcome: 'dismissed' }) });
  assert.equal(await runtime.install(), 'dismissed');
  assert.equal(runtime.getSnapshot().installed, false);
  browser.emit('appinstalled');
  assert.equal(runtime.getSnapshot().installed, true);
  assert.equal(runtime.canShow(), false);
  browser.emit('beforeinstallprompt', { preventDefault() {}, prompt() { throw new Error('browser rejected'); } });
  assert.equal(await runtime.install(), 'unavailable');
  const ios = fakeBrowser(); ios.navigator.standalone = true;
  const installed = createInstallController(ios); installed.start();
  assert.equal(installed.canShow(), false);
  assert.equal(installPlatform({ userAgent: 'iPhone CriOS' }), 'ios');
  assert.equal(installPlatform({ platform: 'MacIntel', maxTouchPoints: 5 }), 'ios');
  assert.equal(installPlatform({ userAgent: 'iPhone Instagram' }), 'in-app');
  let href;
  setPwaLocale('ko', { querySelector: () => ({ setAttribute: (_, value) => { href = value; } }) });
  assert.equal(href, '/manifest-ko.webmanifest');
});

test('PWA keeps localized stable identity and serves fresh navigation without caching private media or APIs', async () => {
  const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');
  const [english, korean] = await Promise.all(['../../public/manifest.webmanifest', '../../public/manifest-ko.webmanifest'].map(async (path) => JSON.parse(await read(path))));
  assert.equal(english.id, korean.id);
  assert.equal(english.scope, '/'); assert.equal(korean.start_url, '/ko/?source=pwa');
  assert.equal(english.display, 'standalone'); assert.equal(korean.orientation, 'any');
  let handler;
  let offline = false;
  const requests = [];
  runInNewContext(await read('../../public/sw.js'), {
    self: { location: { origin: 'https://www.factsmack.com' }, addEventListener: (_, value) => { handler = value; } }, URL, Response,
    fetch: async (request) => { requests.push(request); if (offline) throw new Error('offline'); return new Response('fresh navigation'); },
  });
  for (const request of [
    { method: 'POST', mode: 'navigate', url: 'https://www.factsmack.com/' },
    { method: 'GET', mode: 'cors', url: 'https://www.factsmack.com/api/profile' },
    { method: 'GET', mode: 'cors', url: 'https://example.supabase.co/storage/private.jpg' },
  ]) handler({ request, respondWith() { assert.fail('private/API request must not be intercepted'); } });
  assert.equal(requests.length, 0);
  let response;
  const navigation = () => handler({ request: { method: 'GET', mode: 'navigate', url: 'https://www.factsmack.com/ko/' }, respondWith(promise) { response = promise; } });
  navigation(); assert.equal(await (await response).text(), 'fresh navigation');
  offline = true; navigation();
  const fallback = await response;
  assert.equal(fallback.status, 503); assert.equal(fallback.headers.get('Cache-Control'), 'no-store');
  assert.match(await fallback.text(), /인터넷에 연결/);
});
