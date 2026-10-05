import { useEffect, useState } from 'react';
import SurfaceCard from '../../components/ui/SurfaceCard.jsx';
import { getOperationalMetrics } from '../../services/operationsMetricsApi.js';

/** Admin-only aggregate dashboard. It intentionally does not expose person-level behavior. */
export default function OperationsDashboard({ locale = 'ko', sessionKey = '', onBack }) {
  const korean = locale !== 'en';
  const [daily, setDaily] = useState(null);
  const [monthly, setMonthly] = useState(null);
  const [notice, setNotice] = useState('');
  useEffect(() => {
    let active = true;
    Promise.all([getOperationalMetrics(24), getOperationalMetrics(720)]).then(([day, month]) => {
      if (!active) return;
      if (day.error || month.error) setNotice(korean ? '운영 지표를 불러오지 못했어요.' : 'Could not load operations metrics.');
      else { setDaily(day.data); setMonthly(month.data); }
    });
    return () => { active = false; };
  }, [korean, sessionKey]);
  const m = monthly ?? {};
  const d = daily ?? {};
  const funnel = [
    [korean ? '방문' : 'Visits', m.unique_visitors],
    [korean ? '가입 완료' : 'Sign-ups', m.signups_completed],
    [korean ? '첫 평가' : 'First votes', m.first_votes],
    [korean ? '업로드 완료' : 'Uploads', m.uploads_completed],
    [korean ? '결과 확인' : 'Results viewed', m.results_viewed],
  ];
  return <section className="w-full pb-3 pt-1" aria-labelledby="operations-title"><div className="mb-3 flex items-center justify-between"><div><p className="font-mono text-[10px] font-bold tracking-wider text-cyan-glow">ADMIN ONLY</p><h1 id="operations-title" className="font-headline text-lg font-bold text-white">{korean ? '사용자 동선 분석' : 'User journey analytics'}</h1></div><button type="button" onClick={onBack} className="rounded-md border border-surface-container-high px-2.5 py-1.5 text-xs font-bold text-slate-400">{korean ? '프로필로' : 'Profile'}</button></div>{notice ? <SurfaceCard className="p-4 text-xs text-[#f487a3]">{notice}</SurfaceCard> : !daily || !monthly ? <SurfaceCard className="p-5 text-center text-xs text-slate-400">{korean ? '운영 지표를 불러오는 중이에요.' : 'Loading operations metrics.'}</SurfaceCard> : <div className="space-y-3"><p className="text-[10px] leading-relaxed text-slate-400">{korean ? 'GA4 연결 전에도 익명 세션 기준의 서비스 집계로 핵심 동선을 확인합니다. 개인별 행동·이메일·콘텐츠는 표시하지 않습니다.' : 'Core journeys use anonymous product aggregates before GA4 is connected. No person-level behavior, email, or content is shown.'}</p><div className="grid grid-cols-2 gap-2"><Metric label="DAU" value={d.unique_visitors} /><Metric label="MAU" value={m.unique_visitors} /><Metric label={korean ? '신규 가입 (30일)' : 'New members (30d)'} value={m.new_members} /><Metric label={korean ? '탈퇴자' : 'Account closures'} value={korean ? '미제공' : 'Not available'} /></div><SurfaceCard className="p-3"><h2 className="text-xs font-bold text-white">{korean ? '30일 사용자 동선' : '30-day user journey'}</h2><div className="mt-3 space-y-2">{funnel.map(([label, value], index) => <div key={label}><div className="flex justify-between text-[10px]"><span className="text-slate-300">{label}</span><strong className="text-white">{Number(value ?? 0).toLocaleString()}</strong></div><div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-container-high"><span className="block h-full bg-cyan-glow" style={{ width: `${Math.min(100, Math.round((Number(value ?? 0) / Math.max(Number(funnel[0][1] ?? 0), 1)) * 100))}%` }} /></div>{index > 0 && <p className="mt-0.5 text-[9px] text-slate-500">{korean ? `이전 단계 대비 ${Math.max(0, Number(funnel[index - 1][1] ?? 0) - Number(value ?? 0)).toLocaleString()} 이탈` : `${Math.max(0, Number(funnel[index - 1][1] ?? 0) - Number(value ?? 0)).toLocaleString()} dropped from prior step`}</p>}</div>)}</div></SurfaceCard></div>}</section>;
}

function Metric({ label, value }) { return <SurfaceCard className="p-3"><p className="text-[9px] text-slate-400">{label}</p><strong className="mt-1 block font-headline text-lg text-white">{typeof value === 'number' ? value.toLocaleString() : value}</strong></SurfaceCard>; }
