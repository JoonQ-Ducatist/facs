import { useState } from 'react';

export default function TermsAcceptanceGate({ locale = 'ko', status = 'required', error = '', onAccept, onRetry, onSignOut, onOpenPolicy }) {
  const korean = locale !== 'en';
  const [checked, setChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState('');

  async function accept(event) {
    event.preventDefault();
    if (!checked || submitting) return;
    setSubmitting(true);
    setNotice('');
    const result = await onAccept?.();
    setSubmitting(false);
    if (!result?.ok) setNotice(result?.message ?? (korean ? '동의를 저장하지 못했어요. 다시 시도해 주세요.' : 'We could not save your acceptance. Please try again.'));
  }

  return (
    <main className="flex min-h-full items-center justify-center bg-[#f7f5ef] px-5 py-8 text-[#20211e]">
      <section className="w-full max-w-md rounded-xl border border-[#dfd9ca] bg-white p-6 shadow-sm" aria-labelledby="terms-gate-title">
        <p className="text-xs font-bold uppercase text-[#8b6b00]">{korean ? '정책 확인' : 'POLICY UPDATE'}</p>
        <h1 id="terms-gate-title" className="mt-2 text-2xl font-extrabold">{korean ? '계속하기 전에 확인해 주세요' : 'Please review before continuing'}</h1>
        <p className="mt-3 text-sm leading-6 text-[#62656c]">{korean ? '2026년 10월 9일 시행 이용약관을 확인하고 동의해야 서비스를 이용할 수 있습니다.' : 'You must review and accept the Terms effective October 9, 2026 to use the service.'}</p>
        {status === 'checking' ? (
          <p role="status" className="mt-5 text-sm text-[#62656c]">{korean ? '동의 기록을 확인하고 있어요.' : 'Checking your acceptance record.'}</p>
        ) : status === 'error' ? (
          <div className="mt-5">
            <p role="alert" className="text-sm text-[#a0354c]">{error || (korean ? '정책 동의 상태를 확인하지 못했어요.' : 'We could not verify your acceptance status.')}</p>
            <button type="button" onClick={onRetry} className="mt-4 rounded-lg border border-[#8b6b00] px-4 py-2 font-bold text-[#725900]">{korean ? '다시 확인' : 'Retry'}</button>
          </div>
        ) : (
          <form className="mt-5" onSubmit={accept}>
            <div className="flex gap-4 text-sm font-semibold">
              <button type="button" className="underline underline-offset-2" onClick={() => onOpenPolicy?.('terms')}>{korean ? '이용약관 보기' : 'Read Terms'}</button>
              <button type="button" className="underline underline-offset-2" onClick={() => onOpenPolicy?.('privacy')}>{korean ? '개인정보 처리방침 보기' : 'Read Privacy Notice'}</button>
            </div>
            <label className="mt-5 flex cursor-pointer items-start gap-2 text-sm leading-6">
              <input type="checkbox" checked={checked} onChange={(event) => setChecked(event.target.checked)} className="mt-1 accent-[#c52a52]" />
              <span>{korean ? '이용약관을 확인했으며 이에 동의합니다.' : 'I have read and agree to the Terms of Service.'}</span>
            </label>
            {notice && <p role="alert" className="mt-3 text-sm text-[#a0354c]">{notice}</p>}
            <button type="submit" disabled={!checked || submitting} className="mt-5 w-full rounded-lg bg-[#765d00] px-4 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">{submitting ? (korean ? '저장 중...' : 'Saving...') : (korean ? '동의하고 계속' : 'Agree and continue')}</button>
          </form>
        )}
        <button type="button" onClick={onSignOut} className="mt-4 w-full py-2 text-sm text-[#62656c] underline underline-offset-2">{korean ? '로그아웃' : 'Sign out'}</button>
      </section>
    </main>
  );
}
