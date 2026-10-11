/** Selects distinct account suggestions in the feed's server-provided relevance order. */
export function selectUniqueAccountRecommendations(cards, currentUserId, limit = 5) {
  const seen = new Set();
  const suggestions = [];
  for (const card of cards ?? []) {
    if (!card?.author || card.isMyUpload || (currentUserId && card.authorId === currentUserId)) continue;
    const identity = card.authorId ? `id:${card.authorId}` : `handle:${card.author.trim().toLowerCase()}`;
    if (seen.has(identity)) continue;
    seen.add(identity);
    suggestions.push(card);
    if (suggestions.length >= limit) break;
  }
  return suggestions;
}
