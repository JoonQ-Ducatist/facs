/** Capture an already-decoded frame without creating or loading another video. */
export function captureVideoPoster(video, createCanvas = () => document.createElement('canvas')) {
  if (!video || video.readyState < 2 || !video.videoWidth || !video.videoHeight) return '';
  try {
    const canvas = createCanvas();
    const scale = Math.min(1, 640 / Math.max(video.videoWidth, video.videoHeight));
    canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
    canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
    const context = canvas.getContext('2d');
    if (!context) return '';
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.82);
  } catch {
    // A browser/CORS capture failure must leave native playback available.
    return '';
  }
}
