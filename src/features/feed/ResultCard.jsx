import { getSampleStatus, SAMPLE_STATUS } from '../../services/mockApi.js';

/** Compact result context shared by binary and numeric evaluations. */
export default function ResultCard({ locale = 'ko', card, category, total = 0, color, sampleStatus, onBoost, onStartUpload, uploadLabel, children }) {
  const korean = locale !== 'en';
  const status = sampleStatus ?? getSampleStatus(total);
  const statusLabel = korean ? statusLabelsKo[status] : statusLabelsEn[status];
  const boostLabel = total === 0 ? (korean ? '더 많은 평가 받아보기' : 'Get more feedback') : (korean ? '100명까지 Boost 요청' : 'Boost to 100');
  const categoryLabel = category?.label ?? card?.category ?? (korean ? '결과' : 'Result');
  const cardLabel = korean ? `${categoryLabel} 평가 결과` : `${categoryLabel} result`;
  const sampleCount = korean ? `(${total.toLocaleString()}명)` : `(${total.toLocaleString()} ratings)`;
  const hasMedia = Boolean(card?.media?.[0]?.url || card?.imageUrl);

  return <article className="feed-result mb-2.5 rounded-xl border border-white/30 bg-[#061225]/42 p-2.5 shadow-[0_8px_24px_rgba(0,0,0,.18)] backdrop-blur-[1px]" aria-label={cardLabel} data-result-card>
    <div className="feed-result__meta mb-1.5"><span className="font-mono text-[10px] font-bold" style={{ color }}>{statusLabel} <strong className="font-extrabold text-[#fff4bc]">{sampleCount}</strong></span><span className="sr-only">{cardLabel}{hasMedia ? (korean ? ' 사진 포함' : ' media available') : ''}</span></div>
    {children}
    {(onBoost || onStartUpload) && <div className="feed-result__actions mt-1.5 flex items-center"><div className="feed-result__secondary flex items-center gap-2">{onBoost && <button type="button" onClick={onBoost} className="feed-result__boost rounded-md border px-1.5 py-0.5 text-[10px] font-bold" style={{ color, borderColor: `${color}aa`, backgroundColor: `${color}20` }}>{boostLabel}</button>}{onStartUpload && <button type="button" onClick={onStartUpload} className="feed-result__self text-[10px] font-semibold text-white/85 underline decoration-white/35 underline-offset-2">{uploadLabel ?? (korean ? '나도 평가받기' : 'Get feedback too')}</button>}</div></div>}
  </article>;
}

const statusLabelsKo = { [SAMPLE_STATUS.INSUFFICIENT]: '표본 수집 중', [SAMPLE_STATUS.EARLY_SIGNAL]: '초기 경향', [SAMPLE_STATUS.BASE_RESULT]: '현재 결과', [SAMPLE_STATUS.EXPANDED_SAMPLE]: '확장 표본' };
const statusLabelsEn = { [SAMPLE_STATUS.INSUFFICIENT]: 'Collecting ratings', [SAMPLE_STATUS.EARLY_SIGNAL]: 'Early signal', [SAMPLE_STATUS.BASE_RESULT]: 'Current result', [SAMPLE_STATUS.EXPANDED_SAMPLE]: 'Expanded sample' };
