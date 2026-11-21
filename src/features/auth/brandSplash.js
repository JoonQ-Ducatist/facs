export const BRAND_SPLASH_DURATION_MS = 2500;

export const brandTaglines = [
  {ko: '사진 한 장, 새로운 시선.', en: 'One photo. A fresh perspective.'},
  {ko: '내 느낌대로, 부담 없이 한 표.', en: 'One opinion. No right answer.'},
  {ko: '사진 선택에 다른 시선을 더해요.', en: 'A fresh perspective on your photo.'},
  {ko: '평가 한 번으로 시작해 보세요.', en: 'Start with one rating.'},
  {ko: '다른 사람의 사진 선택을 도와주세요.', en: 'Help someone choose their photo.'},
  {ko: '내 사진도 다른 시선으로 만나보세요.', en: 'See your photo through other eyes.'},
  {ko: '사진은 원할 때 올리면 돼요.', en: 'Share a photo when you are ready.'},
  {ko: '오늘의 사진에 의견을 더해요.', en: 'Add your perspective to a photo.'},
  {ko: '한 장부터 천천히 살펴보세요.', en: 'Take it one photo at a time.'},
  {ko: '함께 보고, 내 느낌을 나눠요.', en: 'Take a look. Share your perspective.'},
];

/** Select once per app entry so locale changes never reshuffle the splash message. */
export function selectBrandTagline(random = Math.random) {
  return brandTaglines[Math.floor(random() * brandTaglines.length)] ?? brandTaglines[0];
}
