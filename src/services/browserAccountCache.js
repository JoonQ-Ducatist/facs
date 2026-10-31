/** Remove the signed-out member's convenience state and the legacy shared sample-scrap cache. */
export function clearSignedOutMemberCaches(memberId, browser = globalThis.window) {
  if (!memberId || !browser) return;

  try {
    const storage = browser.localStorage;
    const exactKeys = [
      `facs_voted_posts_${memberId}`,
      `facs_rating_days_v1:${memberId}`,
      `facs_local_follow_targets:${memberId}`,
      `facs_blocked_members:${memberId}`,
      'facs_local_scrap_post_ids',
    ];
    for (const key of exactKeys) storage.removeItem(key);

    const reactionPrefix = `facs_live_reaction_seen_v1:${memberId}:`;
    const reactionKeys = [];
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (key?.startsWith(reactionPrefix)) reactionKeys.push(key);
    }
    for (const key of reactionKeys) storage.removeItem(key);
  } catch { /* Browser storage can be unavailable; sign-out must still succeed. */ }

  try { browser.sessionStorage.removeItem(`facs_rating_visit_v1:${memberId}`); } catch {}
  try { browser.sessionStorage.removeItem(`facs_boost_candidates_v1:${memberId}`); }
  catch { /* Browser storage can be unavailable. */ }
}
