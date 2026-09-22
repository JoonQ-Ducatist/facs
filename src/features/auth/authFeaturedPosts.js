/** Counts only completed evaluations, regardless of the evaluation format. */
export function authParticipationCount(card) {
  const explicitParticipation = Number(card?.participationCount);
  if (card?.participationCount != null && Number.isFinite(explicitParticipation)) return explicitParticipation;
  return card.evaluationType === 'NUMERIC_AGE'
    ? Number(card.ageVoteCount ?? 0)
    : Number(card.yesVotes ?? 0) + Number(card.noVotes ?? 0);
}

/**
 * Login imagery is drawn from real public posts. Keep the most popular group,
 * then rotate it in a fresh random order so one member's photo is not fixed.
 */
export function selectAuthFeaturedPosts(cards, random = Math.random) {
  const popular = [...(cards ?? [])]
    .filter((card) => card?.imageUrl)
    .sort((left, right) => authParticipationCount(right) - authParticipationCount(left));
  const candidates = popular.slice(0, 5);

  for (let index = candidates.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [candidates[index], candidates[swapIndex]] = [candidates[swapIndex], candidates[index]];
  }
  return candidates;
}
