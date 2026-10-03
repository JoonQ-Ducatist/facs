export const UPLOAD_IMAGE_MAX_EDGE = 2048;

/** Keeps formats that can lose transparency, animation, or device metadata untouched. */
export function shouldOptimizeImage(file) {
  return file instanceof File && file.type.toLowerCase() === 'image/jpeg';
}

/**
 * Reduces a large JPEG before it leaves the device. The original remains the
 * safe fallback whenever decoding or encoding is unavailable.
 */
export async function prepareImageForUpload(file) {
  if (!shouldOptimizeImage(file)) return file;
  try {
    const source = await loadImage(file);
    const largestEdge = Math.max(source.width, source.height);
    if (largestEdge <= UPLOAD_IMAGE_MAX_EDGE) return file;
    const scale = UPLOAD_IMAGE_MAX_EDGE / largestEdge;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(source.width * scale);
    canvas.height = Math.round(source.height * scale);
    canvas.getContext('2d')?.drawImage(source, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.86));
    if (!(blob instanceof Blob) || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.jpe?g$/i, '.jpg'), { type: 'image/jpeg', lastModified: file.lastModified });
  } catch {
    return file;
  }
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('image decode failed')); };
    image.src = url;
  });
}
