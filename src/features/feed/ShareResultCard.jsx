import { Dialog, DialogContent } from '../../components/ui/Dialog.jsx';
import { shareResultData } from './shareResultData.js';
import { binaryLabels } from '../growth/comparison.js';
/** Compact, share-only result preview. It stays outside the feed result layout. */
export default function ShareResultCard({ locale = 'ko', card, category, color, canViewResults = false, onClose, onShare }) {
  const korean = locale !== 'en';
  const media = card?.media?.[0] ?? (card?.imageUrl ? { url: card.imageUrl, type: card.mediaType ?? 'image' } : null);
  const isVideo = String(media?.type ?? '').startsWith('video');
  const categoryLabel = category?.label ?? card?.category ?? (korean ? '결과' : 'Result');
  const result = shareResultData(card, canViewResults);
  const { total, yesPercent, noPercent } = result;
  const ageResult = card?.evaluationType === 'NUMERIC_AGE';
  const title = korean ? `${categoryLabel} 공유 카드` : `${categoryLabel} share card`;

  return <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
    <DialogContent title={title} aria-describedby={undefined}
      onTouchStart={(event) => event.stopPropagation()} onTouchMove={(event) => event.stopPropagation()} onTouchEnd={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()} onPointerUp={(event) => event.stopPropagation()}>
    <section className="share-result-card w-full max-w-sm overflow-y-auto overscroll-contain rounded-2xl border border-white/30 bg-[#061225]/95 text-white shadow-2xl">
      <header className="flex items-center justify-between border-b border-white/15 px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-bold" style={{ color }}>{categoryLabel}</p>
          <h2 className="truncate text-sm font-semibold">{korean ? '게시물 공유' : 'Share this post'}</h2>
        </div>
        <button type="button" onClick={onClose} aria-label={korean ? '공유 카드 닫기' : 'Close share card'} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/25 text-white/80 hover:bg-white/10"><span className="material-symbols-outlined text-base" aria-hidden="true">close</span></button>
      </header>
      <div className="flex gap-3 p-4">
        <div className="h-20 w-16 shrink-0 overflow-hidden rounded-lg border border-white/20 bg-black/25">
          {media?.url && !isVideo ? <img src={media.url} alt="" className="h-full w-full object-cover" draggable="false" /> : media?.url && isVideo ? <video src={media.url} className="h-full w-full object-cover" muted playsInline preload="metadata" aria-hidden="true" /> : <span className="material-symbols-outlined flex h-full w-full items-center justify-center text-xl text-white/45" aria-hidden="true">image</span>}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs text-white/70">@{card?.author ?? (korean ? '사용자' : 'member')}</p>
          <p className="mt-1 text-xs font-semibold text-white/85">{total === null ? (korean ? '평가 정보를 불러오지 못했어요' : 'Rating information unavailable') : (korean ? `유효 평가 ${total.toLocaleString()}명` : `Valid ratings ${total.toLocaleString()}`)}</p>
          {result.status === 'empty' ? <p className="mt-2 text-sm font-bold">{korean ? '아직 평가가 없어요' : 'No ratings yet'}</p> : result.status === 'hidden' ? <p className="mt-2 text-sm">{korean ? '평가에 참여하면 결과를 볼 수 있어요' : 'Rate this post to see the results'}</p> : result.status === 'ready' ? (ageResult ? <p className="mt-2 text-lg font-bold" style={{ color }}>{`${result.averageAge.toFixed(1)}${korean ? '세' : ' years'}`}</p> : <div className="mt-2 flex items-center gap-2 text-xs font-bold"><span style={{ color }}>{binaryLabels(card)[0]} {yesPercent}%</span><span className="text-[#ffb1c4]">{binaryLabels(card)[1]} {noPercent}%</span></div>) : null}
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 px-4 pb-4">
        <p className="text-[11px] leading-relaxed text-white/65">{korean ? '이 카드를 통해 평가에 참여할 수 있어요.' : 'Open this card to add your perspective.'}</p>
        <button type="button" onClick={onShare} className="shrink-0 rounded-md px-3 py-2 text-xs font-semibold text-[#061225]" style={{ backgroundColor: color }}>{korean ? '공유하기' : 'Share'}</button>
      </div>
    </section>
    </DialogContent>
  </Dialog>;
}
