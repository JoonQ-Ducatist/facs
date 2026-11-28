import { useState } from 'react';
import AgeVotePanel from '../feed/AgeVotePanel.jsx';
import agePhoto from '../../assets/rating-demo-age.jpg';
import outfitPhoto from '../../assets/rating-demo-work.jpg';

const ageExample = { ageMin: 20, ageMax: 65 };

export default function RatingDemoCard({ locale, onContinueRating }) {
  const [mode, setMode] = useState('outfit');
  const [answer, setAnswer] = useState(null);
  const en = locale === 'en';
  const answerLabels = {
    yes: en ? 'It works' : '어울려요',
    no: en ? 'I’d choose another' : '다른 코디가 더 좋아요',
  };
  const isAge = mode === 'age';
  const hasAnswer = answer !== null && answer !== 'skip';
  const question = isAge
    ? (en ? 'How old does this person look?' : '몇 살로 보이나요?')
    : (en ? 'Would this outfit work for a casual office day?' : '이 코디, 편한 출근룩으로 어울리나요?');

  function switchMode(nextMode) {
    if (nextMode === mode) return;
    setMode(nextMode);
    setAnswer(null);
  }

  function answerMessage() {
    if (!hasAnswer) return en ? 'Example skipped.' : '예시를 건너뛰었어요.';
    const choice = isAge ? (en ? `${answer} years` : `${answer}세`) : answerLabels[answer];
    return en ? `You chose: ${choice}.` : `고른 답 · ${choice}`;
  }

  return (
    <section data-no-translate aria-labelledby="rating-demo-question" className="mx-auto w-full max-w-[37rem]">
      <div role="group" aria-label={en ? 'Choose a practice rating' : '체험 평가 종류'} className="mb-2 grid grid-cols-2 gap-2">
        <button type="button" data-mode="outfit" aria-pressed={mode === 'outfit'} onClick={() => switchMode('outfit')} className="rating-demo__mode">{en ? 'Outfit rating' : '코디 평가'}</button>
        <button type="button" data-mode="age" aria-pressed={isAge} onClick={() => switchMode('age')} className="rating-demo__mode">{en ? 'Age guess' : '나이 평가'}</button>
      </div>
      <div data-mode={mode} className="rating-demo overflow-hidden rounded-2xl border border-[#d9d4c9] bg-[#fbfaf6] text-[#1b1c19] shadow-sm">
        <div className="rating-demo__photo relative">
          <img src={isAge ? agePhoto : outfitPhoto} width="600" height="800" alt={isAge
            ? (en ? 'AI portrait of an adult in a dark suit' : '검은 정장을 입은 가상 성인 사진')
            : (en ? 'Light blazer and dark wide-leg trousers' : '밝은 재킷과 검은 와이드 팬츠를 입은 출근 코디')} />
          <p className="absolute bottom-2 left-2 rounded-full bg-[#f9f7f2] px-2.5 py-1 text-[10px] font-bold text-[#735c00]">{en ? 'AI example' : 'AI 예시'}</p>
        </div>
        <div className="rating-demo__prompt p-3.5">
          <h1 id="rating-demo-question" className="font-headline text-xl font-extrabold leading-tight">{question}</h1>
          <p className="rating-demo__intro mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg px-2.5 py-2 text-xs font-semibold leading-snug">
            <strong>{en ? 'No sign-in needed' : '로그인 없이 체험'}</strong>
            <span>{en ? 'Go with your first impression.' : '정답은 없어요. 첫인상대로 골라 보세요.'}</span>
          </p>
          {answer === null ? (isAge ? (
            <div className="mt-3"><AgeVotePanel locale={locale} card={ageExample} color="#8be2d0" onVote={setAnswer} showQuestion={false} /></div>
          ) : (
            <div className="mt-3 grid grid-cols-2 gap-2">
              {Object.entries(answerLabels).map(([value, label]) => (
                <button key={value} type="button" data-choice={value} onClick={() => setAnswer(value)} className="rating-demo__choice">{label}</button>
              ))}
            </div>
          )) : (
            <p role="status" className="mt-3 rounded-lg bg-[#f0eee9] px-3 py-2 text-sm font-semibold">
              {answerMessage()}
            </p>
          )}
          <p className="mt-2 text-xs text-[#525650]">{en ? 'Practice answers aren’t saved.' : '체험 답변은 저장되지 않아요.'}</p>
          {hasAnswer && <button type="button" onClick={onContinueRating} className="rating-demo__continue mt-3 min-h-12 w-full rounded-xl px-3 py-1 text-sm font-extrabold text-white">
            {en ? 'Sign in to rate photos' : '로그인하고 피드에서 평가하기'}
          </button>}
          <button type="button" onClick={() => setAnswer(answer === null ? 'skip' : null)} className="min-h-11 px-1 text-xs font-semibold text-[#525650] underline underline-offset-2">
            {answer === null ? (en ? 'Skip example' : '예시 건너뛰기') : (en ? 'Try again' : '다시 체험하기')}
          </button>
        </div>
      </div>
    </section>
  );
}
