import { useEffect, useRef, useState } from 'react';
import mothLogoUrl from '../../assets/facs-moth-logo-transparent.png';
import { BRAND_SPLASH_DURATION_MS, selectBrandTagline } from './brandSplash.js';

/** The brand-only entry screen: it never contains login controls or content navigation. */
export default function BrandSplashView({ locale = 'ko', onComplete, staticPreview = false }) {
  const [tagline] = useState(() => selectBrandTagline());
  const [progress, setProgress] = useState(0);
  const completed = useRef(false);

  function complete() {
    if (completed.current) return;
    completed.current = true;
    onComplete?.();
  }

  useEffect(() => {
    if (staticPreview) return undefined;
    const startedAt = performance.now();
    let frameId;
    const updateProgress = (now) => {
      setProgress(Math.min(1, (now - startedAt) / BRAND_SPLASH_DURATION_MS));
      if (now - startedAt < BRAND_SPLASH_DURATION_MS) frameId = requestAnimationFrame(updateProgress);
    };
    frameId = requestAnimationFrame(updateProgress);
    const timer = window.setTimeout(complete, BRAND_SPLASH_DURATION_MS);
    return () => {
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(timer);
    };
  }, [staticPreview]);

  const copy = locale === 'en' ? tagline.en : tagline.ko;

  return (
    <main className="brand-splash" aria-label={locale === 'en' ? 'FACt.Smack is loading' : 'FACt.Smack을 불러오는 중입니다'}>
      <div className="brand-splash__identity">
        <img className="brand-splash__moth" src={mothLogoUrl} alt="FACt.Smack 나방 심벌" />
        <p lang="en" className="brand-splash__wordmark"><span>FAC</span>t.<span>S</span>mack</p>
        <p className="brand-splash__tagline" aria-live="polite">{copy}</p>
      </div>
      <div className="brand-splash__footer">
        <div className="brand-splash__progress" aria-hidden="true"><span style={{ transform: `scaleX(${staticPreview ? 0.6 : progress})` }} /></div>
        {!staticPreview && <button type="button" className="brand-splash__skip" onClick={complete} aria-label={locale === 'en' ? 'Skip intro and continue' : '소개를 건너뛰고 계속하기'}>Skip</button>}
      </div>
    </main>
  );
}
