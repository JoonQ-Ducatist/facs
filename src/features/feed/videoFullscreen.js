/** 정의: 브라우저별 네이티브 동영상 전체화면을 한 번의 사용자 제스처에서 안전하게 시작한다. */

/**
 * Enters native video fullscreen without retaining app-level fullscreen state.
 * iOS WebKit needs playback to be prepared before an unplayed video can enter;
 * standards-based browsers use their direct element fullscreen API.
 * @param {HTMLVideoElement} video
 * @param {{ schedule?: (callback: () => void, delay: number) => unknown }} options
 * @returns {{ mode: 'webkit'|'standard'|'unavailable', preparedPlayback: boolean }}
 */
export function enterNativeVideoFullscreen(video, { schedule = (callback, delay) => window.setTimeout(callback, delay) } = {}) {
  if (!video) return { mode: 'unavailable', preparedPlayback: false };

  if (typeof video.webkitEnterFullscreen === 'function') {
    const wasPaused = video.paused;
    const previousTime = Number.isFinite(video.currentTime) ? video.currentTime : 0;
    let didBeginFullscreen = false;
    const markFullscreenStarted = () => { didBeginFullscreen = true; };
    const requestWebkitFullscreen = () => {
      if (video.webkitDisplayingFullscreen) return true;
      try { video.webkitEnterFullscreen(); return true; } catch { return false; }
    };
    const restorePreviewAfterFailure = () => {
      video.removeEventListener?.('webkitbeginfullscreen', markFullscreenStarted);
      if (didBeginFullscreen || video.webkitDisplayingFullscreen || !wasPaused) return;
      video.pause();
      try { video.currentTime = previousTime; } catch { /* Some streams are not seekable until metadata arrives. */ }
    };

    video.addEventListener?.('webkitbeginfullscreen', markFullscreenStarted, { once: true });
    if (video.readyState === 0) video.load();
    let playRequest;
    try { if (video.paused) playRequest = video.play(); } catch { /* The synchronous fullscreen attempt still runs below. */ }

    // Both calls originate from the click handler. The first keeps transient
    // activation; the second covers WebKit that becomes eligible after play().
    requestWebkitFullscreen();
    if (playRequest?.then) {
      Promise.resolve(playRequest)
        .then(() => { if (!video.webkitDisplayingFullscreen) requestWebkitFullscreen(); })
        .catch(() => {})
        .finally(() => schedule(restorePreviewAfterFailure, 600));
    } else schedule(restorePreviewAfterFailure, 600);
    return { mode: 'webkit', preparedPlayback: Boolean(playRequest) };
  }

  if (typeof video.requestFullscreen === 'function') {
    try {
      const result = video.requestFullscreen();
      result?.catch?.(() => {});
      return { mode: 'standard', preparedPlayback: false };
    } catch { return { mode: 'unavailable', preparedPlayback: false }; }
  }

  return { mode: 'unavailable', preparedPlayback: false };
}
