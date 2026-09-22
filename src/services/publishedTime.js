/** Formats a server publication timestamp without trusting the device clock for storage. */
export function formatPublishedTime(publishedAt, { locale = 'ko', now = Date.now() } = {}) {
  const timestamp = Date.parse(publishedAt ?? '');
  if (!Number.isFinite(timestamp)) return '';
  const elapsedMs = Math.max(0, now - timestamp);
  const elapsedMinutes = Math.floor(elapsedMs / 60_000);
  if (elapsedMinutes < 1) return locale === 'en' ? 'just now' : '방금 전';
  if (elapsedMinutes < 60) return locale === 'en' ? `${elapsedMinutes}m ago` : `${elapsedMinutes}분 전`;
  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) return locale === 'en' ? `${elapsedHours}h ago` : `${elapsedHours}시간 전`;
  const elapsedDays = Math.floor(elapsedHours / 24);
  if (elapsedDays < 7) return locale === 'en' ? `${elapsedDays}d ago` : `${elapsedDays}일 전`;
  return new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'ko-KR', { month: 'short', day: 'numeric' }).format(timestamp);
}
