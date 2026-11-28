import { useEffect, useState } from 'react';
import { externalRequest } from './feedbackClient.js';
import { entryUrl } from './entryIntent.js';

const button = {
  minHeight: 44, padding: '10px 14px', border: '1px solid #c5a059',
  borderRadius: 10, background: 'white', color: '#735c00',
};

export default function GuestFeedback() {
  const token = location.hash.slice(1);
  const [locale, setLocale] = useState(() => new URLSearchParams(location.search).get('locale') === 'ko' ? 'ko' : 'en');
  const ko = locale === 'ko';
  const home = ko ? '/ko/' : '/';
  const [age, setAge] = useState(false);
  const [reported, setReported] = useState(false);
  const [photo, setPhoto] = useState(null);
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    let objectUrl;
    setLoading(true);
    setError('');

    async function load() {
      try {
        const invitation = await externalRequest(token, 'open');
        if (invitation.alreadySubmitted) {
          if (alive) {
            setPhoto(invitation);
            setDone('duplicate');
          }
          return;
        }
        const blob = await externalRequest(token, 'image');
        if (!alive) return;
        objectUrl = URL.createObjectURL(blob);
        setPhoto(invitation);
        setUrl(objectUrl);
      } catch (failure) {
        if (alive) setError(failure.message === 'LIMIT' ? 'limit' : 'load');
      } finally {
        if (alive) setLoading(false);
      }
    }

    void load();
    return () => {
      alive = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [token, attempt]);

  function switchLocale() {
    const next = ko ? 'en' : 'ko';
    setLocale(next);
    const nextUrl = new URL(location.href);
    nextUrl.searchParams.set('locale', next);
    history.replaceState(null, '', nextUrl);
  }

  async function vote(choice) {
    if (busy || done || !age) return;
    setBusy(true);
    setError('');
    try {
      await externalRequest(token, 'vote', { choice, ageConfirmed: age });
      setDone('saved');
    } catch (failure) {
      if (failure.message === 'ALREADY_VOTED') setDone('duplicate');
      else setError(failure.message === 'LIMIT' ? 'limit' : 'save');
    } finally {
      setBusy(false);
    }
  }

  async function report() {
    setBusy(true);
    setError('');
    try {
      await externalRequest(token, 'report', { reason: 'privacy' });
      setReported(true);
    } catch {
      setError('report');
    } finally {
      setBusy(false);
    }
  }

  const messages = ko ? {
    load: '초대가 종료되었거나 지금 열 수 없어요.',
    limit: '요청이 많아 잠시 쉬고 있어요. 나중에 다시 시도해 주세요.',
    save: '의견을 저장하지 못했어요. YES 또는 NO를 다시 눌러 주세요.',
    report: '신고를 보내지 못했어요.',
  } : {
    load: 'This invitation has ended or is unavailable.',
    limit: 'This invitation is temporarily at its request limit. Please try again later.',
    save: 'Your opinion could not be saved. Tap YES or NO to try again.',
    report: 'Could not send report.',
  };

  return (
    <main style={{ maxWidth: 560, margin: 'auto', padding: 20, color: '#1b1c19', background: '#f9f7f2', minHeight: '100dvh' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <a href={home}>FACt.Smack</a>
        <button type="button" style={button} onClick={switchLocale}>{ko ? 'English' : '한국어'}</button>
      </header>

      <h1>{ko ? '초대받은 사진에 의견 남기기' : 'Give feedback on an invited photo'}</h1>
      {!done && <p>{ko ? '가입 없이 YES 또는 NO로 한 번만 골라 주세요.' : 'Pick YES or NO. No account needed.'}</p>}
      {loading && <p role="status">{ko ? '사진을 불러오고 있어요…' : 'Loading the invited photo…'}</p>}

      {photo && !loading && !done && (
        <>
          <h2>{photo.question}</h2>
          <img src={url} alt={ko ? '작성자가 초대한 사진' : 'Photo shared by its author'}
            style={{ width: '100%', maxHeight: 'min(32dvh, 280px)', objectFit: 'contain' }} />
          <label style={{ display: 'block', marginTop: 12 }}>
            <input type="checkbox" checked={age} onChange={event => setAge(event.target.checked)} />
            {ko ? '만 14세 이상입니다.' : 'I am 14 years of age or older.'}
          </label>
          <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
            {['yes', 'no'].map(choice => (
              <button type="button" key={choice} disabled={busy || !age} onClick={() => vote(choice)}
                style={{ ...button, flex: 1, background: '#c52a52', color: 'white' }}>
                {choice.toUpperCase()}
              </button>
            ))}
          </div>
          {busy && !error && <p role="status">{ko ? '처리 중…' : 'Working…'}</p>}
        </>
      )}

      {done && (
        <>
          <h2 role="status">
            {done === 'duplicate'
              ? (ko ? '이 브라우저에서는 이미 의견을 보냈어요.' : 'This browser has already submitted feedback.')
              : (ko ? '의견을 저장했어요. 고마워요!' : 'Your feedback is saved. Thank you!')}
          </h2>
          <a style={{ ...button, display: 'inline-block', background: '#a91e49', color: 'white' }} href={entryUrl('rate', locale)}>
            {ko ? '로그인하고 다른 사진도 평가하기' : 'Sign in to rate more photos'}
          </a>
        </>
      )}

      {error && (
        <div role="alert">
          <p>{messages[error]}</p>
          {!photo && !loading && (
            <button type="button" style={button} onClick={() => setAttempt(value => value + 1)}>
              {ko ? '사진 다시 불러오기' : 'Try loading again'}
            </button>
          )}
        </div>
      )}

      <footer style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, marginTop: 20, fontSize: 12 }}>
        <a href={`${home}?policy=privacy`}>{ko ? '개인정보 안내' : 'Privacy notice'}</a>
        <a href={`${home}?policy=safety`}>{ko ? '안전 안내' : 'Safety'}</a>
        {photo && (
          <button type="button" disabled={busy || reported} onClick={report}
            style={{ minHeight: 44, textDecoration: 'underline' }}>
            {reported ? (ko ? '신고 접수됨' : 'Report received') : (ko ? '사진 신고' : 'Report photo')}
          </button>
        )}
      </footer>
    </main>
  );
}
