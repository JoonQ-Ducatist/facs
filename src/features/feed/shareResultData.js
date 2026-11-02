const validCount = value => Number.isSafeInteger(value) && value >= 0;

/** Only actual card aggregates are displayed; missing data is never a score. */
export function shareResultData(card, canViewResults = false) {
  const age = card?.evaluationType === 'NUMERIC_AGE';
  const countsValid = age ? validCount(card?.ageVoteCount) : validCount(card?.yesVotes) && validCount(card?.noVotes);
  const total = countsValid ? (age ? card.ageVoteCount : card.yesVotes + card.noVotes) : null;
  if (total === null || (total === 0 && card.participationCount === null)) return { status: 'unavailable', total: null };
  if (total === 0) return { status: 'empty', total };
  if (!canViewResults) return { status: 'hidden', total };
  if (age) return Number.isFinite(card.ageEstimate) && card.ageEstimate > 0
    ? { status: 'ready', total, averageAge: card.ageEstimate }
    : { status: 'unavailable', total };
  const yesPercent = Math.round(card.yesVotes / total * 100);
  return { status: 'ready', total, yesPercent, noPercent: 100 - yesPercent };
}
