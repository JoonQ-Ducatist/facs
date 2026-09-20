import { useEffect, useRef, useState } from 'react';
import mothLogoUrl from '../../assets/facs-moth-logo.png';
import { BRAND_SPLASH_DURATION_MS, selectBrandTagline } from './brandSplash.js';

const BACKGROUND_LUMINANCE_LIMIT = 82;

function removeConnectedDarkBackdrop(image) {
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  context.drawImage(image, 0, 0);

  const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
  const { data } = pixels;
  const source = new Uint8ClampedArray(data);
  const width = canvas.width;
  const height = canvas.height;
  const visited = new Uint8Array(width * height);
  const queue = [];
  const isBackdrop = (index) => {
    const offset = index * 4;
    return Math.max(data[offset], data[offset + 1], data[offset + 2]) <= BACKGROUND_LUMINANCE_LIMIT;
  };
  const enqueue = (index) => {
    if (visited[index] || !isBackdrop(index)) return;
    visited[index] = 1;
    queue.push(index);
  };

  for (let x = 0; x < width; x += 1) {
    enqueue(x);
    enqueue((height - 1) * width + x);
  }
  for (let y = 1; y < height - 1; y += 1) {
    enqueue(y * width);
    enqueue(y * width + width - 1);
  }

  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const index = queue[cursor];
    const x = index % width;
    const y = Math.floor(index / width);
    const offset = index * 4;
    data[offset + 3] = 0;
    if (x > 0) enqueue(index - 1);
    if (x < width - 1) enqueue(index + 1);
    if (y > 0) enqueue(index - width);
    if (y < height - 1) enqueue(index + width);
  }

  // Restore dark ink immediately bordering the white illustration; the true backdrop
  // remains transparent because it never touches a bright part of the emblem.
  for (let index = 0; index < width * height; index += 1) {
    const offset = index * 4;
    if (data[offset + 3] !== 0 || Math.max(source[offset], source[offset + 1], source[offset + 2]) > BACKGROUND_LUMINANCE_LIMIT) continue;
    const x = index % width;
    const y = Math.floor(index / width);
    let bordersIllustration = false;
    for (let offsetY = -2; offsetY <= 2 && !bordersIllustration; offsetY += 1) {
      for (let offsetX = -2; offsetX <= 2; offsetX += 1) {
        const neighborX = x + offsetX;
        const neighborY = y + offsetY;
        if (neighborX < 0 || neighborX >= width || neighborY < 0 || neighborY >= height) continue;
        const neighborOffset = (neighborY * width + neighborX) * 4;
        if (Math.min(source[neighborOffset], source[neighborOffset + 1], source[neighborOffset + 2]) >= 210) {
          bordersIllustration = true;
          break;
        }
      }
    }
    if (bordersIllustration) {
      data[offset] = source[offset];
      data[offset + 1] = source[offset + 1];
      data[offset + 2] = source[offset + 2];
      data[offset + 3] = 255;
    }
  }

  context.putImageData(pixels, 0, 0);
  return canvas.toDataURL('image/png');
}

/** The brand-only entry screen: it never contains login controls or content navigation. */
export default function BrandSplashView({ locale = 'ko', onComplete, staticPreview = false }) {
  const [tagline] = useState(() => selectBrandTagline());
  const [progress, setProgress] = useState(0);
  const [transparentMothUrl, setTransparentMothUrl] = useState(mothLogoUrl);
  const completed = useRef(false);

  useEffect(() => {
    const image = new Image();
    image.onload = () => {
      try { setTransparentMothUrl(removeConnectedDarkBackdrop(image)); } catch { setTransparentMothUrl(mothLogoUrl); }
    };
    image.src = mothLogoUrl;
  }, []);

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
        <img className="brand-splash__moth" src={transparentMothUrl} alt="FACt.Smack 나방 심벌" />
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
