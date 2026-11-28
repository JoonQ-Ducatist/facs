import { useState } from 'react';

export default function AgeVotePanel({ locale, card, color, onVote, disabled = false, showQuestion = true }) {
  const en = locale === 'en';
  const min = card.ageMin ?? 18;
  const max = card.ageMax ?? 99;
  const [selectedAge, setSelectedAge] = useState(null);
  const sliderAge = selectedAge ?? Math.round((min + max) / 2);
  const selectDisabled = disabled || selectedAge === null;

  function selectAge(value) {
    setSelectedAge(Math.min(max, Math.max(min, Number(value))));
  }

  return <div data-no-translate className="age-vote-panel rounded-xl border border-white/30 bg-[#061225]/60 px-2.5 py-1.5">
    {showQuestion && <p className="mb-1 text-center text-xs font-semibold text-white">{en ? 'How old does this person look?' : '몇 살로 보이나요?'}</p>}
    <div className="flex items-center gap-1.5">
      <button type="button" onClick={() => selectAge(sliderAge - 1)} disabled={disabled || sliderAge <= min} aria-label={en ? 'Decrease age by one' : '예상 나이 한 살 낮추기'} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-white/35 text-white disabled:opacity-35">−</button>
      <input type="range" disabled={disabled} min={min} max={max} step="1" value={sliderAge} onChange={(event) => selectAge(event.target.value)} onPointerDown={(event) => event.stopPropagation()} onPointerMove={(event) => event.stopPropagation()} onPointerUp={(event) => event.stopPropagation()} aria-label={en ? 'Estimated age' : '예상 나이 선택'} aria-valuetext={selectedAge === null ? (en ? 'No age selected' : '아직 선택하지 않음') : (en ? `${selectedAge} years` : `${selectedAge}세`)} className="age-vote-slider min-h-11 min-w-0 flex-1" style={{ accentColor: color }} />
      <button type="button" onClick={() => selectAge(sliderAge + 1)} disabled={disabled || sliderAge >= max} aria-label={en ? 'Increase age by one' : '예상 나이 한 살 높이기'} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-white/35 text-white disabled:opacity-35">+</button>
      <button
        type="button"
        disabled={selectDisabled}
        onClick={() => { if (!selectDisabled) onVote(selectedAge); }}
        className="min-h-11 shrink-0 rounded-lg border border-transparent px-2 text-xs font-bold text-[#051424] disabled:cursor-not-allowed disabled:border-outline disabled:bg-primary-container disabled:text-surface-container-highest"
        style={selectDisabled ? undefined : { backgroundColor: color }}
      >{en ? 'Select' : '선택'}</button>
    </div>
    <output className="block text-center text-xs text-white">{selectedAge === null ? (en ? 'Move the slider or tap + or − to choose.' : '막대를 움직이거나 +, −를 눌러 선택하세요.') : (en ? `${selectedAge} years` : `${selectedAge}세`)}</output>
  </div>;
}
