/** Shared category metadata. Published member posts are the only Feed data. */
export const categories = {
  PerceivedAge: { label: '몇 살로 보여?', globalLabel: 'How Old Do I Look?', internalId: 'PERCEIVED_AGE', evaluationType: 'NUMERIC_AGE', icon: 'face_3', color: '#FF0050', liveTag: 'Age Check', feedLabel: 'AGE CHECK' },
  Outfit: { label: '오늘의 룩', icon: 'checkroom', color: '#FF6B35', liveTag: 'OOTD', feedLabel: 'OOTD' },
  Date: { label: '데이트', icon: 'favorite', color: '#A855F7', liveTag: 'Date Look' },
  Fitness: { label: '운동', icon: 'fitness_center', color: '#22C55E', liveTag: 'Fitness Look' },
  Work: { label: '출근', icon: 'business_center', color: '#2563EB', liveTag: 'Work Look' },
  SocialProfile: { label: 'SNS 프로필', icon: 'account_circle', color: '#F59E0B', liveTag: 'Profile Look' },
};

// Fictitious profiles and photos are not production Feed content. An empty
// collection deliberately renders the first-use state in FeedView.
export const initialCards = [];
