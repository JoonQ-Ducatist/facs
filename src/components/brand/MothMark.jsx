import { useEffect, useState } from 'react';
import mothLogoUrl from '../../assets/facs-moth-logo.png';

const BACKDROP_LIMIT = 82;
let preparedMothUrl = null;

function makeTransparentMoth(image) {
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  context.drawImage(image, 0, 0);
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
  const { data } = pixels;
  const source = new Uint8ClampedArray(data);
  const { width, height } = canvas;
  const visited = new Uint8Array(width * height);
  const queue = [];
  const isBackdrop = (index) => {
    const offset = index * 4;
    return Math.max(data[offset], data[offset + 1], data[offset + 2]) <= BACKDROP_LIMIT;
  };
  const enqueue = (index) => {
    if (visited[index] || !isBackdrop(index)) return;
    visited[index] = 1;
    queue.push(index);
  };
  for (let x = 0; x < width; x += 1) { enqueue(x); enqueue((height - 1) * width + x); }
  for (let y = 1; y < height - 1; y += 1) { enqueue(y * width); enqueue(y * width + width - 1); }
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const index = queue[cursor];
    const x = index % width;
    const y = Math.floor(index / width);
    data[index * 4 + 3] = 0;
    if (x > 0) enqueue(index - 1);
    if (x < width - 1) enqueue(index + 1);
    if (y > 0) enqueue(index - width);
    if (y < height - 1) enqueue(index + width);
  }
  for (let index = 0; index < width * height; index += 1) {
    const offset = index * 4;
    if (data[offset + 3] !== 0 || Math.max(source[offset], source[offset + 1], source[offset + 2]) > BACKDROP_LIMIT) continue;
    const x = index % width;
    const y = Math.floor(index / width);
    let bordersIllustration = false;
    for (let offsetY = -2; offsetY <= 2 && !bordersIllustration; offsetY += 1) {
      for (let offsetX = -2; offsetX <= 2; offsetX += 1) {
        const neighborX = x + offsetX;
        const neighborY = y + offsetY;
        if (neighborX < 0 || neighborX >= width || neighborY < 0 || neighborY >= height) continue;
        const neighborOffset = (neighborY * width + neighborX) * 4;
        if (Math.min(source[neighborOffset], source[neighborOffset + 1], source[neighborOffset + 2]) >= 210) { bordersIllustration = true; break; }
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

/** Shared mark keeps the supplied moth artwork while clearing only its connected backdrop. */
export default function MothMark({ className = '', width, height, alt = 'FACt.Smack 나방 심벌' }) {
  const [src, setSrc] = useState(preparedMothUrl);
  useEffect(() => {
    if (preparedMothUrl) { setSrc(preparedMothUrl); return undefined; }
    const image = new Image();
    image.onload = () => {
      try {
        preparedMothUrl = makeTransparentMoth(image);
        setSrc(preparedMothUrl);
      } catch { setSrc(mothLogoUrl); }
    };
    image.src = mothLogoUrl;
    return undefined;
  }, []);
  return <img src={src ?? mothLogoUrl} width={width} height={height} className={className} alt={alt} />;
}
