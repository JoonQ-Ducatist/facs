import { useState } from 'react';
import outfitPhoto from '../../assets/rating-demo-work.jpg';

export default function RatingDemoCard({ locale }) {
  const [answer, setAnswer] = useState(null);
  const en = locale === 'en';

  return (
    <section data-no-translate aria-labelledby="rating-demo-question" className="mx-auto mb-3 w-full max-w-[370px] rounded-2xl border border-[#d9d4c9] bg-[#fbfaf6] p-3 text-[#1b1c19] shadow-sm">
      <div className="flex items-center gap-3">
        <img src={outfitPhoto} width="68" height="86" alt={en ? 'AI example of a work outfit' : 'AI로 만든 출근 코디 예시'} className="h-[86px] w-[68px] shrink-0 rounded-lg object-cover object-[center_40%]" />
        <div>
          <p className="text-[10px] font-bold text-[#735c00]">{en ? 'AI example · No sign-in' : 'AI 예시 · 로그인 없이 체험'}</p>
          <h2 id="rating-demo-question" className="mt-1 text-sm font-bold leading-snug">{en ? 'Would this outfit work for a casual office day?' : '이 코디, 편한 출근룩으로 어울리나요?'}</h2>
          <p className="mt-1 text-xs text-[#525650]">{en ? 'There’s no right answer.' : '정답은 없어요.'}</p>
        </div>
      </div>
      {answer === null ? <>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setAnswer('yes')} className="min-h-12 rounded-lg bg-[#c52a52] px-2 text-sm font-bold text-white">{en ? 'Yes' : '어울려요'}</button>
          <button type="button" onClick={() => setAnswer('no')} className="min-h-12 rounded-lg border border-[#b8af9e] px-2 text-sm font-bold">{en ? 'No' : '아니요'}</button>
        </div>
        <button type="button" onClick={() => setAnswer('skip')} className="mt-2 min-h-11 px-2 text-xs font-semibold text-[#525650] underline underline-offset-2">{en ? 'Skip example' : '예시 건너뛰기'}</button>
      </> : <div className="mt-2">
        <p role="status" className="text-xs">
          {answer === 'skip'
            ? (en ? 'Example skipped.' : '예시를 건너뛰었어요.')
            : (en ? (answer === 'yes' ? 'You chose Yes.' : 'You chose No.') : (answer === 'yes' ? '어울려요를 선택했어요.' : '아니요를 선택했어요.'))}
          {' '}{en ? 'Practice answers aren’t saved.' : '체험 답변은 저장되지 않아요.'}
        </p>
        <button type="button" onClick={() => setAnswer(null)} className="min-h-11 px-2 text-xs font-semibold text-[#735c00] underline underline-offset-2">{en ? 'Try again' : '다시 체험하기'}</button>
      </div>}
    </section>
  );
}
