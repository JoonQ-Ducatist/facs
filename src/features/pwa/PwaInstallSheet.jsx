import { useEffect, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { Download, Share, Ellipsis, PlusSquare, ArrowUpRight } from 'lucide-react';
import { getInstallController, setPwaLocale } from '../../services/pwaInstall.js';
import './pwa.css';

const COPY = {
  en: {
    title: 'Your next perspective. One tap away.', body: 'Add FACt.Smack to your Home Screen.',
    install: 'Install FACt.Smack', guide: 'Add to Home Screen', how: 'See how to install',
    today: 'Don’t show again today', close: 'Close', guideTitle: 'Add FACt.Smack in a few taps',
    ios: ['Open Share in your browser (or Page Menu → Share).', 'Choose “Add to Home Screen”.', 'Keep “Open as Web App” on if shown, then tap “Add”.'],
    browser: ['Open your browser’s menu (⋮ or ⋯).', 'Choose “Install app” or “Add to Home Screen”.', 'Confirm the browser’s installation step.'],
    inApp: ['Open this page in Safari or Chrome using the app’s menu.', 'Then choose Share / browser menu → “Add to Home Screen”.'],
    note: 'Internet connection required. Installation is optional.', unavailable: 'Use your browser’s menu to add FACt.Smack.',
  },
  ko: {
    title: '새로운 시선, 터치 한 번이면.', body: 'FACt.Smack을 홈 화면에 추가하세요.',
    install: 'FACt.Smack 설치', guide: '홈 화면에 추가', how: '설치 방법 보기',
    today: '오늘 하루 그만보기', close: '닫기', guideTitle: '몇 번의 터치로 홈 화면에',
    ios: ['브라우저의 공유를 여세요. (또는 페이지 메뉴 → 공유)', '‘홈 화면에 추가’를 선택하세요.', '‘웹 앱으로 열기’가 보이면 켜고 ‘추가’를 누르세요.'],
    browser: ['브라우저 메뉴(⋮ 또는 ⋯)를 여세요.', '‘앱 설치’ 또는 ‘홈 화면에 추가’를 선택하세요.', '브라우저의 설치 확인 단계를 완료하세요.'],
    inApp: ['앱 메뉴에서 이 페이지를 Safari 또는 Chrome으로 여세요.', '공유 또는 브라우저 메뉴 → ‘홈 화면에 추가’를 선택하세요.'],
    note: '인터넷 연결이 필요해요. 설치 없이도 이용할 수 있어요.', unavailable: '브라우저 메뉴에서 FACt.Smack을 추가해 주세요.',
  },
};

/** Non-modal: no focus steal or interaction barrier for the underlying website. */
export default function PwaInstallSheet({ locale = 'en', enabled = true }) {
  const runtime = getInstallController();
  const state = useSyncExternalStore(runtime.subscribe, runtime.getSnapshot);
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [safe, setSafe] = useState(false);
  const [guide, setGuide] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(false);
  const [checkRun, setCheckRun] = useState(0);
  const localCheck = import.meta.env.DEV && new URLSearchParams(window.location.search).get('pwaCheck') === '1';
  const copy = COPY[locale] ?? COPY.en;
  useEffect(() => { setPwaLocale(locale); }, [locale]);
  useEffect(() => { const timer = window.setTimeout(() => setReady(true), 5000); return () => window.clearTimeout(timer); }, [checkRun]);
  useEffect(() => {
    const query = window.matchMedia('(max-width: 1023px)');
    let frame;
    let nativeFullscreen = false;
    const check = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const editing = document.activeElement?.matches('input, textarea, select, [contenteditable="true"], [contenteditable=""]');
        const dialog = document.querySelector('[role="dialog"], [aria-modal="true"], [data-pwa-install-block], .auth-entry-screen input[type="email"], .auth-entry-screen input[autocomplete="one-time-code"]');
        const keyboard = window.visualViewport && window.visualViewport.height < window.innerHeight * 0.75;
        setSafe(query.matches && document.visibilityState !== 'hidden' && !editing && !dialog && !keyboard && !nativeFullscreen && !document.fullscreenElement);
      });
    };
    const observer = new MutationObserver(check);
    observer.observe(document.body, { childList: true, subtree: true });
    const events = ['focusin', 'focusout', 'fullscreenchange', 'visibilitychange'];
    events.forEach((event) => document.addEventListener(event, check, true));
    const nativeVideo = (event) => { nativeFullscreen = event.type === 'webkitbeginfullscreen'; check(); };
    document.addEventListener('webkitbeginfullscreen', nativeVideo, true);
    document.addEventListener('webkitendfullscreen', nativeVideo, true);
    window.addEventListener('resize', check);
    window.visualViewport?.addEventListener('resize', check);
    query.addEventListener('change', check);
    check();
    return () => {
      observer.disconnect(); window.cancelAnimationFrame(frame);
      events.forEach((event) => document.removeEventListener(event, check, true));
      document.removeEventListener('webkitbeginfullscreen', nativeVideo, true);
      document.removeEventListener('webkitendfullscreen', nativeVideo, true);
      window.removeEventListener('resize', check); window.visualViewport?.removeEventListener('resize', check); query.removeEventListener('change', check);
    };
  }, []);
  useEffect(() => {
    if (enabled && ready && safe && !open && runtime.canShow()) { runtime.markShown(); setOpen(true); }
  }, [enabled, ready, safe, open, runtime, state]);
  const visible = open && enabled && safe && !state.installed && !state.suppressed;
  useEffect(() => {
    if (!visible) return undefined;
    const escape = (event) => { if (event.key === 'Escape') { runtime.closeVisit(); setOpen(false); } };
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, [visible, runtime]);
  if (!visible) return localCheck ? createPortal(<aside aria-label="PWA 로컬 점검" className="pwa-local-check">
    <strong>PWA 로컬 점검</strong>
    <p>{state.suppressed ? '오늘 하루 숨김이 저장되어 있습니다.' : state.installed ? '이 브라우저에 설치 확인이 저장되어 있습니다.' : runtime.wasShown() ? '이번 방문의 안내가 이미 종료되었습니다.' : !ready ? '첫 안내 대기 중입니다. (5초)' : !safe ? '화면 폭·입력·팝업·백그라운드 조건으로 대기 중입니다.' : !enabled ? '현재 화면은 안내 대상이 아닙니다.' : '설치 안내를 준비 중입니다.'}</p>
    <button type="button" onClick={() => { runtime.resetDismissalForLocalCheck(); setOpen(false); setReady(false); setCheckRun((value) => value + 1); }}>점검용 숨김 선택 초기화</button>
    <small>로컬 전용 · 로그인 정보와 설치 확인은 유지합니다.</small>
  </aside>, document.body) : null;
  async function install() {
    if (!state.nativeReady) { setGuide(true); return; }
    setBusy(true);
    const result = await runtime.install();
    setBusy(false);
    if (result === 'accepted' || result === 'dismissed') { runtime.closeVisit(); setOpen(false); }
    else { setGuide(true); if (result === 'unavailable') setNotice(true); }
  }
  const steps = state.platform === 'in-app' ? copy.inApp : state.platform === 'ios' ? copy.ios : copy.browser;
  return createPortal(<aside className={`pwa-install-sheet${guide ? ' pwa-install-sheet--guide' : ''}`} role="region" aria-labelledby="pwa-install-title" lang={locale}>
    <div className="pwa-install-sheet__identity"><img src="/icon-192.png" width="52" height="52" alt="" /><div><span className="pwa-install-sheet__eyebrow">FACt.Smack</span><h2 id="pwa-install-title">{guide ? copy.guideTitle : copy.title}</h2>{!guide && <p>{copy.body}</p>}</div></div>
    {guide ? <div className="pwa-install-sheet__guide"><ol>{steps.map((step, index) => <li key={step}><span aria-hidden="true">{index === 0 ? (state.platform === 'ios' ? <Share size={16} /> : <Ellipsis size={16} />) : <PlusSquare size={16} />}</span>{step}</li>)}</ol><p>{copy.note}</p>{notice && <p role="status">{copy.unavailable}</p>}</div>
      : <button className="pwa-install-sheet__install" type="button" onClick={install} disabled={busy}><Download size={17} aria-hidden="true" />{state.nativeReady ? copy.install : state.platform === 'ios' ? copy.guide : copy.how}<ArrowUpRight size={15} aria-hidden="true" /></button>}
    <footer><button type="button" onClick={() => { runtime.hideToday(); setOpen(false); }}>{copy.today}</button><button type="button" onClick={() => { runtime.closeVisit(); setOpen(false); }}>{copy.close}</button></footer>
  </aside>, document.body);
}
