import { useEffect, useState } from 'react';
import SurfaceCard from '../../components/ui/SurfaceCard.jsx';
import { getModerationPostPreview, listModerationReports, reviewModerationReport } from '../../services/moderationApi.js';

const staffRoles = new Set(['moderator', 'admin']);

export function canAccessModeration(role) {
  return staffRoles.has(role);
}

/** Minimal staff-only report workflow. Server RPCs remain the authority for every read and transition. */
export default function ModerationView({ locale = 'ko', onBack }) {
  const korean = locale !== 'en';
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [pendingId, setPendingId] = useState('');
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    let active = true;
    listModerationReports().then((result) => {
      if (!active) return;
      if (result.error) setNotice(errorMessage(result.error, korean));
      else setReports(result.data ?? []);
      setLoading(false);
    });
    return () => { active = false; };
  }, [korean]);

  async function transition(report, nextStatus) {
    setPendingId(report.id);
    setNotice('');
    const result = await reviewModerationReport(report.id, nextStatus);
    setPendingId('');
    if (result.error) { setNotice(errorMessage(result.error, korean)); return; }
    setReports((items) => items.map((item) => item.id === report.id ? {
      ...item,
      status: result.data.status,
      reviewedBy: result.data.reviewedBy,
      reviewedAt: result.data.reviewedAt,
    } : item));
    setNotice(korean ? '신고 상태를 업데이트했어요.' : 'Report status updated.');
  }

  async function openPostPreview(report) {
    setPreview({ report, loading: true, data: null, error: '' });
    const result = await getModerationPostPreview(report.id);
    if (result.error) {
      setPreview({ report, loading: false, data: null, error: result.error });
      return;
    }
    setPreview({ report, loading: false, data: result.data, error: '' });
  }

  return <section className="editorial-moderation w-full pb-3 pt-1" aria-labelledby="moderation-title">
    <div className="mb-3 flex items-center justify-between gap-3"><div><p className="font-mono text-[10px] font-bold tracking-wider text-[#c52a52]">STAFF ONLY</p><h1 id="moderation-title" className="font-headline text-lg font-bold text-white">{korean ? '신고 검토' : 'Report review'}</h1></div><button type="button" onClick={onBack} className="rounded-md border border-surface-container-high px-2.5 py-1.5 text-xs font-bold text-slate-400">{korean ? '프로필로' : 'Profile'}</button></div>
    {notice && <p role="status" className="mb-3 rounded-md border border-[#c52a52]/35 bg-[#c52a52]/10 px-3 py-2 text-xs text-[#f487a3]">{notice}</p>}
    {loading ? <SurfaceCard className="p-5 text-center text-xs text-slate-400">{korean ? '신고 큐를 불러오는 중이에요.' : 'Loading report queue.'}</SurfaceCard> : reports.length ? <div className="flex flex-col gap-2.5">{reports.map((report) => <ReportItem key={report.id} report={report} korean={korean} pending={pendingId === report.id} onTransition={transition} onPreview={() => openPostPreview(report)} />)}</div> : <SurfaceCard className="p-5 text-center text-xs text-slate-400">{korean ? '검토할 신고가 없습니다.' : 'No reports to review.'}</SurfaceCard>}
    {preview && <ReportPostPreviewDialog locale={locale} report={preview.report} preview={preview.data} loading={preview.loading} error={preview.error} onClose={() => setPreview(null)} />}
  </section>;
}

function ReportItem({ report, korean, pending, onTransition, onPreview }) {
  const received = report.status === 'received';
  const triaged = report.status === 'triaged';
  const previewHref = `?post=${encodeURIComponent(report.targetId)}`;
  return <SurfaceCard as="article" className="p-3"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="font-mono text-[10px] font-bold text-[#c52a52]">{statusLabel(report.status, korean)}</p><h2 className="mt-1 text-sm font-bold text-white">{reasonLabel(report.reason, korean)}</h2>{report.targetType === 'post' ? <a href={previewHref} onClick={(event) => { event.preventDefault(); onPreview(); }} className="mt-1 inline-flex max-w-full break-all text-[10px] text-cyan-glow underline underline-offset-2">{korean ? '게시물 미리보기' : 'Preview post'} · {report.targetId}</a> : <p className="mt-1 break-all text-[10px] text-slate-400">{report.targetType} · {report.targetId}</p>}{report.detail && <p className="mt-2 text-xs leading-relaxed text-slate-300">{report.detail}</p>}</div><time className="shrink-0 text-[9px] text-slate-500">{formatTime(report.createdAt, korean)}</time></div>{(received || triaged) && <div className="mt-3 flex flex-wrap gap-1.5">{received && <ActionButton disabled={pending} onClick={() => onTransition(report, 'triaged')}>{korean ? '검토 시작' : 'Triage'}</ActionButton>}{triaged && <><ActionButton disabled={pending} onClick={() => onTransition(report, 'resolved')}>{korean ? '신고 적용' : 'Apply report'}</ActionButton><ActionButton muted disabled={pending} onClick={() => onTransition(report, 'dismissed')}>{korean ? '신고 반려' : 'Dismiss report'}</ActionButton></>}</div>}</SurfaceCard>;
}

function ReportPostPreviewDialog({ locale, report, preview, loading, error, onClose }) {
  const korean = locale !== 'en';
  const isVideo = preview?.media?.type === 'video' || String(preview?.media?.type ?? '').startsWith('video/');
  return <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/65 p-3 backdrop-blur-sm" role="presentation" onClick={onClose}>
    <section role="dialog" aria-modal="true" aria-label={korean ? '신고 게시물 미리보기' : 'Reported post preview'} className="max-h-full w-full max-w-md overflow-y-auto rounded-xl bg-[#101b2b] shadow-2xl" onClick={(event) => event.stopPropagation()}>
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3"><div><p className="font-mono text-[9px] font-bold tracking-wider text-[#f487a3]">{korean ? '신고 게시물' : 'REPORTED POST'}</p><h2 className="mt-0.5 text-sm font-bold text-white">{korean ? '피드 미리보기' : 'Feed preview'}</h2></div><button type="button" onClick={onClose} aria-label={korean ? '미리보기 닫기' : 'Close preview'} className="rounded-full p-1 text-lg leading-none text-white/80 hover:bg-white/10">×</button></div>
      {loading ? <div className="p-5 text-center text-xs text-slate-400">{korean ? '게시물 미리보기를 불러오는 중이에요.' : 'Loading post preview.'}</div> : preview ? <><div className="aspect-[4/5] bg-black">{isVideo ? <video className="h-full w-full object-contain" controls src={preview.media?.url} /> : preview.media?.url ? <img src={preview.media.url} alt="" className="h-full w-full object-contain" /> : <div className="flex h-full items-center justify-center text-xs text-slate-400">{korean ? '미리보기 미디어가 없습니다.' : 'No preview media available.'}</div>}</div><div className="space-y-1 px-4 py-3"><div className="flex items-center justify-between gap-3"><span className="text-xs font-bold text-cyan-glow">{preview.category}</span><span className="text-xs text-slate-400">@{preview.authorHandle}</span></div><p className="text-sm font-bold leading-relaxed text-white">{preview.question}</p><p className="text-[10px] text-slate-400">{korean ? '공개 범위' : 'Visibility'} · {preview.visibility} · {formatTime(preview.publishedAt, korean)}</p><p className="text-[10px] text-slate-400">{korean ? '신고 사유' : 'Report reason'} · {reasonLabel(report.reason, korean)}</p></div></> : <div className="p-5 text-center"><p className="text-sm font-bold text-white">{previewErrorMessage(error, korean)}</p><p className="mt-1 text-xs leading-relaxed text-slate-400">{korean ? '닫은 뒤 같은 신고 행에서 상태를 계속 처리할 수 있습니다.' : 'Close this preview to continue reviewing the same report.'}</p></div>}
    </section>
  </div>;
}

function ActionButton({ children, muted = false, ...props }) { return <button type="button" {...props} className={`rounded-md border px-2.5 py-1.5 text-[11px] font-bold disabled:opacity-50 ${muted ? 'border-surface-container-high text-slate-400' : 'border-[#c52a52]/55 bg-[#c52a52]/10 text-[#f487a3]'}`}>{children}</button>; }
function statusLabel(status, korean) { return ({ received: korean ? '접수됨' : 'Received', triaged: korean ? '검토 중' : 'Triaged', resolved: korean ? '해결됨' : 'Resolved', dismissed: korean ? '기각됨' : 'Dismissed' })[status] ?? status; }
function reasonLabel(reason, korean) { return ({ harassment: korean ? '괴롭힘 또는 위협' : 'Harassment or threat', sexual_content: korean ? '부적절한 콘텐츠' : 'Inappropriate content', privacy: korean ? '개인정보 노출' : 'Privacy exposure', spam: korean ? '스팸 또는 사기' : 'Spam or scam', other: korean ? '기타' : 'Other' })[reason] ?? reason; }
function formatTime(value, korean) { const date = new Date(value); return Number.isFinite(date.getTime()) ? date.toLocaleDateString(korean ? 'ko-KR' : 'en-US') : ''; }
function errorMessage(error, korean) { return error === 'FORBIDDEN' ? (korean ? '검토 권한이 없습니다.' : 'You do not have review access.') : (korean ? '신고 정보를 불러오지 못했어요. 다시 시도해 주세요.' : 'Could not update the report. Please try again.'); }
function previewErrorMessage(error, korean) { return error === 'FORBIDDEN' ? (korean ? '게시물 미리보기 권한이 없습니다.' : 'You do not have preview access.') : (korean ? '게시물 미리보기를 불러오지 못했어요.' : 'Could not load this post preview.'); }
