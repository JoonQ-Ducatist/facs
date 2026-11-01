/** Temporary presentation switches. Keep stored posts, votes and consent unchanged.
 * Reopen upload options and the comparison feed together after product approval. */
export const OPTIONAL_UPLOAD_ENABLED = false;
export const COMPARISON_FEED_ENABLED = false;

export function isFeedPostAvailable(card) {
  return COMPARISON_FEED_ENABLED || card?.comparisonMode !== 'A_B';
}
