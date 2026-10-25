const DAY_KEY = 'facs_pwa_hide_day_v1';
const INSTALLED_KEY = 'facs_pwa_installed_v1';

export function localDay(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function installPlatform(navigator = {}) {
  const ua = navigator.userAgent ?? '';
  if (/Instagram|FBAN|FBAV|TikTok|Bytedance|Line\//i.test(ua)) return 'in-app';
  if (/iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) return 'ios';
  return 'browser';
}

/** One auto invitation per document visit; only “hide today” persists across visits. */
export function createInstallController(browser, now = () => new Date()) {
  const listeners = new Set();
  const memory = new Map();
  let visited = false;
  let started = false;
  let promptEvent = null;
  let snapshot = { installed: false, suppressed: false, nativeReady: false, platform: installPlatform(browser.navigator) };
  const read = (key) => { try { return browser.localStorage?.getItem(key) ?? memory.get(key); } catch { return memory.get(key); } };
  const write = (key, value) => { memory.set(key, value); try { browser.localStorage?.setItem(key, value); } catch { /* Optional even without storage. */ } };
  const standalone = () => Boolean(browser.navigator?.standalone || browser.matchMedia?.('(display-mode: standalone)').matches);
  const publish = () => {
    const next = { installed: standalone() || read(INSTALLED_KEY) === 'yes', suppressed: read(DAY_KEY) === localDay(now()), nativeReady: Boolean(promptEvent), platform: snapshot.platform };
    if (Object.keys(next).some((key) => next[key] !== snapshot[key])) { snapshot = next; listeners.forEach((listener) => listener()); }
  };
  const installed = () => { promptEvent = null; write(INSTALLED_KEY, 'yes'); publish(); };
  return {
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    getSnapshot: () => snapshot,
    start() {
      if (started) return;
      started = true;
      if (standalone()) write(INSTALLED_KEY, 'yes');
      browser.addEventListener('beforeinstallprompt', (event) => {
        event.preventDefault();
        write(INSTALLED_KEY, 'no');
        promptEvent = event;
        publish();
      });
      browser.addEventListener('appinstalled', installed);
      browser.addEventListener('storage', publish);
      browser.addEventListener('pageshow', publish);
      browser.document?.addEventListener('visibilitychange', publish);
      publish();
    },
    canShow() { publish(); return !visited && !snapshot.installed && !snapshot.suppressed; },
    markShown() { visited = true; },
    hideToday() { visited = true; write(DAY_KEY, localDay(now())); publish(); },
    closeVisit() { visited = true; },
    wasShown: () => visited,
    resetDismissalForLocalCheck() {
      visited = false;
      memory.delete(DAY_KEY);
      try { browser.localStorage?.removeItem(DAY_KEY); } catch { /* Preserve the storage-unavailable fallback. */ }
      publish();
    },
    async install() {
      const event = promptEvent;
      if (!event) return 'unavailable';
      promptEvent = null;
      publish();
      try {
        await event.prompt();
        const choice = await event.userChoice;
        return choice?.outcome === 'accepted' ? 'accepted' : 'dismissed';
      } catch { return 'unavailable'; }
    },
  };
}

let controller;
export function getInstallController() {
  if (!controller) controller = createInstallController(window);
  controller.start();
  return controller;
}

export function setPwaLocale(locale, document = window.document) {
  document.querySelector('link[rel="manifest"]')?.setAttribute('href', locale === 'ko' ? '/manifest-ko.webmanifest' : '/manifest.webmanifest');
}

export function initializePwa() {
  getInstallController();
  if (window.isSecureContext && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' }).catch(() => { /* Never block the website. */ });
    }, { once: true });
  }
}
