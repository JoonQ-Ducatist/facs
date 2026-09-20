export const BRAND_SPLASH_DURATION_MS = 2500;

export const brandTaglines = [
  { ko: '아직도 좋아요에 의미 둬?', en: 'The Age of Likes Is Over.' },
  { ko: '좋아요야 쉽지. 진실은 좀 다르고.', en: 'Likes Are Easy. Truth Isn’t.' },
  { ko: '언제까지 좋아요 뒤에 숨을래?', en: 'Stop Hiding Behind Likes.' },
  { ko: '좋아요는 충분히 받았잖아. 이제 진짜를 봐.', en: 'You’ve Had Enough Likes.' },
  { ko: '좋아요 몇 개에 또 속았어?', en: 'Don’t Be Fooled by Likes.' },
  { ko: '좋아요? 그냥 네가 듣고 싶은 말이잖아.', en: 'Likes Tell You What You Want to Hear.' },
  { ko: '좋아요는 됐고. 진실은 감당할 수 있겠어?', en: 'Enough Likes. Face the Truth.' },
  { ko: '칭찬 들으러 왔어? 번지수 잘못 찾았어.', en: 'Here for Compliments? Wrong Place.' },
  { ko: '듣고 싶은 말? 여긴 그런 거 없어.', en: 'Not What You Want to Hear.' },
  { ko: '좋아요 받고 싶어? 그럼 다른 데 가봐.', en: 'Want Likes? Go Somewhere Else.' },
];

/** Select once per app entry so locale changes never reshuffle the splash message. */
export function selectBrandTagline(random = Math.random) {
  return brandTaglines[Math.floor(random() * brandTaglines.length)] ?? brandTaglines[0];
}
