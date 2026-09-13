/** Keeps a just-published card visible in Shuffle until the member deliberately navigates away. */
export function resolveFeedCardIndex(cards, currentIndex, activeCategory, featuredPostId) {
  if (!cards?.length) return 0;
  if (activeCategory === 'ALL' && featuredPostId) {
    const featuredIndex = cards.findIndex((card) => card.id === featuredPostId);
    if (featuredIndex >= 0) return featuredIndex;
  }
  return ((currentIndex % cards.length) + cards.length) % cards.length;
}
