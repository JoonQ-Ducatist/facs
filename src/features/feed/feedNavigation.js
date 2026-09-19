/** Returns -1/0/1 for a completed touch gesture. A card without an inner
 * scroll range changes feed on the first vertical swipe. A scrollable card
 * changes feed only when the gesture starts at the matching boundary. */
export function resolveTouchFeedDirection({ startX, startY, endX, endY, scrollTop = 0, maxScrollTop = 0, threshold = 42 }) {
  const deltaX = endX - startX;
  const deltaY = endY - startY;
  if (Math.abs(deltaY) < threshold || Math.abs(deltaX) >= Math.abs(deltaY)) return 0;
  if (maxScrollTop <= 2) return deltaY < 0 ? 1 : -1;
  if (deltaY < 0 && scrollTop >= maxScrollTop - 2) return 1;
  if (deltaY > 0 && scrollTop <= 2) return -1;
  return 0;
}

/** Returns -1/0/1 for a desktop wheel event while preserving the current
 * card's own scroll range. */
export function resolveWheelFeedDirection({ deltaY, scrollTop = 0, scrollHeight = 0, clientHeight = 0, threshold = 12 }) {
  if (Math.abs(deltaY) < threshold) return 0;
  const maxScrollTop = Math.max(0, scrollHeight - clientHeight);
  if (deltaY > 0 && scrollTop < maxScrollTop - 2) return 0;
  if (deltaY < 0 && scrollTop > 2) return 0;
  return deltaY > 0 ? 1 : -1;
}
