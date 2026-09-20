const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

/** Formats a trusted server UTC publication time without exposing an exact personal timestamp. */
export function formatRelativePublishedTime(publishedAt, locale = 'ko', now = Date.now()) {
  const timestamp = Date.parse(publishedAt ?? '');
  if (!Number.isFinite(timestamp)) return null;
  const elapsed = Math.max(0, now - timestamp);
  if (elapsed < MINUTE_MS) return locale === 'en' ? 'just now' : '방금 전';
  const [value, unit] = elapsed < HOUR_MS
    ? [Math.floor(elapsed / MINUTE_MS), 'minute']
    : elapsed < DAY_MS
      ? [Math.floor(elapsed / HOUR_MS), 'hour']
      : [Math.floor(elapsed / DAY_MS), 'day'];
  if (locale === 'en') return `${value} ${unit === 'minute' ? 'min' : unit === 'hour' ? 'hr' : 'day'}${unit === 'day' && value !== 1 ? 's' : ''} ago`;
  return `${value}${unit === 'minute' ? '분' : unit === 'hour' ? '시간' : '일'} 전`;
}
