export function defaultQuestion(locale, evaluationType, comparisonMode) {
  const en = locale === 'en';
  if (comparisonMode === 'A_B') return en ? 'Which photo do you prefer: A or B?' : 'A와 B 중 어떤 사진이 더 좋은가요?';
  if (evaluationType === 'NUMERIC_AGE') return en ? 'How old do I look?' : '사람들은 저를 몇 살로 볼까요?';
  return en ? 'Does this photo make a good impression?' : '호감과 신뢰감을 평가해 주세요.';
}
