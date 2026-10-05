export function resolveFeedGestureAxis(deltaX, deltaY, threshold = 6) {
  if (Math.max(Math.abs(deltaX), Math.abs(deltaY)) < threshold) return null;
  return Math.abs(deltaX) > Math.abs(deltaY) ? 'x' : 'y';
}

export function resolveFeedDragPosition(startScrollTop, deltaY, maxScroll) {
  const requested = startScrollTop - deltaY;
  return Math.min(maxScroll, Math.max(0, requested));
}
