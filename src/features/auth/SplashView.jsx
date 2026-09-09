import { useEffect, useMemo, useState } from 'react';
import logoUrl from '../../assets/facs-snake-logo.png';

/** 정의: 방문마다 무작위로 보여 주는 한·영 가입 유도 문구 목록이다. */
const splashCopies = [
  { title: <>오늘 내 모습,<br />어떻게 보여요?</>, english: 'How do I look today?' },
  { title: <>이 룩, 오늘의 나를<br />더 빛나게 할까요?</>, english: 'Will this look make you shine today?' },
  { title: <>새로 산 이 옷,<br />나랑 잘 어울릴까?</>, english: 'Does this new outfit feel like you?' },
  { title: <>오늘의 분위기,<br />내가 원하는 느낌일까?</>, english: 'Is today’s vibe exactly what you wanted?' },
  { title: <>나답게 예쁜 날,<br />지금 시작해요.</>, english: 'Start a day that feels beautifully you.' },
  { title: <>거울 앞 3초,<br />오늘은 자신감 있게.</>, english: 'Three seconds in the mirror, then step out with confidence.' },
];

/** 정의: 비로그인 방문자에게 인기 콘텐츠와 인증 진입점을 보여 주는 전체 화면 스플래시다. */
export default function SplashView({ cards, locale = 'ko', onLocaleChange, onPreview, onEmailAuth, onOAuthAuth }) {
  const popularCards = useMemo(
    () => [...cards].sort((a, b) => participationCount(b) - participationCount(a)).slice(0, 5),
    [cards],
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const [copy] = useState(() => splashCopies[Math.floor(Math.random() * splashCopies.length)]);
  const [emailOpen, setEmailOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [selectedProvider, setSelectedProvider] = useState('email');
  const [emailSent, setEmailSent] = useState(false);
  const [isEmailSending, setIsEmailSending] = useState(false);
  const [emailNotice, setEmailNotice] = useState('');
  const [emailNoticeTone, setEmailNoticeTone] = useState('success');
  const [providerNotice, setProviderNotice] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  async function selectProvider(provider) {
    setSelectedProvider(provider);
    setProviderNotice('');
    if (provider === 'email') {
      setEmailOpen(true);
      return;
    }
    const started = await onOAuthAuth(provider, rememberMe);
    if (!started) setProviderNotice(locale === 'en' ? 'This sign-in method is not available yet. Please choose another option.' : '이 로그인 방식은 아직 사용할 수 없습니다. 다른 방법을 선택해 주세요.');
  }

  async function submitEmail(event) {
    event.preventDefault();
    if (isEmailSending || emailSent) return;
    setIsEmailSending(true);
    setEmailNotice('');
    const sent = await onEmailAuth(email.trim(), rememberMe);
    setIsEmailSending(false);
    setEmailSent(sent);
    setEmailNoticeTone(sent ? 'success' : 'error');
    setEmailNotice(sent
      ? (locale === 'en' ? 'Link sent. Check your inbox.' : '링크를 보냈어요. 받은편지함을 확인해 주세요.')
      : (locale === 'en' ? 'Could not send the link. Try again.' : '링크를 보내지 못했어요. 다시 시도해 주세요.'));
    window.setTimeout(() => setEmailNotice(''), 2200);
  }

  useEffect(() => {
    if (popularCards.length < 2) return undefined;
    const timer = window.setInterval(() => setActiveIndex((index) => (index + 1) % popularCards.length), 3600);
    return () => window.clearInterval(timer);
  }, [popularCards.length]);

  const activeCard = popularCards[activeIndex] ?? cards[0];

  return (
    <main className="splash-screen relative mx-auto h-full max-w-none overflow-hidden bg-[#051424] text-white shadow-2xl">
      <div className="absolute inset-0" aria-hidden="true">
        <img key={activeCard.id} className="splash-media h-full w-full object-cover" style={{ objectPosition: activeCard.objectPosition }} src={activeCard.imageUrl} alt="" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(14,28,45,0.62)_0%,rgba(14,28,45,0.08)_35%,rgba(14,28,45,0.9)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_10%,rgba(197,160,89,0.18),transparent_30%),radial-gradient(circle_at_84%_30%,rgba(255,255,255,0.1),transparent_26%)]" />
      </div>

      <div className="relative z-10 flex h-full flex-col px-5 pb-6 pt-10">
        <button type="button" className="splash-language-toggle" onClick={() => onLocaleChange(locale === 'ko' ? 'en' : 'ko')} aria-label={locale === 'ko' ? '영어로 보기' : 'View in Korean'} title={locale === 'ko' ? 'English' : '한국어'}>{locale === 'ko' ? 'EN' : '한글'}</button>
        <header className="flex flex-col items-center text-center">
          <button type="button" onClick={onPreview} className="group flex flex-col items-center rounded-xl px-3 py-1 outline-none focus-visible:ring-2 focus-visible:ring-[#ecd8a8]" aria-label={locale === 'en' ? 'Open feed preview without signing in' : '로그인 없이 피드 미리보기 열기'} title={locale === 'en' ? 'Open feed preview' : '피드 미리보기 열기'}>
            <img src={logoUrl} width="96" height="64" className="h-16 w-24 object-contain drop-shadow-[0_3px_12px_rgba(0,0,0,0.5)] transition-transform duration-200 group-hover:scale-105" alt="FACt.Smack 뱀 로고" />
            <p lang="en" className="mt-1 font-latin text-[25px] font-extrabold leading-none tracking-tight"><span className="brand-wordmark__facs">FAC</span>t.<span className="brand-wordmark__facs">S</span>mack</p>
          </button>
          <div className="mt-2 flex items-center gap-2">
            <span className="h-px w-5 bg-[#c5a059]/70" />
            <p lang="en" className="font-mono text-[9px] font-bold tracking-[0.22em] text-[#ecd8a8]">MORE VIEWS, MORE YOU</p>
            <span className="h-px w-5 bg-[#c5a059]/70" />
          </div>
        </header>

        <div className="flex-1" />

        <section className="mb-4 text-center drop-shadow-md" aria-live="polite">
          <p className="font-mono text-[10px] font-bold tracking-[0.2em] text-[#ecd8a8]">TODAY&apos;S LOOK CHECK</p>
          <h1 className="mt-2 font-headline text-[28px] font-extrabold leading-tight tracking-tight text-white">{locale === 'en' ? copy.english : copy.title}</h1>
          {locale !== 'en' && <p className="mt-2 text-xs text-white/75">{copy.english}</p>}
        </section>

        <section className="mx-auto w-[86%] max-w-[330px] rounded-2xl border border-white/10 bg-white/[0.025] p-3 shadow-[0_14px_38px_rgba(0,0,0,0.08)] backdrop-blur-[1px]">
          <p className="mb-3 text-center text-[11px] leading-relaxed text-white/75">
            {locale === 'en' ? 'Join to see yourself through more views.' : <>가입하고 오늘의 내 모습을 확인해 보세요.<span className="block text-white/55">Join to see yourself through more views.</span></>}
          </p>
          <div className="relative flex flex-col gap-2">
            <ProviderButton compact={selectedProvider !== 'google'} selected={selectedProvider === 'google'} label={locale === 'en' ? 'Continue with Google' : 'Google로 계속하기'} icon="G" onClick={() => selectProvider('google')} />
            <ProviderButton compact={selectedProvider !== 'kakao'} selected={selectedProvider === 'kakao'} label={locale === 'en' ? 'Continue with Kakao' : '카카오로 계속하기'} icon="chat_bubble" onClick={() => selectProvider('kakao')} />
            {selectedProvider === 'email' && emailOpen ? <form className="relative mx-auto flex w-[92%] flex-wrap gap-1.5 rounded-xl border border-[#ecd8a8]/70 bg-white/[0.14] p-2.5 shadow-inner" onSubmit={submitEmail} aria-busy={isEmailSending}>
              <input required disabled={emailSent || isEmailSending} type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder={locale === 'en' ? 'you@example.com' : '이메일 주소'} className="h-9 min-w-0 flex-1 rounded-full border border-[#ecd8a8]/85 bg-black/15 px-3 text-xs text-white placeholder:text-white/45 outline-none focus:border-[#de3c65] disabled:cursor-not-allowed disabled:opacity-55" />
              <button type="submit" disabled={emailSent || isEmailSending} className="flex h-8 shrink-0 items-center justify-center rounded-full bg-[#c52a52] px-3 text-xs font-extrabold text-white transition duration-150 hover:bg-[#de3c65] active:scale-95 active:bg-[#9f1f41] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ecd8a8] disabled:cursor-not-allowed disabled:opacity-55">
                {isEmailSending && <span className="material-symbols-outlined mr-1 animate-spin text-[14px]" aria-hidden="true">progress_activity</span>}
                {isEmailSending ? (locale === 'en' ? 'Sending...' : '보내는 중...') : (locale === 'en' ? 'Send sign-in email' : '인증 메일 보내기')}
              </button>
              {emailSent && <button type="button" onClick={() => { setEmailSent(false); setEmailNotice(''); }} className="w-full text-center text-[10px] font-semibold text-white/80 underline underline-offset-2">{locale === 'en' ? 'Use another email address' : '다시 입력하기'}</button>}
              {emailNotice && <p role={emailNoticeTone === 'error' ? 'alert' : 'status'} className={`pointer-events-none absolute bottom-[calc(100%+8px)] left-1/2 z-20 w-max max-w-[94%] -translate-x-1/2 rounded-lg border px-3 py-1.5 text-center text-[10px] font-semibold text-white shadow-lg after:absolute after:left-1/2 after:top-full after:-translate-x-1/2 after:border-x-[5px] after:border-t-[5px] after:border-x-transparent ${emailNoticeTone === 'success' ? 'border-[#22C55E]/60 bg-[#0b2a17]/95 after:border-t-[#0b2a17]/95' : 'border-[#ff8aa5]/60 bg-[#4a1020]/95 after:border-t-[#4a1020]/95'}`}>{emailNotice}</p>}
            </form> : <ProviderButton compact={selectedProvider !== 'email'} selected={selectedProvider === 'email'} label={locale === 'en' ? 'Continue with email' : '이메일로 계속하기'} icon="mail" onClick={() => selectProvider('email')} />}
          </div>
          <label className="mt-3 flex cursor-pointer items-start justify-center gap-1.5 text-center text-[9px] leading-relaxed text-white/60">
            <input type="checkbox" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} className="mt-px h-3 w-3 shrink-0 accent-[#c52a52]" />
            <span>{locale === 'en' ? 'Keep me signed in. Do not use this on a shared device.' : '로그인 상태 유지 · 공용 기기에서는 선택하지 마세요.'}</span>
          </label>
          {providerNotice && <p role="alert" className="mt-2 rounded-lg border border-[#ff8aa5]/45 bg-[#4a1020]/75 px-2.5 py-1.5 text-center text-[10px] font-semibold leading-relaxed text-white">{providerNotice}</p>}
          <p className="mt-3 text-center text-[9px] leading-relaxed text-white/45">{locale === 'en' ? 'By continuing, you agree to our Terms and Privacy Policy.' : '계속하면 이용약관 및 개인정보 처리방침에 동의하게 됩니다.'}</p>
        </section>
      </div>
    </main>
  );
}

/** 정의: 평가 방식이 달라도 스플래시 인기 콘텐츠를 일관되게 정렬하는 참여 수 계산기다. */
function participationCount(card) { return card.evaluationType === 'NUMERIC_AGE' ? card.ageVoteCount ?? 0 : (card.yesVotes ?? 0) + (card.noVotes ?? 0); }

/** 정의: 인증 제공자별 진입 행동을 일관된 크기·접근성으로 렌더링하는 버튼이다. */
function ProviderButton({ label, icon, onClick, compact = false, selected = false }) {
  return (
    <button type="button" onClick={onClick} className={`mx-auto flex w-[92%] items-center justify-center gap-2 rounded-full border px-4 font-bold text-white shadow-sm backdrop-blur-[1px] transition-all duration-200 ${selected ? 'h-11 border-[#ecd8a8]/70 bg-white/[0.14] text-sm' : compact ? 'h-7 border-white/10 bg-white/[0.025] text-[10px] text-white/65 hover:bg-white/[0.08]' : 'h-10 border-white/15 bg-white/[0.055] text-sm hover:bg-white/[0.14]'}`}>
      <span className={`material-symbols-outlined text-[#ecd8a8] ${compact ? 'text-[13px]' : 'text-[17px]'}`}>{icon}</span>
      {label}
    </button>
  );
}
