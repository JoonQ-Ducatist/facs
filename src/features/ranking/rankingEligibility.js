/**
 * 랭킹은 실제로 유효한 평가가 하나 이상 쌓인 게시물만 보여준다.
 * 사진 등록 자체는 피드와 프로필에서 확인할 수 있다.
 */
export function hasRankingVotes(card) {
  if (card.evaluationType === 'NUMERIC_AGE') {
    return Number(card.ageVoteCount ?? 0) > 0;
  }

  return Number(card.yesVotes ?? 0) + Number(card.noVotes ?? 0) > 0;
}
