import { useState } from 'react';
import { Dialog, DialogContent, DialogClose } from './Dialog.jsx';
import { LOCAL_QA_ACCOUNTS } from '../../services/localQaAccounts.js';

/** A deliberately local-only helper for exercising real multi-member rules without email OTP. */
export default function LocalQaAccountSwitcher({ enabled, currentUserEmail, onSelect, placement = 'app' }) {
  const [open, setOpen] = useState(false);
  const [pendingId, setPendingId] = useState('');
  const [notice, setNotice] = useState('');
  if (!enabled) return null;

  async function select(account) {
    setPendingId(account.id);
    setNotice('');
    const result = await onSelect(account.id);
    setPendingId('');
    if (!result?.ok) {
      setNotice('로컬 QA 계정을 전환하지 못했어요. Docker와 로컬 Supabase 상태를 확인해 주세요.');
      return;
    }
    setOpen(false);
  }

  return <>
    <button type="button" onClick={() => setOpen(true)} className={placement === 'splash'
      ? 'absolute left-5 top-10 z-20 rounded-md border border-[#ecd8a8]/60 bg-[#132438]/65 px-2 py-1 font-mono text-[9px] font-bold text-[#ecd8a8] backdrop-blur'
      : 'flex h-6 items-center justify-center rounded-md border border-dashed border-[#c5a059]/60 px-1.5 font-mono text-[8px] font-bold text-[#735c00] hover:bg-surface-container'} aria-label="로컬 QA 계정 전환">QA 계정</button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent title="로컬 QA 계정 전환">
        <section className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl" aria-describedby="local-qa-account-description">
          <div className="mb-4 flex items-start justify-between gap-3"><div><h2 className="text-base font-extrabold text-[#1b1c19]">로컬 QA 계정 전환</h2><p id="local-qa-account-description" className="mt-1 text-xs leading-relaxed text-[#74777d]">이 로컬 브라우저에서만 실제 테스트 세션을 바꿉니다. 이메일 발송과 운영 데이터 변경은 없습니다.</p></div><DialogClose className="text-lg leading-none text-[#74777d]" aria-label="닫기">×</DialogClose></div>
          <div className="space-y-2">
            {LOCAL_QA_ACCOUNTS.map((account) => {
              const active = currentUserEmail === account.email;
              return <button key={account.id} type="button" disabled={Boolean(pendingId) || active} onClick={() => select(account)} className={`flex w-full items-center justify-between rounded-lg border px-3 py-3 text-left transition hover:border-[#c5a059] disabled:cursor-default ${active ? 'border-[#d94c70]/55 bg-[#fff5f7]' : 'border-[#e4e2dd] bg-[#fbf9f4]'} ${pendingId ? 'opacity-60' : ''}`}>
                <span><strong className="block text-sm text-[#1b1c19]">{account.displayName} <span className="font-normal text-[#74777d]">{account.role}</span></strong><span className="mt-0.5 block text-[11px] text-[#74777d]">@{account.handle}</span></span>
                <span className={`font-mono text-[10px] font-bold ${active ? 'text-[#d94c70]' : 'text-[#735c00]'}`}>{active ? '사용 중' : pendingId === account.id ? '전환 중' : '선택'}</span>
              </button>;
            })}
            {notice && <p role="alert" className="rounded-md bg-[#fff0f2] px-3 py-2 text-xs text-[#9e1740]">{notice}</p>}
          </div>
        </section>
      </DialogContent>
    </Dialog>
  </>;
}
