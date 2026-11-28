import { useRef, useState } from 'react';
import { invitationMessage, shareInvitation } from './entryIntent.js';

export default function InvitationActions({ link, locale }) {
  const ko = locale === 'ko';
  const message = invitationMessage(link, locale);
  const [feedback, setFeedback] = useState(null);
  const pending = useRef(false);
  const linkField = useRef(null);
  const messageField = useRef(null);
  const busy = feedback?.result === 'pending';

  async function run(action) {
    if (pending.current) return;
    pending.current = true;
    setFeedback({ action, result: 'pending' });
    try {
      let result = 'copied';
      if (action === 'share') {
        result = await shareInvitation(link, locale);
      } else {
        await navigator.clipboard.writeText(action === 'message' ? message : link);
      }
      setFeedback({ action, result });
    } catch {
      setFeedback({ action, result: 'failed' });
      const field = action === 'message' ? messageField.current : linkField.current;
      field?.focus();
      field?.select();
    } finally {
      pending.current = false;
    }
  }

  function button(action, label) {
    const result = feedback?.action === action ? feedback.result : null;
    const complete = result === 'copied' || result === 'shared';
    return (
      <button type="button" className="invite-action"
        data-complete={complete} aria-disabled={busy} onClick={() => run(action)}>
        {result === 'pending' ? (ko ? '처리 중…' : 'Working…')
          : result === 'copied' ? (action === 'message' ? (ko ? '✓ 문구와 링크 복사됨' : '✓ Message and link copied') : (ko ? '✓ 링크 복사됨' : '✓ Link copied'))
          : result === 'shared' ? (ko ? '✓ 공유 완료' : '✓ Shared')
          : label}
      </button>
    );
  }

  let status = '';
  if (feedback?.result === 'copied') {
    status = feedback.action === 'message'
      ? (ko ? '요청 문구와 링크를 복사했어요.' : 'Request message and link copied.')
      : (ko ? '초대 링크를 복사했어요.' : 'Invitation link copied.');
  } else if (feedback?.result === 'shared') {
    status = ko ? '기기의 공유 기능을 사용했어요.' : 'Used your device’s share feature.';
  } else if (feedback?.result === 'cancelled') {
    status = ko ? '공유를 취소했어요.' : 'Sharing cancelled.';
  } else if (feedback?.result === 'failed') {
    status = feedback.action === 'message'
      ? (ko ? '선택된 문구와 링크를 직접 복사해 주세요.' : 'Copy the selected message and link manually.')
      : (ko ? '선택된 초대 링크를 직접 복사해 주세요.' : 'Copy the selected invitation link manually.');
  }

  return (
    <div>
      <label style={{ display: 'block' }}>
        {ko ? '초대 링크 · 새로 만들면 이전 링크는 종료됩니다' : 'Invite link · creating another disables the previous link'}
        <input ref={linkField} readOnly value={link} style={{ width: '100%', padding: 8 }}
          onFocus={event => event.currentTarget.select()} />
      </label>
      {button('link', ko ? '초대 링크 복사' : 'Copy invitation link')}
      <label style={{ display: 'block', marginTop: 12 }}>
        {ko ? '바로 보낼 요청 문구' : 'Ready-to-send request message'}
        <textarea ref={messageField} readOnly rows={5} value={message} style={{ width: '100%', padding: 8 }} />
      </label>
      {button('message', ko ? '문구와 링크 복사' : 'Copy message and link')}
      {button('share', ko ? '초대 링크 공유' : 'Share invitation')}
      <p role="status">{status}</p>
    </div>
  );
}
