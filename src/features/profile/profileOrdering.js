/**
 * Orders the member's own posts by server publication time without mutating
 * the feed collection. Missing timestamps fall back to a deterministic ID
 * order so partially hydrated cards remain stable.
 */
export function sortPostsNewestFirst(posts = []) {
  return [...posts].sort((left, right) => {
    const rightTime = parsePostTime(right);
    const leftTime = parsePostTime(left);
    if (rightTime !== leftTime) return rightTime - leftTime;
    return String(right?.id ?? '').localeCompare(String(left?.id ?? ''));
  });
}

function parsePostTime(post) {
  const timestamp = Date.parse(post?.publishedAt ?? '');
  return Number.isFinite(timestamp) ? timestamp : 0;
}
