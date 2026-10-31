import { useState } from 'react';
import { Dialog, DialogClose, DialogContent } from '../../components/ui/Dialog.jsx';

/** Local object URLs only: this optional preview cannot publish or display rating results. */
export default function UploadPostPreview({ locale, media, publicHandle, theme, visibility, question, ageMin, ageMax, onClose }) {
  const [index, setIndex] = useState(0);
  const en = locale === 'en';
  const active = media[index] ?? media[0];
  const title = en ? 'Post preview' : '게시물 미리보기';
  return <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
    <DialogContent title={title} aria-describedby="upload-preview-description">
      <article data-no-translate className="flex max-h-[85dvh] w-full max-w-md flex-col overflow-hidden rounded-xl border border-[#e4e2dd] bg-[#fbf9f4] text-[#1b1c19] shadow-xl">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[#e4e2dd] px-4 py-3">
          <h2 className="text-base font-bold">{title}</h2>
          <DialogClose asChild><button type="button" aria-label={en ? 'Close preview' : '미리보기 닫기'} className="flex h-9 w-9 items-center justify-center rounded-full border border-[#d7d1c5] text-[#575850]"><span className="material-symbols-outlined" aria-hidden="true">close</span></button></DialogClose>
        </header>
        <div className="min-h-0 overflow-y-auto overscroll-contain p-4">
          <p id="upload-preview-description" className="mb-3 text-xs leading-relaxed text-[#5b5e63]">{en ? 'Only you can see this preview. Nothing is uploaded until you tap “Upload to feed”.' : '나에게만 보이는 미리보기예요. 피드에 업로드하기를 누르기 전에는 업로드되지 않아요.'}</p>
          <div className="overflow-hidden rounded-lg border border-[#e4e2dd] bg-white">
            <div className="flex items-center justify-between gap-2 px-3 py-2 text-xs"><strong className="min-w-0 break-all">@{publicHandle}</strong><span className="shrink-0" style={{ color: theme.color }}>{theme.label}</span></div>
            {active.type === 'video' ? <video key={active.id} src={active.url} controls playsInline preload="metadata" className="max-h-[38dvh] w-full bg-[#0e1c2d] object-contain" /> : <img src={active.url} alt={en ? `Selected photo ${index + 1}` : `선택한 사진 ${index + 1}`} className="max-h-[38dvh] w-full object-contain" />}
            {media.length > 1 && <div className="flex items-center justify-center gap-3 px-3 py-2"><button type="button" disabled={index === 0} onClick={() => setIndex((value) => value - 1)} aria-label={en ? 'Previous media' : '이전 미디어'} className="h-9 w-9 rounded-full border border-[#d7d1c5] disabled:opacity-35">←</button><span aria-live="polite" className="text-xs">{index + 1} / {media.length}</span><button type="button" disabled={index === media.length - 1} onClick={() => setIndex((value) => value + 1)} aria-label={en ? 'Next media' : '다음 미디어'} className="h-9 w-9 rounded-full border border-[#d7d1c5] disabled:opacity-35">→</button></div>}
            <div className="space-y-2 p-3"><h3 className="whitespace-pre-wrap break-words text-sm font-bold">{question}</h3><p className="text-xs text-[#5b5e63]">{visibility === 'followers' ? (en ? 'Followers only' : '팔로워만') : (en ? 'Public' : '전체 공개')}</p>{theme.evaluationType === 'NUMERIC_AGE' && <p className="text-xs text-[#5b5e63]">{en ? `Rating range: ${ageMin}–${ageMax}` : `평가 나이 범위: ${ageMin}–${ageMax}세`}</p>}</div>
          </div>
        </div>
        <footer className="shrink-0 border-t border-[#e4e2dd] p-3"><DialogClose asChild><button type="button" className="min-h-10 w-full rounded-lg bg-[#0e1c2d] px-3 py-2 text-sm font-bold text-white">{en ? 'Back to editing' : '계속 작성하기'}</button></DialogClose></footer>
      </article>
    </DialogContent>
  </Dialog>;
}
