/** Public facts only, shared by the static HTML and the visible signed-out view. */
export const DISCOVERY_CONTENT = {
  en: {
    title: 'FACt.Smack | Photo & Outfit Feedback',
    description: 'Get subjective photo, outfit and profile feedback from real people. Share photos or videos and collect YES/NO or perceived-age ratings on FACt.Smack.',
    heading: 'Photo and outfit feedback from real people',
    intro: 'FACt.Smack is a photo and video community. Share your everyday looks, outfits and profile photos with a question, receive subjective YES/NO or perceived-age feedback from other members, and view the collected results.',
    safety: 'Google sign-in is used to authenticate your account with your email and basic profile. FACt.Smack does not generate AI images or videos. Unlawful and non-consensual sexual content is prohibited.',
    faqHeading: 'Questions about FACt.Smack',
    faq: [
      ['How can I get feedback on a photo or outfit?', 'Sign in with Google or email, choose a category, and share a photo or video with your question. Other members can leave feedback.'],
      ['Are the ratings an objective assessment?', 'No. YES/NO choices and perceived-age estimates reflect individual opinions, not objective attractiveness, verified age or professional advice.'],
      ['Can I delete what I post?', 'Yes. You can delete your own posts and their attached media. Separate report and review records follow the retention rules in the Privacy Notice.'],
    ],
    policyLabels: ['Privacy', 'Terms', 'Safety & reports'],
  },
  ko: {
    title: 'FACt.Smack | 사진·코디·프로필 피드백',
    description: '사진·코디·프로필에 대한 실제 사람들의 주관적인 피드백을 받아보세요. FACt.Smack에서 사진·영상을 공유하고 호감·비호감 또는 예상 나이 평가를 모아 확인하세요.',
    heading: '사람들이 전하는 사진·코디·프로필 피드백',
    intro: 'FACt.Smack은 사진·영상 커뮤니티입니다. 오늘의 모습, 코디나 프로필 사진을 질문과 함께 공유하고, 다른 회원의 주관적인 호감·비호감 또는 예상 나이 평가를 모아 결과를 확인하세요.',
    safety: 'Google 로그인은 이메일과 기본 프로필로 계정을 인증하는 데 사용합니다. FACt.Smack은 AI 이미지·영상 생성 서비스가 아니며, 불법 콘텐츠와 동의 없는 성적 콘텐츠는 금지합니다.',
    faqHeading: 'FACt.Smack 자주 묻는 질문',
    faq: [
      ['사진이나 코디에 대한 피드백은 어떻게 받나요?', 'Google 또는 이메일로 로그인한 뒤 카테고리를 선택하고 질문과 사진·영상을 공유하세요. 다른 회원들이 피드백을 남길 수 있습니다.'],
      ['평가는 객관적인 판단인가요?', '아니요. 호감·비호감과 예상 나이는 참여자 개인의 의견이며, 객관적인 외모 판단·실제 나이 인증·전문적인 조언이 아닙니다.'],
      ['게시한 콘텐츠를 삭제할 수 있나요?', '네. 본인 게시물과 연결 미디어를 삭제할 수 있습니다. 별도 신고·검토 기록은 개인정보 처리방침의 보존 기준을 따릅니다.'],
    ],
    policyLabels: ['개인정보 처리방침', '이용약관', '안전·신고'],
  },
};
const escape = (v) => v.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
export function renderDiscoveryBody(locale) {
  const c = DISCOVERY_CONTENT[locale];
  const home = locale === 'ko' ? '/ko/' : '/';
  return `<main style="max-width:640px;margin:48px auto;padding:24px;font-family:Arial,sans-serif;line-height:1.7">
        <h1>${escape(c.heading)}</h1><p>${escape(c.intro)}</p><p>${escape(c.safety)}</p>
        <h2>${escape(c.faqHeading)}</h2>
        ${c.faq.map(([q, a]) => `<details><summary>${escape(q)}</summary><p>${escape(a)}</p></details>`).join('\n        ')}
        <p>${['privacy', 'terms', 'safety'].map((p, i) => `<a href="${home}?policy=${p}">${escape(c.policyLabels[i])}</a>`).join(' · ')}</p>
        <nav aria-label="Language"><a href="/" hreflang="en" lang="en">English</a> · <a href="/ko/" hreflang="ko" lang="ko">한국어</a></nav>
      </main>`;
}
