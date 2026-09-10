import { useRef, useState } from 'react';
import PageHeading from '../../components/ui/PageHeading.jsx';

/** 정의: 게시물 하나에 허용하는 이미지·동영상·파일 크기의 클라이언트 사전 검증 한도다. */
const MAX_IMAGES = 5;
const MAX_VIDEOS = 1;
const MAX_FILE_SIZE = 15 * 1024 * 1024;
/** 정의: 카테고리별로 항상 네 개를 제공하는 평가 질문 추천 사전이다. */
const questionSuggestions = {
  Outfit: ['오늘 이 스타일, 괜찮아 보여요?', '새로 산 이 옷, 저와 잘 어울리나요?', '이 룩에서 제 분위기가 잘 느껴지나요?', '오늘의 Look Book, 가장 매력적인 포인트는 무엇인가요?'],
  PerceivedAge: ['사람들이 보는 저는 몇 살쯤일까요?', '이 사진의 저는 실제보다 어려 보이나요?', '헤어와 메이크업이 만드는 첫인상 나이가 궁금해요.', '이 사진을 보면 사람들은 제 나이를 어떻게 추측할까요?'],
  Date: ['첫 만남이라면 호감이 가나요?', '데이트에서 편안하고 매력적인 인상이 들까요?', '이 스타일이 저와 잘 어울려 보이나요?', '상대가 기억할 만한 분위기로 보이나요?'],
  Fitness: ['건강하고 매력적인 인상을 주나요?', '운동하기에 편안하면서도 스타일 있어 보이나요?', '오늘의 운동 스타일, 자신감 있어 보이나요?', '활기찬 에너지가 사진에서 느껴지나요?'],
  Work: ['직장에서 좋은 첫인상을 줄 것 같나요?', '오늘의 출근 룩, 깔끔하고 센스 있어 보이나요?', '이 룩에서 신뢰감이 느껴지나요?', '전문적이면서도 친근한 인상인가요?'],
  SocialProfile: ['이 사진, SNS 프로필로 매력적으로 보이나요?', '이 사진에서 제 분위기가 잘 드러나나요?', '처음 보는 사람에게 좋은 인상을 줄 것 같나요?', '프로필 첫 화면에서 시선이 머무를 사진인가요?'],
};
const englishQuestionSuggestions = {
  Outfit: ['Does this look work for today?', 'Does this new outfit suit me?', 'Does this look express my vibe?', 'What is the most appealing part of today’s look?'],
  PerceivedAge: ['How old do I look to people?', 'Do I look younger than my age here?', 'What age impression do my hair and makeup create?', 'What age would people guess from this photo?'],
  Date: ['Would this make a lovely first impression?', 'Do I look comfortable and appealing for a date?', 'Does this style suit me?', 'Would this be a memorable look?'],
  Fitness: ['Does this look feel healthy and confident?', 'Does this workout look feel comfortable and stylish?', 'Does today’s workout look feel confident?', 'Can you feel the active energy in this photo?'],
  Work: ['Would this make a great first impression at work?', 'Does today’s work look feel polished?', 'Does this look feel trustworthy?', 'Does it feel professional and approachable?'],
  SocialProfile: ['Does this work as an appealing profile photo?', 'Does this photo express my vibe?', 'Would this make a good first impression?', 'Would this photo stand out on a profile?'],
};

/** 정의: 카테고리와 선택한 미디어 유형·수에 따라 첫 추천 질문을 조정한다. @param {string} category 카테고리 ID @param {Array<object>} media 선택 미디어 */
function getQuestionSuggestions(category, media, locale) {
  const source = locale === 'en' ? englishQuestionSuggestions : questionSuggestions;
  const base = source[category] ?? source.Outfit;
  if (!media.length) return base;
  if (locale === 'en') {
    const mediaHint = media.some((item) => item.type === 'video') ? 'Does my vibe in this short video' : media.length > 1 ? 'Does my vibe across these photos' : 'Does my vibe in this photo';
    const endings = { Outfit: 'feel fresh and well styled?', PerceivedAge: 'suggest a younger first impression?', Date: 'make a good first impression?', Fitness: 'feel healthy and confident?', Work: 'feel professional and trustworthy?', SocialProfile: 'work for a profile?' };
    return [`${mediaHint} ${endings[category] ?? endings.Outfit}`, ...base.slice(1)];
  }
  const mediaHint = media.some((item) => item.type === 'video') ? '짧은 영상에서 보이는 제 분위기는' : media.length > 1 ? '여러 장의 사진에서 보이는 제 분위기는' : '이 사진에서 보이는 제 분위기는';
  const visualLead = {
    Outfit: `${mediaHint} 산뜻하고 잘 어울려 보이나요?`,
    PerceivedAge: `${mediaHint} 사람들은 저를 몇 살쯤으로 느낄까요?`,
    Date: `${mediaHint} 첫 만남에 호감을 줄 것 같나요?`,
    Fitness: `${mediaHint} 건강하고 자신감 있어 보이나요?`,
    Work: `${mediaHint} 신뢰감 있는 첫인상으로 보이나요?`,
    SocialProfile: `${mediaHint} 프로필 첫 화면에 어울리나요?`,
  };
  return [visualLead[category] ?? visualLead.Outfit, ...base.slice(1)];
}

/** 정의: 복수 미디어 선택·정렬·질문 입력·사전 검증을 제공하는 개발용 업로드 화면이다. 실제 저장·검토는 백엔드 단계에서 처리한다. */
export default function UploadView({ categories, locale = 'ko', publicHandle = '', onSubmit, onMessage }) {
  const inputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const questionRef = useRef(null);
  const [media, setMedia] = useState([]);
  const [category, setCategory] = useState('Outfit');
  const [question, setQuestion] = useState('');
  const [shareActualAge, setShareActualAge] = useState(false);
  const [actualAge, setActualAge] = useState('');
  const [ageMin, setAgeMin] = useState('25');
  const [ageMax, setAgeMax] = useState('45');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [isDragActive, setIsDragActive] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  const imageCount = media.filter((item) => item.type === 'image').length;
  const videoCount = media.filter((item) => item.type === 'video').length;
  const selectedTheme = categories[category];
  const suggestions = getQuestionSuggestions(category, media, locale);
  const canAddImage = imageCount < MAX_IMAGES;
  const canAddVideo = videoCount < MAX_VIDEOS;
  const canAddMedia = canAddImage || canAddVideo;
  const acceptedTypes = [canAddImage && 'image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif', canAddVideo && 'video/mp4,video/webm,video/quicktime'].filter(Boolean).join(',');

  /** 정의: 파일 형식·용량·개수·영상 길이를 확인해 미리보기 가능한 미디어 목록에 추가한다. @param {FileList|File[]} fileList 선택 또는 드롭된 파일 */
  async function addFiles(fileList) {
    const candidates = Array.from(fileList ?? []);
    if (!candidates.length) return;
    const accepted = [];
    let nextImages = imageCount;
    let nextVideos = videoCount;
    for (const file of candidates) {
      const type = detectMediaType(file);
      if (!type) { setError('이미지 또는 동영상 파일만 선택할 수 있습니다.'); continue; }
      if (file.size > MAX_FILE_SIZE) { setError('각 파일은 15MB 이하만 선택할 수 있습니다.'); continue; }
      if (type === 'image' && nextImages >= MAX_IMAGES) { setError(`이미지는 최대 ${MAX_IMAGES}개까지 선택할 수 있습니다.`); continue; }
      if (type === 'video' && nextVideos >= MAX_VIDEOS) { setError('동영상은 1개만 선택할 수 있습니다.'); continue; }
      const url = URL.createObjectURL(file);
      if (type === 'video') {
        const duration = await getVideoDuration(url);
        if (!Number.isFinite(duration) || duration > 10) { URL.revokeObjectURL(url); setError('동영상은 10초 이하만 업로드할 수 있습니다.'); continue; }
        nextVideos += 1;
        accepted.push(makeItem(file, url, type, duration));
      } else {
        nextImages += 1;
        accepted.push(makeItem(file, url, type));
      }
    }
    if (accepted.length) { setMedia((items) => [...items, ...accepted]); setError(''); }
    if (inputRef.current) inputRef.current.value = '';
  }

  /** 정의: 미디어 제거 시 생성한 object URL도 해제한다. @param {string} id 미디어 ID */
  function removeMedia(id) { setMedia((items) => { const target = items.find((item) => item.id === id); if (target) URL.revokeObjectURL(target.url); return items.filter((item) => item.id !== id); }); }
  /** 정의: 선택한 미디어의 대표 노출 순서를 한 칸 이동한다. @param {number} index 현재 순서 @param {-1|1} direction 이동 방향 */
  function moveMedia(index, direction) { setMedia((items) => { const destination = index + direction; if (destination < 0 || destination >= items.length) return items; const next = [...items]; [next[index], next[destination]] = [next[destination], next[index]]; return next; }); }
  /** 정의: 추천 문장을 비우고 직접 작성할 수 있도록 질문 입력창에 포커스한다. */
  function clearQuestion() { setQuestion(''); setFieldErrors((errors) => ({ ...errors, question: undefined })); window.requestAnimationFrame(() => questionRef.current?.focus()); }
  /** 정의: 모바일은 capture 입력을 열고, PC는 촬영 기능 안내 토스트를 표시한다. */
  function openCamera() {
    const isMobile = window.matchMedia?.('(pointer: coarse)').matches || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (!isMobile) { onMessage?.('카메라 촬영은 모바일 환경에서 사용할 수 있는 기능이에요.'); return; }
    cameraInputRef.current?.click();
  }
  /** 정의: 닉네임·질문·미디어 조건을 검사한 뒤 UI용 새 카드 데이터를 부모에 전달한다. @param {SubmitEvent} event 폼 제출 이벤트 */
  async function submit(event) {
    event.preventDefault();
    const nextFieldErrors = {};
    if (question.trim() && question.trim().length < 4) nextFieldErrors.question = '질문은 4자 이상으로 작성하거나 추천 질문을 선택해 주세요.';
    const isAgeEvaluation = selectedTheme.evaluationType === 'NUMERIC_AGE';
    const parsedAgeMin = Number(ageMin);
    const parsedAgeMax = Number(ageMax);
    if (isAgeEvaluation && (!Number.isInteger(parsedAgeMin) || !Number.isInteger(parsedAgeMax) || parsedAgeMin < 18 || parsedAgeMax > 99 || parsedAgeMin >= parsedAgeMax)) nextFieldErrors.ageRange = '최소·최대 나이는 18~99세 사이이며 최소가 최대보다 작아야 해요.';
    setFieldErrors(nextFieldErrors);
    if (Object.keys(nextFieldErrors).length) return;
    if (!media.length) { setError('사진 또는 동영상을 선택해 주세요.'); inputRef.current?.click(); return; }
    const primary = media[0];
    const actualAgeProvided = shareActualAge && Number.isInteger(Number(actualAge));
    setIsPublishing(true);
    try {
      await onSubmit({ author: publicHandle, category, evaluationType: selectedTheme.evaluationType ?? 'BINARY', question: question.trim() || (isAgeEvaluation ? '사람들은 저를 몇 살로 볼까요?' : '첫인상에서 호감과 신뢰감이 느껴지나요?'), subtext: isAgeEvaluation ? '참여자가 느낀 주관적인 첫인상을 모으고 있어요.' : '실시간 첫인상 피드백을 수집 중입니다', imageUrl: primary.url, mediaType: primary.type, media, objectPosition: 'center 20%', yesVotes: 0, noVotes: 0, ageMin: isAgeEvaluation ? parsedAgeMin : undefined, ageMax: isAgeEvaluation ? parsedAgeMax : undefined, ageEstimate: isAgeEvaluation ? 0 : undefined, ageVoteCount: isAgeEvaluation ? 0 : undefined, actualAgeProvided, timestamp: '방금 전', isMyUpload: true, commentsAllowed: true, comments: [], categoryIcon: selectedTheme.icon });
    } finally {
      setIsPublishing(false);
    }
  }

  return <section className="editorial-upload w-full pb-3 pt-1">
    <PageHeading eyebrow="CREATE A LOOKBOOK" title="새로운 룩 공유하기" description="사진 최대 5개와 10초 이하 동영상 1개를 함께 선택할 수 있습니다." action={<button type="button" onClick={openCamera} aria-label="카메라로 촬영하기" className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#c5a059]/50 bg-[#fbf9f4] text-cyan-glow"><span className="material-symbols-outlined text-lg">add_a_photo</span></button>} />
    <form className="flex flex-col gap-3.5" onSubmit={submit}>
      <div role={canAddMedia ? 'button' : undefined} tabIndex={canAddMedia ? 0 : undefined} onClick={() => canAddMedia && inputRef.current?.click()} onKeyDown={(event) => { if (canAddMedia && (event.key === 'Enter' || event.key === ' ')) inputRef.current?.click(); }} onDragEnter={(event) => { if (canAddMedia) { event.preventDefault(); setIsDragActive(true); } }} onDragOver={(event) => canAddMedia && event.preventDefault()} onDragLeave={(event) => { if (event.currentTarget === event.target) setIsDragActive(false); }} onDrop={(event) => { event.preventDefault(); setIsDragActive(false); if (canAddMedia) addFiles(event.dataTransfer.files); }} className={`relative min-h-[190px] w-full overflow-hidden rounded-lg border border-dashed p-4 transition-colors ${isDragActive ? 'border-[#5f9f9a] bg-[#eaf5f2]' : 'border-[#c5a059]/60 bg-white'} ${canAddMedia ? 'cursor-pointer hover:bg-[#f5f3ee]' : 'cursor-default'}`}>
        <input ref={inputRef} type="file" multiple accept={acceptedTypes} className="hidden" onChange={(event) => addFiles(event.target.files)} />
        <input ref={cameraInputRef} type="file" accept="image/*,video/*" capture="environment" className="hidden" onChange={(event) => addFiles(event.target.files)} />
        {!media.length ? <div className="flex min-h-[164px] flex-col items-center justify-center text-center"><span className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg border border-[#c5a059]/50 bg-[#f9f7f2] text-cyan-glow"><span className="material-symbols-outlined text-2xl">upload_file</span></span><p className="font-headline text-sm font-bold text-white">사진 또는 짧은 동영상 선택</p><p className="mt-1 font-mono text-[11px] text-slate-400">이미지 5개 + 동영상 1개 · 동영상 최대 10초 · 파일당 15MB</p><span className="mt-3 rounded-full border border-[#c4c6cd] bg-white px-3 py-1.5 text-[12px] font-medium text-cyan-glow">로컬 디바이스에서 파일 찾기</span><span className="mt-2 hidden text-[11px] text-[#5f9f9a] sm:block">파일을 이 영역에 끌어다 놓아도 바로 추가할 수 있어요</span></div> : <><div className="mb-2 flex items-center justify-between text-[11px] font-mono"><span className="text-slate-300">이미지 <strong style={{ color: selectedTheme.color }}>{imageCount}/{MAX_IMAGES}</strong> · 동영상 <strong style={{ color: selectedTheme.color }}>{videoCount}/{MAX_VIDEOS}</strong></span><span className="text-slate-500">{canAddMedia ? '클릭 또는 드롭하여 추가' : '최대 선택 완료'}</span></div><div className="grid grid-cols-3 gap-2 sm:grid-cols-4">{media.map((item, index) => <MediaPreview key={item.id} item={item} index={index} color={selectedTheme.color} onRemove={() => removeMedia(item.id)} onMove={(direction) => moveMedia(index, direction)} canMovePrevious={index > 0} canMoveNext={index < media.length - 1} />)}{canAddMedia && <button type="button" onClick={(event) => { event.stopPropagation(); inputRef.current?.click(); }} aria-label="미디어 추가" className="flex aspect-square items-center justify-center rounded-lg border border-dashed border-[#c5a059]/60 bg-[#f9f7f2] text-cyan-glow"><span className="material-symbols-outlined text-xl">add</span></button>}</div></>}
      </div>
      <fieldset><legend className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-300">1. 카테고리 선택</legend><div className="upload-category-grid grid grid-cols-3 gap-2">{Object.entries(categories).map(([id, item]) => <button key={id} type="button" onClick={() => setCategory(id)} className="flex min-w-0 items-center justify-center gap-1 rounded-md border px-2 py-2 font-body text-xs transition-all" style={category === id ? { borderColor: item.color, color: item.color, backgroundColor: `${item.color}14`, fontWeight: 700 } : { borderColor: '#c4c6cd', color: '#44474c', backgroundColor: '#ffffff' }}><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border" style={{ borderColor: item.color, color: item.color }}><span className="material-symbols-outlined text-[13px]">{item.icon}</span></span><span>{item.label}</span></button>)}</div></fieldset>
      <div><label htmlFor="question-input" className="mb-1 block text-[12px] font-bold uppercase tracking-wider text-slate-300">2. 어떤 점을 평가받고 싶나요?</label><div className="mb-2 rounded-lg bg-[#f5f3ee] p-2.5"><p className="mb-1.5 font-mono text-[11px] text-slate-400">{selectedTheme.label} · {media.length ? '선택한 사진·영상에 맞춰 제안하는 질문' : '사진을 올리면 상황에 맞게 다듬어지는 추천 질문'}</p><div className="flex flex-wrap gap-1.5">{suggestions.map((suggestion) => <button key={suggestion} type="button" onClick={() => { setQuestion(suggestion); setFieldErrors((errors) => ({ ...errors, question: undefined })); }} style={{ borderColor: question === suggestion ? selectedTheme.color : '#c4c6cd', color: question === suggestion ? selectedTheme.color : '#44474c', backgroundColor: question === suggestion ? `${selectedTheme.color}12` : '#ffffff' }} className="rounded-md border px-2 py-1.5 text-left text-[12px] transition-colors">{suggestion}</button>)}</div></div><div className="relative"><textarea ref={questionRef} id="question-input" rows="2" value={question} maxLength="140" onChange={(event) => { setQuestion(event.target.value); setFieldErrors((errors) => ({ ...errors, question: undefined })); }} aria-invalid={Boolean(fieldErrors.question)} aria-describedby={fieldErrors.question ? 'question-error' : undefined} placeholder="예: 오늘 이 룩, 저와 잘 어울리나요?" className="w-full resize-none rounded-md border border-surface-container-high bg-white p-2.5 pr-32 text-sm text-white placeholder:text-slate-500 focus:border-cyan-glow focus:outline-none" />{question && <button type="button" onClick={clearQuestion} className="absolute right-2 top-2 rounded-full px-2 py-1 text-[12px] text-slate-500 transition-colors hover:bg-[#f5f3ee] hover:text-[#1b1c19]">지우고 다시 작성</button>}</div>{fieldErrors.question && <p id="question-error" role="alert" className="mt-1 text-xs text-[#9b5c55]">{fieldErrors.question}</p>}</div>
      {selectedTheme.evaluationType === 'NUMERIC_AGE' && <><fieldset className="rounded-lg border border-[#ff0050]/25 bg-[#ff0050]/[0.04] p-3"><legend className="px-1 text-[11px] font-bold text-[#d90043]">3. 평가 나이 범위</legend><p className="mb-2 text-[10px] text-slate-500">평가자는 이 범위 안에서 슬라이더와 ± 버튼으로 예상 나이를 선택합니다.</p><div className="grid grid-cols-2 gap-2"><label className="text-[11px] font-semibold text-[#44474c]">최소 나이<input type="number" min="18" max="98" value={ageMin} onChange={(event) => { setAgeMin(event.target.value); setFieldErrors((errors) => ({ ...errors, ageRange: undefined })); }} className="mt-1 w-full rounded-md border border-[#c4c6cd] bg-white px-3 py-2 text-sm text-[#1b1c19] focus:border-[#ff0050] focus:outline-none" /></label><label className="text-[11px] font-semibold text-[#44474c]">최대 나이<input type="number" min="19" max="99" value={ageMax} onChange={(event) => { setAgeMax(event.target.value); setFieldErrors((errors) => ({ ...errors, ageRange: undefined })); }} className="mt-1 w-full rounded-md border border-[#c4c6cd] bg-white px-3 py-2 text-sm text-[#1b1c19] focus:border-[#ff0050] focus:outline-none" /></label></div>{fieldErrors.ageRange && <p role="alert" className="mt-1 text-xs text-[#9b5c55]">{fieldErrors.ageRange}</p>}</fieldset><fieldset className="rounded-lg border border-[#ff0050]/25 bg-[#ff0050]/[0.04] p-3"><legend className="px-1 text-[11px] font-bold text-[#d90043]">4. 실제 나이 비교 (선택)</legend><label className="flex items-start gap-2 text-xs text-[#44474c]"><input type="checkbox" checked={shareActualAge} onChange={(event) => setShareActualAge(event.target.checked)} className="mt-0.5 accent-[#ff0050]" />결과에서만 실제 나이와 비교하기</label><p className="mt-1 text-[10px] leading-relaxed text-slate-500">실제 나이는 평가자·프로필·피드에 공개되지 않으며, 본인 결과 비교에만 사용됩니다.</p>{shareActualAge && <input type="number" min="18" max="99" value={actualAge} onChange={(event) => setActualAge(event.target.value)} placeholder="실제 나이 (18~99)" className="mt-2 w-full rounded-md border border-[#c4c6cd] bg-white px-3 py-2 text-sm text-[#1b1c19] focus:border-[#ff0050] focus:outline-none" />}</fieldset></>}
      <div><p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-300">{selectedTheme.evaluationType === 'NUMERIC_AGE' ? '5.' : '3.'} 게시 아이디</p><div className="flex items-center gap-2 rounded-xl border border-surface-container-high bg-surface-container px-3 py-2 text-xs text-white sm:text-sm"><span className="material-symbols-outlined text-[16px] text-cyan-glow">person</span><span className="font-semibold">@{publicHandle}</span><span className="ml-auto text-[10px] text-slate-400">프로필에서 변경</span></div></div>
      {error && <p role="alert" aria-live="assertive" className="text-xs text-[#9b5c55]">{error}</p>}
      <button type="submit" disabled={isPublishing} className="ui-primary-action mt-1 flex w-full items-center justify-center gap-1.5 rounded-lg border border-[#0e1c2d] bg-primary-container py-2 font-body text-sm font-bold text-white shadow-[0_4px_20px_rgba(0,0,0,.08)] active:scale-95 disabled:cursor-wait disabled:opacity-65"><span className="material-symbols-outlined text-base">{isPublishing ? 'progress_activity' : 'arrow_upward'}</span>{isPublishing ? '사진을 저장하고 있어요...' : '피드에 업로드하기'}</button>
      <p className="text-center text-[10px] text-slate-500">선택한 사진은 안전하게 저장된 뒤 공개 피드에 등록됩니다.</p>
    </form>
  </section>;
}

/** 정의: File 객체를 화면 미리보기·정렬에 필요한 표준 미디어 항목으로 변환한다. */
function detectMediaType(file) {
  const mime = (file.type ?? '').toLowerCase();
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  const extension = (file.name ?? '').toLowerCase().split('.').pop();
  if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'heic', 'heif'].includes(extension)) return 'image';
  if (['mp4', 'webm', 'mov', 'quicktime'].includes(extension)) return 'video';
  return null;
}
/** 정의: 미디어 썸네일, 순서 변경, 제거를 한 단위로 제공하는 선택 항목이다. */
function MediaPreview({ item, index, color, onRemove, onMove, canMovePrevious, canMoveNext }) {
  const [previewError, setPreviewError] = useState(false);
  return <div className="relative aspect-square overflow-hidden rounded-xl border bg-black/30" style={{ borderColor: `${color}66` }}>
    {previewError ? <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-[#f5f3ee] px-2 text-center text-[#74777d]"><span className="material-symbols-outlined text-2xl">insert_photo</span><span className="max-w-full truncate text-[9px]">{item.name}</span></div> : item.type === 'video' ? <video className="h-full w-full object-cover" src={item.url} muted playsInline onError={() => setPreviewError(true)} /> : <img className="h-full w-full object-cover" src={item.url} alt={`${index + 1}번째 선택 이미지`} onError={() => setPreviewError(true)} />}
    <span className="absolute bottom-1 left-1 rounded bg-black/65 px-1.5 py-0.5 font-mono text-[9px] text-white">{item.type === 'video' ? `VIDEO ${item.duration.toFixed(1)}s` : `IMAGE ${index + 1}`}</span><div className="absolute left-1 top-1 flex gap-0.5"><button type="button" disabled={!canMovePrevious} onClick={(event) => { event.stopPropagation(); onMove(-1); }} aria-label={`${item.name} 순서 앞으로`} className="flex h-5 w-5 items-center justify-center rounded bg-black/65 text-white disabled:opacity-25"><span className="material-symbols-outlined text-[13px]">chevron_left</span></button><button type="button" disabled={!canMoveNext} onClick={(event) => { event.stopPropagation(); onMove(1); }} aria-label={`${item.name} 순서 뒤로`} className="flex h-5 w-5 items-center justify-center rounded bg-black/65 text-white disabled:opacity-25"><span className="material-symbols-outlined text-[13px]">chevron_right</span></button></div><button type="button" onClick={(event) => { event.stopPropagation(); onRemove(); }} aria-label={`${item.name} 제거`} className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded bg-black/65 text-white"><span className="material-symbols-outlined text-[13px]">close</span></button></div>;
}
/** 정의: 비디오 메타데이터를 비동기로 읽어 10초 제한 검증에 사용할 재생 시간을 반환한다. @param {string} url object URL */
function getVideoDuration(url) { return new Promise((resolve) => { const video = document.createElement('video'); video.preload = 'metadata'; video.onloadedmetadata = () => resolve(video.duration); video.onerror = () => resolve(Number.NaN); video.src = url; }); }
