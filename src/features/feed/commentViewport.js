export function syncCommentViewport(panel, viewport) {
  if (!panel || !viewport) return;
  panel.style.setProperty('--comment-viewport-top', `${viewport.offsetTop}px`);
  panel.style.setProperty('--comment-viewport-left', `${viewport.offsetLeft}px`);
  panel.style.setProperty('--comment-viewport-width', `${viewport.width}px`);
  panel.style.setProperty('--comment-viewport-height', `${viewport.height}px`);
}

export function bindCommentViewport(panel, browser = window) {
  const viewport = browser.visualViewport;
  if (!panel || !viewport) return () => {};
  const sync = () => syncCommentViewport(panel, viewport);
  sync();
  viewport.addEventListener('resize', sync);
  viewport.addEventListener('scroll', sync);
  browser.addEventListener('resize', sync);
  browser.addEventListener('scroll', sync);
  panel.addEventListener('focusin', sync);
  panel.addEventListener('focusout', sync);
  return () => {
    viewport.removeEventListener('resize', sync);
    viewport.removeEventListener('scroll', sync);
    browser.removeEventListener('resize', sync);
    browser.removeEventListener('scroll', sync);
    panel.removeEventListener('focusin', sync);
    panel.removeEventListener('focusout', sync);
  };
}
