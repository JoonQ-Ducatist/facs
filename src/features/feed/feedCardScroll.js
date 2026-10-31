/** Moves only the actual feed scroll owner, leaving document/canvas offsets alone. */
export function scrollFeedCardIntoView(card, { windowRef = window, gap = 8 } = {}) {
  if (!card) return false;
  let owner = card.parentElement;
  while (owner && !/^(auto|scroll)$/.test(windowRef.getComputedStyle(owner).overflowY)) owner = owner.parentElement;
  if (!owner || owner === card.ownerDocument?.body || owner === card.ownerDocument?.documentElement) return false;

  const bounds = owner.getBoundingClientRect();
  let visibleTop = bounds.top + (owner.clientTop || 0);
  const app = card.closest('.editorial-app');
  const header = app?.querySelector(':scope > header');
  if (header) visibleTop = Math.max(visibleTop, Math.min(bounds.bottom, header.getBoundingClientRect().bottom));
  const rail = owner.querySelector(':scope > .feed-category-rail');
  if (rail && windowRef.getComputedStyle(rail).position === 'sticky') {
    // Reserve the full rail height even when its sticky position has not yet
    // engaged. It will occupy this space at the end of the programmatic scroll.
    visibleTop += rail.getBoundingClientRect().height;
  }
  const requested = owner.scrollTop + card.getBoundingClientRect().top - visibleTop - gap;
  const top = Math.min(Math.max(0, requested), Math.max(0, owner.scrollHeight - owner.clientHeight));
  const reducedMotion = windowRef.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  owner.scrollTo({ top, behavior: reducedMotion ? 'auto' : 'smooth' });
  return true;
}
