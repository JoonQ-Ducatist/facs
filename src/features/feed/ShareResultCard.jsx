/** Compact, share-only result preview. It stays outside the feed result layout. */
export default function ShareResultCard({ locale = 'ko', card, category, color, total = 0, yesPercent = 0, noPercent = 0, onClose, onShare }) {
  const korean = locale !== 'en';
  const media = card?.media?.[0] ?? (card?.imageUrl ? { url: card.imageUrl, type: card.mediaType ?? 'image' } : null);
  const isVideo = String(media?.type ?? '').startsWith('video');
  const categoryLabel = category?.label ?? card?.category ?? (korean ? '결과' : 'Result');
  const hasAggregate = total > 0;
  const ageResult = card?.evaluationType === 'NUMERIC_AGE';
  const title = korean ? `${categoryLabel} 공유 카드` : `${categoryLabel} share card`;

  return <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm" onClick={onClose}>
    <section role="dialog" aria-modal="true" aria-label={title} className="w-full max-w-sm overflow-hidden rounded-2xl border border-white/30 bg-[#061225]/95 text-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
      <header className="flex items-center justify-between border-b border-white/15 px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-bold" style={{ color }}>{categoryLabel}</p>
          <h2 className="truncate text-sm font-semibold">{korean ? '평가 결과 공유' : 'Share evaluation result'}</h2>
        </div>
        <button type="button" onClick={onClose} aria-label={korean ? '공유 카드 닫기' : 'Close share card'} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/25 text-white/80 hover:bg-white/10"><span className="material-symbols-outlined text-base" aria-hidden="true">close</span></button>
      </header>
      <div className="flex gap-3 p-4">
        <div className="h-20 w-16 shrink-0 overflow-hidden rounded-lg border border-white/20 bg-black/25">
          {media?.url && !isVideo ? <img src={media.url} alt="" className="h-full w-full object-cover" draggable="false" /> : media?.url && isVideo ? <video src={media.url} className="h-full w-full object-cover" muted playsInline preload="metadata" aria-hidden="true" /> : <span className="material-symbols-outlined flex h-full w-full items-center justify-center text-xl text-white/45" aria-hidden="true">image</span>}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs text-white/70">@{card?.author ?? (korean ? '사용자' : 'member')}</p>
          <p className="mt-1 text-xs font-semibold text-white/85">{korean ? `유효 평가 ${total.toLocaleString()}명` : `Valid ratings ${total.toLocaleString()}`}</p>
          {ageResult ? <p className="mt-2 text-lg font-bold" style={{ color }}>{hasAggregate ? `${Number(card.ageEstimate ?? 0).toFixed(1)}${korean ? '세' : ' years'}` : (korean ? '결과 수집 중' : 'Collecting results')}</p> : <div className="mt-2 flex items-center gap-2 text-xs font-bold"><span style={{ color }}>YES {yesPercent}%</span><span className="text-[#ffb1c4]">NO {noPercent}%</span></div>}
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 px-4 pb-4">
        <p className="text-[11px] leading-relaxed text-white/65">{korean ? '이 카드를 통해 평가에 참여할 수 있어요.' : 'Open this card to add your perspective.'}</p>
        <button type="button" onClick={onShare} className="shrink-0 rounded-md px-3 py-2 text-xs font-semibold text-[#061225]" style={{ backgroundColor: color }}>{korean ? '공유하기' : 'Share'}</button>
      </div>
    </section>
  </div>;
}
