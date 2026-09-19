/** 정의: 화면 목업에서 사용하는 카테고리 토큰과 카드 샘플 데이터의 단일 출처다. */
const selfieAssets = import.meta.glob('../../assets/generated/selfies/*.jpg', { eager: true, import: 'default' });
const seriesAssets = import.meta.glob('../../assets/generated/feed-series/*.jpg', { eager: true, import: 'default' });
const perceivedAgeAssets = import.meta.glob('../../assets/generated/perceived-age/*.jpg', { eager: true, import: 'default' });

/** 정의: 세트·합성 이미지를 배제하고 카드마다 한 명의 단독 인물만 쓰는 대표 사진 인덱스다. */
const categorySelfieIndex = { Outfit: 1, Date: 3, Fitness: 1, Work: 5, SocialProfile: 6 };

/** 정의: 거울 앞 스마트폰 셀피와 여성 운동 셀피의 프로젝트 자산 URL을 반환한다. @param {number} index 1~6 사진 순번 @param {boolean} fitness 여성 운동 셀피 여부 */
function getSelfieImage(index, fitness = false) {
  const safeIndex = String(((index - 1) % 6) + 1).padStart(2, '0');
  const prefix = fitness ? 'fitness-selfie' : 'selfie';
  return selfieAssets[`../../assets/generated/selfies/${prefix}-${safeIndex}.jpg`];
}

/** 정의: 동일 인물의 복장·포즈·장소가 달라진 단독 세로 셀피 시리즈 URL을 반환한다. @param {string} name 시리즈 파일명 */
function getSeriesImage(name) { return seriesAssets[`../../assets/generated/feed-series/${name}.jpg`]; }

/** 정의: PERCEIVED_AGE 카드에만 쓰는 단독 인물·서울 생활권 셀피 자산 URL을 반환한다. @param {string} name 파일명 */
function getPerceivedAgeImage(name) { return perceivedAgeAssets[`../../assets/generated/perceived-age/${name}.jpg`]; }

/** 정의: 사용자·관리 화면이 공유하는 카테고리의 표시명, 아이콘, 색상과 피드 표기 토큰이다. */
export const categories = {
  PerceivedAge: { label: '몇 살로 보여?', globalLabel: 'How Old Do I Look?', internalId: 'PERCEIVED_AGE', evaluationType: 'NUMERIC_AGE', icon: 'face_3', color: '#FF0050', liveTag: 'Age Check', feedLabel: 'AGE CHECK' },
  Outfit: { label: '오늘의 룩', icon: 'checkroom', color: '#FF6B35', liveTag: 'OOTD', feedLabel: 'OOTD' },
  Date: { label: '데이트', icon: 'favorite', color: '#A855F7', liveTag: 'Date Look' },
  Fitness: { label: '운동', icon: 'fitness_center', color: '#22C55E', liveTag: 'Fitness Look' },
  Work: { label: '출근', icon: 'business_center', color: '#2563EB', liveTag: 'Work Look' },
  SocialProfile: { label: 'SNS 프로필', icon: 'account_circle', color: '#F59E0B', liveTag: 'Profile Look' },
};

/** 정의: 다중 사진 카드에 동일 인물의 서로 다른 단독 셀피만 순서대로 담는다. @param {string} prefix 카드 ID 접두어 @param {string[]} imageUrls 단독 인물 사진 URL 목록 */
function createAlbum(prefix, imageUrls) {
  return imageUrls.map((url, index) => ({
    id: `${prefix}-media-${index + 1}`,
    type: 'image',
    url,
    objectPosition: 'center center',
  }));
}

/** 정의: 카테고리마다 1~5장의 서로 다른 단독 인물 셀피를 제공하는 피드용 미디어 시리즈다. */
const mediaByCategory = {
  Outfit: [getSelfieImage(1), getSeriesImage('outfit-02'), getSeriesImage('outfit-03'), getSeriesImage('outfit-04'), getSeriesImage('outfit-05')],
  Date: [getSelfieImage(3), getSeriesImage('date-02'), getSeriesImage('date-03'), getSeriesImage('date-04')],
  Fitness: [getSelfieImage(1, true), getSeriesImage('fitness-02')],
  Work: [getSelfieImage(5)],
  SocialProfile: [getSelfieImage(6)],
};

/** 정의: 연령 평가 카드는 사람별로만 묶어 1장·2장·3장의 독립 사진을 제공한다. */
const perceivedAgeAlbums = {
  pool: [getPerceivedAgeImage('age-pool-01')],
  bike: [getPerceivedAgeImage('age-bike-01'), getPerceivedAgeImage('age-bike-02')],
  office: [getPerceivedAgeImage('age-office-01'), getPerceivedAgeImage('age-office-02'), getPerceivedAgeImage('age-office-03')],
};

/** 정의: 카테고리별로 생성한 서울 생활권 사진과 대표 질문을 정의한 목업 시드다. */
const mockCardSeeds = [
  { category: 'Outfit', author: 'today_sora', question: '오늘 이 스타일,\n괜찮아 보여요?', subtext: '오늘의 스타일을 평가해 주세요.', imageUrl: getSelfieImage(categorySelfieIndex.Outfit), yesVotes: 1280, noVotes: 210, comments: [{ id: 'c1', author: 'style_lab', body: '서울 거리의 자연광과 룩이 잘 어울려요.', createdAt: '8분 전', replies: [{ id: 'r1', author: 'today_sora', body: '의견 감사합니다!', createdAt: '6분 전' }] }] },
  { category: 'PerceivedAge', evaluationType: 'NUMERIC_AGE', author: 'pool_jiyeon', question: '사람들은 저를\n몇 살로 볼까요?', subtext: '사진을 보고 예상 나이를 평가해 주세요.', imageUrls: perceivedAgeAlbums.pool, ageMin: 25, ageMax: 42, ageEstimate: 32.4, ageVoteCount: 28, comments: [{ id: 'age-c1', author: 'summer_note', body: '수영장에서도 생기 있어 보여요.', createdAt: '9분 전', replies: [] }] },
  { category: 'PerceivedAge', evaluationType: 'NUMERIC_AGE', author: 'cycle_mina', question: '자전거 라이딩 후의 저는\n몇 살로 보여요?', subtext: '활동적인 분위기를 평가해 주세요.', imageUrls: perceivedAgeAlbums.bike, ageMin: 26, ageMax: 44, ageEstimate: 34.1, ageVoteCount: 41, comments: [{ id: 'age-c2', author: 'ride_seoul', body: '건강하고 밝은 에너지가 느껴져요.', createdAt: '14분 전', replies: [] }] },
  { category: 'PerceivedAge', evaluationType: 'NUMERIC_AGE', author: 'career_yuna', question: '일하다 잠깐 찍은 이 사진,\n몇 살로 보여요?', subtext: '일하는 모습의 분위기를 평가해 주세요.', imageUrls: perceivedAgeAlbums.office, ageMin: 27, ageMax: 46, ageEstimate: 33.2, ageVoteCount: 53, comments: [{ id: 'age-c3', author: 'office_days', body: '차분하고 자신감 있는 분위기예요.', createdAt: '18분 전', replies: [] }] },
  { category: 'Date', author: 'date_mood', question: '첫 만남이라면\n호감이 가나요?', subtext: '첫 만남에서 느껴지는 인상이에요.', imageUrl: getSelfieImage(categorySelfieIndex.Date), yesVotes: 942, noVotes: 88, comments: [{ id: 'c2', author: 'facs_kr', body: '밝고 다정한 인상이 느껴져요.', createdAt: '12분 전', replies: [] }] },
  { category: 'Fitness', author: 'fit_queen', question: '건강하고 매력적인 인상을\n주나요?', subtext: '건강하고 자신감 있는 모습으로 보이나요?', imageUrl: getSelfieImage(categorySelfieIndex.Fitness, true), yesVotes: 1105, noVotes: 95, comments: [{ id: 'c4', author: 'run_more', body: '활동적인 에너지가 잘 보여요.', createdAt: '1시간 전', replies: [] }] },
  { category: 'Work', author: 'workday_note', question: '직장에서 좋은 평가를\n받을 것 같나요?', subtext: '직장에서의 모습을 평가해 주세요.', imageUrl: getSelfieImage(categorySelfieIndex.Work), yesVotes: 1430, noVotes: 190, comments: [{ id: 'c5', author: 'team_player', body: '차분하고 믿음직한 분위기입니다.', createdAt: '45분 전', replies: [] }] },
  { category: 'SocialProfile', author: 'portrait_note', question: '이 사진, SNS 프로필로\n매력적으로 보이나요?', subtext: '프로필 사진을 평가해 주세요.', imageUrl: getSelfieImage(categorySelfieIndex.SocialProfile), yesVotes: 654, noVotes: 72, comments: [] },
];

/** 정의: 카테고리별 1~5장의 현실적인 단독 인물 미디어 수를 가진 초기 목업 피드다. */
const legacyCards = mockCardSeeds.map((seed, seedIndex) => {
  const mediaUrls = seed.imageUrls ?? mediaByCategory[seed.category];
  return { ...seed, id: `card-${seedIndex + 1}`, imageUrl: mediaUrls[0], media: createAlbum(`card-${seedIndex + 1}`, mediaUrls), objectPosition: 'center center', timestamp: `${seedIndex * 20 + 10}분 전`, isMyUpload: seedIndex === 0, commentsAllowed: true };
});

/** 정의: 카드별 사진을 한 번만 배정하는 전체 자산 레지스트리다. 같은 사진을 다른 사용자의 카드에 재사용하지 않는다. */
const sampleAssets = import.meta.glob('../../assets/**/*.{jpg,png}', { eager: true, import: 'default' });
function samplePhoto(path) {
  const url = sampleAssets[`../../assets/${path}`];
  if (!url) throw new Error(`Missing sample photo: ${path}`);
  return url;
}

const sampleCopy = {
  PerceivedAge: ['사람들은 저를\n몇 살로 볼까요?', '사진을 보고 예상 나이를 평가해 주세요.'],
  Outfit: ['오늘 이 스타일,\n괜찮아 보여요?', '오늘의 스타일을 평가해 주세요.'],
  Date: ['첫 만남이라면\n호감이 가나요?', '첫 만남에서 느껴지는 인상이에요.'],
  Fitness: ['건강하고 매력적인 인상을\n주나요?', '건강하고 자신감 있는 모습으로 보이나요?'],
  Work: ['직장에서 좋은 평가를\n받을 것 같나요?', '직장에서의 모습을 평가해 주세요.'],
  SocialProfile: ['이 사진, SNS 프로필로\n매력적으로 보이나요?', '프로필 사진을 평가해 주세요.'],
};

/** 정의: MVP 6개 카테고리마다 다른 사용자의 카드 5개를 제공한다. 서비스 전체에서 1·2·3·4·5장 피드 규칙을 모두 검증한다. */
const sampleSeeds = [
  s('PerceivedAge', 'pool_jiyeon', ['generated/perceived-age/age-pool-01.jpg'], 32.4, 28), s('PerceivedAge', 'pool_suah', ['generated/perceived-age/age-pool-02.png'], 34.2, 34), s('PerceivedAge', 'cycle_mina', ['generated/perceived-age/age-bike-01.jpg'], 34.1, 41), s('PerceivedAge', 'bike_haru', ['generated/perceived-age/age-bike-02.jpg'], 30.6, 37), s('PerceivedAge', 'career_yuna', ['generated/perceived-age/age-office-01.jpg', 'generated/perceived-age/age-office-02.jpg', 'generated/perceived-age/age-office-03.jpg', 'generated/selfies/selfie-02.jpg', 'generated/selfies/selfie-03.jpg'], 33.2, 53),
  s('Outfit', 'today_sora', ['generated/feed-series/outfit-02.jpg'], 86, 1490), s('Outfit', 'daily_min', ['generated/feed-series/outfit-03.jpg'], 88, 1088), s('Outfit', 'closet_yuri', ['generated/feed-series/outfit-04.jpg'], 89, 836), s('Outfit', 'look_mate', ['generated/feed-series/outfit-05.jpg'], 88, 1269), s('Outfit', 'mood_jin', ['generated/mock-outfit-seoul.jpg', 'generated/outfit-06.png', 'generated/selfies/selfie-01.jpg', 'generated/selfies/selfie-04.jpg'], 89, 985),
  s('Date', 'date_mood', ['generated/date-05.png'], 91, 1030), s('Date', 'first_hello', ['generated/feed-series/date-02.jpg'], 89, 930), s('Date', 'warm_smile', ['generated/feed-series/date-03.jpg'], 88, 1149), s('Date', 'weekend_look', ['generated/feed-series/date-04.jpg'], 87, 796), s('Date', 'cafe_evening', ['generated/mock-date-seoul.jpg', 'images/card2_dating.png', 'generated/selfies/selfie-05.jpg'], 89, 1025),
  s('Fitness', 'fit_queen', ['generated/feed-series/fitness-02.jpg'], 92, 1200), s('Fitness', 'pilates_sun', ['generated/fitness-03.png'], 91, 1088), s('Fitness', 'morning_run', ['generated/mock-fitness-seoul.jpg'], 91, 920), s('Fitness', 'strong_jiyu', ['generated/selfies/fitness-selfie-01.jpg'], 90, 1011), s('Fitness', 'move_daily', ['images/card4_workout.png'], 90, 853),
  s('Work', 'workday_note', ['generated/mock-work-seoul.jpg'], 88, 1620), s('Work', 'office_mina', ['generated/work-04.png'], 89, 1365), s('Work', 'business_ji', ['images/card1_business.jpg'], 89, 1116), s('Work', 'meeting_mood', ['images/card3_office.png'], 88, 957), s('Work', 'calm_monday', ['generated/selfies/fitness-selfie-05.jpg'], 90, 881),
  s('SocialProfile', 'portrait_note', ['generated/mock-social-profile-seoul.jpg'], 90, 726), s('SocialProfile', 'profile_jane', ['generated/profile-02.png'], 90, 984), s('SocialProfile', 'smile_pick', ['generated/selfies/fitness-selfie-02.jpg'], 90, 794), s('SocialProfile', 'frame_mood', ['generated/selfies/fitness-selfie-03.jpg'], 90, 894), s('SocialProfile', 'face_value', ['generated/selfies/fitness-selfie-04.jpg'], 90, 964),
];
function s(category, author, paths, score, total) { return { category, author, paths, score, total }; }

export const initialCards = sampleSeeds.map((seed, index) => {
  const id = `card-${index + 1}`;
  const media = seed.paths.map((path, mediaIndex) => ({ id: `${id}-media-${mediaIndex + 1}`, type: 'image', url: samplePhoto(path), objectPosition: 'center center' }));
  const isAge = seed.category === 'PerceivedAge';
  const [question, subtext] = sampleCopy[seed.category];
  const yesVotes = isAge ? 0 : Math.round(seed.total * seed.score / 100);
  return { id, category: seed.category, evaluationType: isAge ? 'NUMERIC_AGE' : 'BINARY', author: seed.author, question, subtext, imageUrl: media[0].url, media, objectPosition: 'center center', timestamp: `${index * 7 + 3}분 전`, isMyUpload: index === 5, commentsAllowed: true, comments: index % 3 === 0 ? [{ id: `${id}-comment`, author: 'first_view', body: '자연스럽고 좋아 보여요.', createdAt: '방금 전', replies: [] }] : [], ...(isAge ? { ageMin: 24, ageMax: 46, ageEstimate: seed.score, ageVoteCount: seed.total } : { yesVotes, noVotes: seed.total - yesVotes }) };
});
