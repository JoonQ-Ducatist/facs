import { useEffect, useRef, useState } from 'react';
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

/** Keeps Upload controls out of the root tab-swipe gesture on touch devices. */
function isolateTouch(event) {
  if (event.pointerType === 'touch') event.stopPropagation();
}

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
export default function UploadView({ categories, locale = 'ko', publicHandle = '', onSubmit, onMessage, onOpenProfile }) {
  const inputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const questionRef = useRef(null);
  const [media, setMedia] = useState([]);
  const [category, setCategory] = useState('Outfit');
  const [visibility, setVisibility] = useState('public');
  const [question, setQuestion] = useState('');
  const [shareActualAge, setShareActualAge] = useState(false);
  const [actualAge, setActualAge] = useState('');
  const [ageMin, setAgeMin] = useState('25');
  const [ageMax, setAgeMax] = useState('45');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [isDragActive, setIsDragActive] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [draggingMediaId, setDraggingMediaId] = useState(null);
  const [dragOverMediaId, setDragOverMediaId] = useState(null);
  const mediaDragRef = useRef(null);

  const imageCount = media.filter((item) => item.type === 'image').length;
  const videoCount = media.filter((item) => item.type === 'video').length;
  const selectedTheme = categories[category];
  const suggestions = getQuestionSuggestions(category, media, locale);
  const canAddImage = imageCount < MAX_IMAGES;
  const canAddVideo = videoCount < MAX_VIDEOS;
  const canAddMedia = canAddImage || canAddVideo;
  const canOpenDropzone = !media.length && canAddMedia;
  const acceptedTypes = [canAddImage && 'image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif', canAddVideo && 'video/mp4,video/quicktime'].filter(Boolean).join(',');

  /** 정의: 파일 형식·용량·개수·영상 길이를 확인해 미리보기 가능한 미디어 목록에 추가한다. @param {FileList|File[]} fileList 선택 또는 드롭된 파일 */
  async function addFiles(fileList) {
    const candidates = Array.from(fileList ?? []);
    if (!candidates.length) return;
    const accepted = [];
    let nextImages = imageCount;
    let nextVideos = videoCount;
    for (const file of candidates) {
      // Some mobile file providers omit both MIME and an extension. The input
      // is already constrained by `accept`, so keep a non-empty file as an
      // image candidate instead of silently dropping the user's selection.
      const type = detectMediaType(file) ?? (file.size > 0 ? 'image' : null);
      if (!type) { setError('이미지 또는 동영상 파일만 선택할 수 있습니다.'); continue; }
      if (file.size > MAX_FILE_SIZE) { setError('각 파일은 15MB 이하만 선택할 수 있습니다.'); continue; }
      if (type === 'image' && nextImages >= MAX_IMAGES) { setError(`이미지는 최대 ${MAX_IMAGES}개까지 선택할 수 있습니다.`); continue; }
      if (type === 'video' && nextVideos >= MAX_VIDEOS) { setError('동영상은 1개만 선택할 수 있습니다.'); continue; }
      if (type === 'video' && !supportsVideoFile(file)) { setError('이 동영상 형식은 현재 브라우저에서 재생할 수 없어요. H.264 MP4 또는 iPhone MOV를 선택해 주세요.'); continue; }
      const url = type === 'image' ? await getImagePreviewUrl(file) : URL.createObjectURL(file);
      if (!url) { setError(`${file.name || '선택한 이미지'}를 미리보기로 읽지 못했어요. 다른 형식으로 다시 선택해 주세요.`); continue; }
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
    else if (candidates.length) setError('선택한 파일을 읽지 못했어요. JPG, PNG, GIF, HEIC 또는 동영상 파일을 다시 선택해 주세요.');
    if (inputRef.current) inputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  }

  /** 정의: 파일 입력 이벤트를 한 곳에서 처리해 브라우저 파일 선택기 복귀 시에도 오류를 화면에 남긴다. */
  function handleFileChange(event) {
    void addFiles(event.currentTarget.files).catch(() => setError('파일을 읽는 중 문제가 생겼어요. 다시 선택해 주세요.'));
  }

  /** 정의: 미디어 제거 시 생성한 object URL도 해제한다. @param {string} id 미디어 ID */
  function removeMedia(id) { setMedia((items) => { const target = items.find((item) => item.id === id); if (target) URL.revokeObjectURL(target.url); return items.filter((item) => item.id !== id); }); }
  /** 정의: 선택한 미디어의 대표 노출 순서를 한 칸 이동한다. @param {number} index 현재 순서 @param {-1|1} direction 이동 방향 */
  function moveMedia(index, direction) { setMedia((items) => { const destination = index + direction; if (destination < 0 || destination >= items.length) return items; const next = [...items]; [next[index], next[destination]] = [next[destination], next[index]]; return next; }); }
  /** 정의: 드래그 완료 시 선택 미디어를 목표 썸네일 앞에 배치한다. */
  function reorderMedia(sourceId, targetId) {
    if (!sourceId || !targetId || sourceId === targetId) return;
    setMedia((items) => {
      const sourceIndex = items.findIndex((item) => item.id === sourceId);
      const targetIndex = items.findIndex((item) => item.id === targetId);
      if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return items;
      const next = [...items];
      const [moved] = next.splice(sourceIndex, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
  }
  function mediaTargetAtPoint(event) {
    const point = event.touches?.[0] ?? event.changedTouches?.[0] ?? event;
    const element = document.elementFromPoint(point.clientX, point.clientY);
    return element?.closest?.('[data-upload-media-id]')?.dataset.uploadMediaId ?? null;
  }
  function clearMediaTouchDrag() {
    const drag = mediaDragRef.current;
    if (drag?.timer) window.clearTimeout(drag.timer);
    mediaDragRef.current = null;
    setDraggingMediaId(null);
    setDragOverMediaId(null);
  }
  /** 정의: 모바일은 180ms 길게 누른 뒤에만 드래그를 시작해 일반적인 스크롤을 보존한다. */
  function beginMediaTouchDrag(id, event) {
    const isTouch = event.type === 'touchstart' || event.pointerType === 'touch';
    if (!isTouch || mediaDragRef.current) return;
    event.stopPropagation();
    event.preventDefault();
    const target = event.currentTarget;
    const point = event.touches?.[0] ?? event;
    const drag = { id, pointerId: event.pointerId, startX: point.clientX, startY: point.clientY, target, active: false, timer: null, pointerType: 'touch' };
    try { if (event.pointerId != null) target.setPointerCapture?.(event.pointerId); } catch { /* iOS Chrome may reject capture after a native gesture starts. */ }
    drag.timer = window.setTimeout(() => {
      if (mediaDragRef.current !== drag) return;
      drag.active = true;
      setDraggingMediaId(id);
      target.setPointerCapture?.(event.pointerId);
    }, 180);
    mediaDragRef.current = drag;
  }
  function moveMediaTouchDrag(event) {
    const drag = mediaDragRef.current;
    if (!drag || (event.type.startsWith('touch') ? drag.pointerType !== 'touch' : event.pointerId !== drag.pointerId)) return;
    event.stopPropagation();
    const point = event.touches?.[0] ?? event.changedTouches?.[0] ?? event;
    const movedDistance = Math.hypot(point.clientX - drag.startX, point.clientY - drag.startY);
    if (!drag.active && movedDistance > 8) {
      clearMediaTouchDrag();
      return;
    }
    if (!drag.active) return;
    event.preventDefault();
    setDragOverMediaId(mediaTargetAtPoint(event));
  }
  function endMediaTouchDrag(event) {
    const drag = mediaDragRef.current;
    if (!drag || (event.type.startsWith('touch') ? drag.pointerType !== 'touch' : event.pointerId !== drag.pointerId)) return;
    event.stopPropagation();
    if (drag.active) {
      event.preventDefault();
      reorderMedia(drag.id, mediaTargetAtPoint(event));
    }
    clearMediaTouchDrag();
  }
  function startNativeMediaDrag(id, event) {
    event.stopPropagation();
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', id);
    setDraggingMediaId(id);
  }
  function overNativeMediaDrag(id, event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setDragOverMediaId(id);
  }
  function dropNativeMedia(id, event) {
    event.preventDefault();
    reorderMedia(event.dataTransfer.getData('text/plain') || draggingMediaId, id);
    setDraggingMediaId(null);
    setDragOverMediaId(null);
  }
  function endNativeMediaDrag() {
    setDraggingMediaId(null);
    setDragOverMediaId(null);
  }
  /** 정의: 추천 문장을 비우고 직접 작성할 수 있도록 질문 입력창에 포커스한다. */
  function clearQuestion() { setQuestion(''); setFieldErrors((errors) => ({ ...errors, question: undefined })); window.requestAnimationFrame(() => questionRef.current?.focus()); }
  /** 추천 선택은 모바일 키보드를 자동으로 열지 않아 선택한 문장이 가려지지 않게 한다. */
  function chooseQuestionSuggestion(suggestion) {
    setQuestion(suggestion);
    setFieldErrors((errors) => ({ ...errors, question: undefined }));
    const isTouchDevice = window.matchMedia?.('(pointer: coarse)').matches || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (!isTouchDevice) window.requestAnimationFrame(() => questionRef.current?.focus());
  }
  /** Keeps the focused question field above a mobile software keyboard without moving the page canvas. */
  function revealQuestionInput() {
    const reveal = () => {
      const input = questionRef.current;
      const scrollArea = input?.closest('.editorial-main--scroll');
      if (!input || !scrollArea || document.activeElement !== input) return;
      const viewportBottom = (window.visualViewport?.height ?? window.innerHeight) - 16;
      const safeTop = 58;
      const bounds = input.getBoundingClientRect();
      const delta = bounds.bottom > viewportBottom ? bounds.bottom - viewportBottom : bounds.top < safeTop ? bounds.top - safeTop : 0;
      if (Math.abs(delta) > 1) scrollArea.scrollBy({ top: delta, behavior: 'smooth' });
    };
    window.requestAnimationFrame(reveal);
    window.setTimeout(reveal, 120);
    window.setTimeout(reveal, 280);
  }
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
      const result = await onSubmit({ author: publicHandle, category, evaluationType: selectedTheme.evaluationType ?? 'BINARY', visibility, question: question.trim() || (isAgeEvaluation ? '사람들은 저를 몇 살로 볼까요?' : '첫인상에서 호감과 신뢰감이 느껴지나요?'), subtext: isAgeEvaluation ? '참여자가 느낀 주관적인 첫인상을 모으고 있어요.' : '실시간 첫인상 피드백을 수집 중입니다', imageUrl: primary.url, mediaType: primary.type, media, objectPosition: 'center 20%', yesVotes: 0, noVotes: 0, ageMin: isAgeEvaluation ? parsedAgeMin : undefined, ageMax: isAgeEvaluation ? parsedAgeMax : undefined, ageEstimate: isAgeEvaluation ? 0 : undefined, ageVoteCount: isAgeEvaluation ? 0 : undefined, actualAgeProvided, timestamp: '방금 전', isMyUpload: true, commentsAllowed: true, comments: [], categoryIcon: selectedTheme.icon });
      if (!result?.ok) {
        setError(result?.message ?? (locale === 'en' ? 'Your photo could not be uploaded. Please try again.' : '사진을 업로드하지 못했어요. 다시 시도해 주세요.'));
        return;
      }
    } catch {
      setError(locale === 'en' ? 'Your photo could not be uploaded. Please try again.' : '사진을 업로드하지 못했어요. 다시 시도해 주세요.');
    } finally {
      setIsPublishing(false);
    }
  }

  return <section className="editorial-upload w-full pb-3 pt-1">
    <PageHeading eyebrow="CREATE A LOOKBOOK" title="새로운 룩 공유하기" description="사진 최대 5개와 10초 이하 동영상 1개를 함께 선택할 수 있습니다." action={<button type="button" onClick={openCamera} aria-label="카메라로 촬영하기" className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#c5a059]/50 bg-[#fbf9f4] text-cyan-glow"><span className="material-symbols-outlined text-lg">add_a_photo</span></button>} />
    <form className="flex flex-col gap-3.5" onSubmit={submit} onPointerDown={isolateTouch} onPointerUp={isolateTouch} onPointerCancel={isolateTouch}>
      <div role={canOpenDropzone ? 'button' : undefined} tabIndex={canOpenDropzone ? 0 : undefined} onClick={() => canOpenDropzone && inputRef.current?.click()} onKeyDown={(event) => { if (canOpenDropzone && (event.key === 'Enter' || event.key === ' ')) inputRef.current?.click(); }} onDragEnter={(event) => { if (canAddMedia) { event.preventDefault(); setIsDragActive(true); } }} onDragOver={(event) => canAddMedia && event.preventDefault()} onDragLeave={(event) => { if (event.currentTarget === event.target) setIsDragActive(false); }} onDrop={(event) => { event.preventDefault(); setIsDragActive(false); if (canAddMedia) addFiles(event.dataTransfer.files); }} className={`relative min-h-[190px] w-full overflow-hidden rounded-lg border border-dashed p-4 transition-colors ${isDragActive ? 'border-[#5f9f9a] bg-[#eaf5f2]' : 'border-[#c5a059]/60 bg-white'} ${canOpenDropzone ? 'cursor-pointer hover:bg-[#f5f3ee]' : 'cursor-default'}`}>
        <input id="upload-media-input" ref={inputRef} type="file" multiple accept={acceptedTypes} className="sr-only" onChange={handleFileChange} />
        <input id="upload-camera-input" ref={cameraInputRef} type="file" accept="image/*,video/*" capture="environment" className="sr-only" onChange={handleFileChange} />
        {!media.length ? <div className="flex min-h-[164px] flex-col items-center justify-center text-center"><span className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg border border-[#c5a059]/50 bg-[#f9f7f2] text-cyan-glow"><span className="material-symbols-outlined text-2xl">upload_file</span></span><p className="font-headline text-sm font-bold text-white">사진 또는 짧은 동영상 선택</p><p className="mt-1 font-mono text-[11px] text-slate-400">이미지 5개 + 동영상 1개 · 동영상 최대 10초 · 파일당 15MB</p><label htmlFor="upload-media-input" onClick={(event) => event.stopPropagation()} className="mt-3 cursor-pointer rounded-full border border-[#c4c6cd] bg-white px-3 py-1.5 text-[12px] font-medium text-cyan-glow">로컬 디바이스에서 파일 찾기</label><span className="mt-2 hidden text-[11px] text-[#5f9f9a] sm:block">파일을 이 영역에 끌어다 놓아도 바로 추가할 수 있어요</span></div> : <><div className="mb-2 flex items-center justify-between text-[11px] font-mono"><span className="text-slate-300">이미지 <strong style={{ color: selectedTheme.color }}>{imageCount}/{MAX_IMAGES}</strong> · 동영상 <strong style={{ color: selectedTheme.color }}>{videoCount}/{MAX_VIDEOS}</strong></span><span className="text-slate-500">{canAddImage ? '사진 또는 동영상을 추가할 수 있어요' : canAddVideo ? '동영상 1개를 더 추가할 수 있어요' : '최대 선택 완료'}</span></div><div className="grid grid-cols-3 gap-2 sm:grid-cols-4">{media.map((item, index) => <MediaPreview key={item.id} item={item} index={index} color={selectedTheme.color} onRemove={() => removeMedia(item.id)} onMove={(direction) => moveMedia(index, direction)} canMovePrevious={index > 0} canMoveNext={index < media.length - 1} isDragging={draggingMediaId === item.id} isDragOver={dragOverMediaId === item.id} onTouchStart={beginMediaTouchDrag} onTouchMove={moveMediaTouchDrag} onTouchEnd={endMediaTouchDrag} onTouchCancel={clearMediaTouchDrag} onNativeDragStart={startNativeMediaDrag} onNativeDragOver={overNativeMediaDrag} onNativeDrop={dropNativeMedia} onNativeDragEnd={endNativeMediaDrag} />)}{canAddImage && <button type="button" onClick={(event) => { event.stopPropagation(); inputRef.current?.click(); }} aria-label="사진 추가" className="flex aspect-square items-center justify-center rounded-lg border border-dashed border-[#c5a059]/60 bg-[#f9f7f2] text-cyan-glow"><span className="material-symbols-outlined text-xl">add</span></button>}{canAddVideo && <button type="button" onClick={(event) => { event.stopPropagation(); inputRef.current?.click(); }} aria-label="동영상 추가" className="flex aspect-square items-center justify-center rounded-lg border border-dashed border-[#c5a059]/60 bg-[#f9f7f2] text-cyan-glow"><span className="material-symbols-outlined text-xl">videocam</span></button>}</div></>}
      </div>
      <fieldset><legend className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-300">1. 카테고리 선택</legend><div className="upload-category-grid grid grid-cols-3 gap-2">{Object.entries(categories).map(([id, item]) => <button key={id} type="button" onPointerDown={isolateTouch} onPointerUp={isolateTouch} onPointerCancel={isolateTouch} onClick={() => setCategory(id)} className="flex min-w-0 items-center justify-center gap-1 rounded-md border px-2 py-2 font-body text-xs transition-all" style={category === id ? { borderColor: item.color, color: item.color, backgroundColor: `${item.color}14`, fontWeight: 700 } : { borderColor: '#c4c6cd', color: '#44474c', backgroundColor: '#ffffff' }}><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border" style={{ borderColor: item.color, color: item.color }}><span className="material-symbols-outlined text-[13px]">{item.icon}</span></span><span>{item.label}</span></button>)}</div></fieldset>
      <fieldset className="rounded-lg border border-[#ddd8cd] bg-[#f5f3ee] p-3"><legend className="px-1 text-[11px] font-bold uppercase tracking-wider text-[#74777d]">2. 공개 범위</legend><div role="radiogroup" aria-label="공개 범위" className="grid grid-cols-2 gap-2"><VisibilityChoice selected={visibility === 'public'} icon="public" label="전체 공개" description="피드에서 누구나 볼 수 있어요." onSelect={() => setVisibility('public')} /><VisibilityChoice selected={visibility === 'followers'} icon="group" label="팔로워만" description="나와 나를 팔로우한 사람만 볼 수 있어요." onSelect={() => setVisibility('followers')} /></div></fieldset>
      <div><label htmlFor="question-input" className="mb-1 block text-[12px] font-bold uppercase tracking-wider text-slate-300">3. 어떤 점을 평가받고 싶나요?</label><div className="mb-2 rounded-lg bg-[#f5f3ee] p-2.5"><p className="mb-1.5 font-mono text-[11px] text-slate-400">{selectedTheme.label} · {media.length ? '선택한 사진·영상에 맞춰 제안하는 질문' : '사진을 올리면 상황에 맞게 다듬어지는 추천 질문'}</p><div className="upload-question-suggestions flex flex-wrap gap-1.5">{suggestions.map((suggestion) => <button key={suggestion} type="button" onClick={() => chooseQuestionSuggestion(suggestion)} style={{ borderColor: question === suggestion ? selectedTheme.color : '#c4c6cd', color: question === suggestion ? selectedTheme.color : '#44474c', backgroundColor: question === suggestion ? `${selectedTheme.color}12` : '#ffffff' }} className="rounded-md border px-2 py-1.5 text-left text-[12px] transition-colors">{suggestion}</button>)}</div></div><div className="relative"><textarea ref={questionRef} id="question-input" rows="2" value={question} maxLength="140" onPointerDown={(event) => event.stopPropagation()} onClick={() => questionRef.current?.focus()} onFocus={revealQuestionInput} onChange={(event) => { setQuestion(event.target.value); setFieldErrors((errors) => ({ ...errors, question: undefined })); }} aria-invalid={Boolean(fieldErrors.question)} aria-describedby={fieldErrors.question ? 'question-error' : undefined} placeholder="예: 오늘 이 룩, 저와 잘 어울리나요?" className="upload-question-input w-full resize-none rounded-md border border-surface-container-high bg-white p-2.5 pr-32 text-sm text-white placeholder:text-slate-500 focus:border-cyan-glow focus:outline-none" />{question && <button type="button" onClick={clearQuestion} className="absolute right-2 top-2 rounded-full px-2 py-1 text-[12px] text-slate-500 transition-colors hover:bg-[#f5f3ee] hover:text-[#1b1c19]">지우고 다시 작성</button>}</div>{fieldErrors.question && <p id="question-error" role="alert" className="mt-1 text-xs text-[#9b5c55]">{fieldErrors.question}</p>}</div>
      {selectedTheme.evaluationType === 'NUMERIC_AGE' && <><fieldset className="rounded-lg border border-[#ff0050]/25 bg-[#ff0050]/[0.04] p-3"><legend className="px-1 text-[11px] font-bold text-[#d90043]">4. 평가 나이 범위</legend><p className="mb-2 text-[10px] text-slate-500">평가자는 이 범위 안에서 슬라이더와 ± 버튼으로 예상 나이를 선택합니다.</p><div className="grid grid-cols-2 gap-2"><label className="text-[11px] font-semibold text-[#44474c]">최소 나이<input type="number" min="18" max="98" value={ageMin} onChange={(event) => { setAgeMin(event.target.value); setFieldErrors((errors) => ({ ...errors, ageRange: undefined })); }} className="mt-1 w-full rounded-md border border-[#c4c6cd] bg-white px-3 py-2 text-sm text-[#1b1c19] focus:border-[#ff0050] focus:outline-none" /></label><label className="text-[11px] font-semibold text-[#44474c]">최대 나이<input type="number" min="19" max="99" value={ageMax} onChange={(event) => { setAgeMax(event.target.value); setFieldErrors((errors) => ({ ...errors, ageRange: undefined })); }} className="mt-1 w-full rounded-md border border-[#c4c6cd] bg-white px-3 py-2 text-sm text-[#1b1c19] focus:border-[#ff0050] focus:outline-none" /></label></div>{fieldErrors.ageRange && <p role="alert" className="mt-1 text-xs text-[#9b5c55]">{fieldErrors.ageRange}</p>}</fieldset><fieldset className="rounded-lg border border-[#ff0050]/25 bg-[#ff0050]/[0.04] p-3"><legend className="px-1 text-[11px] font-bold text-[#d90043]">5. 실제 나이 비교 (선택)</legend><label className="flex items-start gap-2 text-xs text-[#44474c]"><input type="checkbox" checked={shareActualAge} onChange={(event) => setShareActualAge(event.target.checked)} className="mt-0.5 accent-[#ff0050]" />결과에서만 실제 나이와 비교하기</label><p className="mt-1 text-[10px] leading-relaxed text-slate-500">실제 나이는 평가자·프로필·피드에 공개되지 않으며, 본인 결과 비교에만 사용됩니다.</p>{shareActualAge && <input type="number" min="18" max="99" value={actualAge} onChange={(event) => setActualAge(event.target.value)} placeholder="실제 나이 (18~99)" className="mt-2 w-full rounded-md border border-[#c4c6cd] bg-white px-3 py-2 text-sm text-[#1b1c19] focus:border-[#ff0050] focus:outline-none" />}</fieldset></>}
      <div><p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-300">{selectedTheme.evaluationType === 'NUMERIC_AGE' ? '6.' : '4.'} {locale === 'en' ? 'Posting ID' : '게시 아이디'}</p><div className="flex items-center gap-2 rounded-xl border border-surface-container-high bg-surface-container px-3 py-2 text-xs text-white sm:text-sm"><span className="material-symbols-outlined text-[16px] text-cyan-glow">person</span><span className="font-semibold">@{publicHandle}</span><button type="button" onClick={onOpenProfile} className="ml-auto shrink-0 text-[10px] font-semibold text-cyan-glow underline underline-offset-2 hover:text-white">{locale === 'en' ? 'Change in Profile' : '프로필에서 변경'}</button></div></div>
      {error && <p role="alert" aria-live="assertive" className="text-xs text-[#9b5c55]">{error}</p>}
      <button type="submit" disabled={isPublishing} className="ui-primary-action mt-1 flex w-full items-center justify-center gap-1.5 rounded-lg border border-[#0e1c2d] bg-primary-container py-2 font-body text-sm font-bold text-white shadow-[0_4px_20px_rgba(0,0,0,.08)] active:scale-95 disabled:cursor-wait disabled:opacity-65"><span className="material-symbols-outlined text-base">{isPublishing ? 'progress_activity' : 'arrow_upward'}</span>{isPublishing ? '사진을 저장하고 있어요...' : '피드에 업로드하기'}</button>
      <p className="text-center text-[10px] text-slate-500">선택한 사진은 안전하게 저장된 뒤 공개 피드에 등록됩니다.</p>
    </form>
  </section>;
}

/** 정의: File 객체를 화면 미리보기·정렬에 필요한 표준 미디어 항목으로 변환한다. */
function makeItem(file, url, type, duration = 0) {
  return { id: `${file.name}-${file.lastModified}-${Math.random()}`, file, url, type, duration, name: file.name, size: `${(file.size / (1024 * 1024)).toFixed(2)} MB` };
}
/** Makes the full visibility card a reliable touch target instead of relying on a hidden input label. */
function VisibilityChoice({ selected, icon, label, description, onSelect }) {
  return <button type="button" role="radio" aria-checked={selected} onPointerDown={isolateTouch} onPointerUp={isolateTouch} onPointerCancel={isolateTouch} onClick={onSelect} className={`min-h-[76px] rounded-md border p-2.5 text-left transition-colors ${selected ? 'border-[#c5a059] bg-[#fbf9f4] shadow-[0_2px_8px_rgba(0,0,0,.05)]' : 'border-[#d4d0c8] bg-[#e8e8e6] hover:bg-[#eeeeec]'}`}><span className={`flex items-center gap-1.5 text-xs font-bold ${selected ? 'text-[#1b1c19]' : 'text-[#5d6065]'}`}><span className={`material-symbols-outlined text-[16px] ${selected ? 'text-cyan-glow' : 'text-[#74777d]'}`}>{icon}</span>{label}</span><span className={`mt-1 block text-[10px] leading-relaxed ${selected ? 'text-[#5b5e63]' : 'text-[#777a7f]'}`}>{description}</span></button>;
}
function detectMediaType(file) {
  const mime = (file.type ?? '').toLowerCase();
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  const extension = (file.name ?? '').toLowerCase().split('.').pop();
  if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'heic', 'heif'].includes(extension)) return 'image';
  if (['mp4', 'webm', 'mov', 'quicktime'].includes(extension)) return 'video';
  return null;
}
function resolveClientVideoMime(file) {
  const supplied = String(file?.type ?? '').trim().toLowerCase();
  if (supplied) return supplied;
  const extension = String(file?.name ?? '').trim().toLowerCase().split('.').pop();
  return { mp4: 'video/mp4', mov: 'video/quicktime', quicktime: 'video/quicktime' }[extension] ?? 'video/mp4';
}
function supportsVideoFile(file) {
  const mime = resolveClientVideoMime(file);
  if (!['video/mp4', 'video/quicktime'].includes(mime)) return false;
  const probe = document.createElement('video');
  return Boolean(probe.canPlayType(mime));
}
/** 정의: 모바일 파일 제공자에서도 안정적으로 표시되도록 이미지 미리보기를 data URL로 읽는다. */
function getImagePreviewUrl(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
}
/** 정의: 미디어 썸네일, 순서 변경, 제거를 한 단위로 제공하는 선택 항목이다. */
function MediaPreview({ item, index, color, onRemove, onMove, canMovePrevious, canMoveNext, isDragging, isDragOver, onTouchStart, onTouchMove, onTouchEnd, onTouchCancel, onNativeDragStart, onNativeDragOver, onNativeDrop, onNativeDragEnd }) {
  const [previewError, setPreviewError] = useState(false);
  const [videoPoster, setVideoPoster] = useState('');
  useEffect(() => {
    let cancelled = false;
    if (item.type !== 'video') return undefined;
    createVideoPoster(item.url).then((poster) => {
      if (!cancelled && poster) setVideoPoster(poster);
    });
    return () => { cancelled = true; };
  }, [item.type, item.url]);
  function isolateMediaControlTouch(event) {
    if (event.pointerType === 'touch') event.stopPropagation();
  }
  return <div data-upload-media-id={item.id} draggable onPointerDown={(event) => onTouchStart(item.id, event)} onPointerMove={onTouchMove} onPointerUp={onTouchEnd} onPointerCancel={onTouchCancel} onTouchStart={(event) => onTouchStart(item.id, event)} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd} onTouchCancel={onTouchCancel} onContextMenu={(event) => event.preventDefault()} onDragStart={(event) => onNativeDragStart(item.id, event)} onDragOver={(event) => onNativeDragOver(item.id, event)} onDrop={(event) => onNativeDrop(item.id, event)} onDragEnd={onNativeDragEnd} className={`media-preview relative aspect-square overflow-hidden rounded-xl border bg-black/30${isDragging ? ' media-preview--dragging' : ''}${isDragOver ? ' media-preview--drag-over' : ''}`} style={{ borderColor: `${color}66` }}>
    {previewError && item.type === 'image' ? <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-[#f5f3ee] px-2 text-center text-[#74777d]"><span className="material-symbols-outlined text-2xl">insert_photo</span><span className="max-w-full truncate text-[9px]">{item.name}</span></div> : item.type === 'video' ? <video className="h-full w-full object-cover" src={item.url} poster={videoPoster || undefined} muted playsInline preload="metadata" draggable="false" onError={() => {}} /> : <img className="h-full w-full object-cover" src={item.url} alt={`${index + 1}번째 선택 이미지`} draggable="false" onError={() => setPreviewError(true)} />}
    {item.type === 'video' && <time dateTime={`PT${Math.max(0, Number(item.duration) || 0).toFixed(1)}S`} className="upload-video-duration">{formatVideoDuration(item.duration)}</time>}<div className="absolute left-1 top-1 z-20 flex gap-1"><button type="button" disabled={!canMovePrevious} onPointerDown={isolateMediaControlTouch} onPointerUp={isolateMediaControlTouch} onPointerCancel={isolateMediaControlTouch} onClick={(event) => { event.stopPropagation(); onMove(-1); }} aria-label={`${item.name} 순서 앞으로`} className="upload-media-control upload-media-control--move disabled:opacity-25"><span className="material-symbols-outlined text-[17px]">chevron_left</span></button><button type="button" disabled={!canMoveNext} onPointerDown={isolateMediaControlTouch} onPointerUp={isolateMediaControlTouch} onPointerCancel={isolateMediaControlTouch} onClick={(event) => { event.stopPropagation(); onMove(1); }} aria-label={`${item.name} 순서 뒤로`} className="upload-media-control upload-media-control--move disabled:opacity-25"><span className="material-symbols-outlined text-[17px]">chevron_right</span></button></div><button type="button" onPointerDown={isolateMediaControlTouch} onPointerUp={isolateMediaControlTouch} onPointerCancel={isolateMediaControlTouch} onClick={(event) => { event.stopPropagation(); onRemove(); }} aria-label={`${item.name} 제거`} className="upload-media-control upload-media-control--remove absolute right-1 top-1 z-20"><span className="material-symbols-outlined text-[17px]">close</span></button></div>;
}
/** 정의: 비디오 메타데이터를 비동기로 읽어 10초 제한 검증에 사용할 재생 시간을 반환한다. @param {string} url object URL */
function getVideoDuration(url) { return new Promise((resolve) => { const video = document.createElement('video'); let settled = false; const finish = (duration) => { if (settled) return; settled = true; window.clearTimeout(timeout); video.removeAttribute('src'); video.load(); resolve(duration); }; const timeout = window.setTimeout(() => finish(Number.NaN), 6000); video.preload = 'metadata'; video.onloadedmetadata = () => finish(Number.isFinite(video.duration) ? video.duration : Number.NaN); video.onerror = () => finish(Number.NaN); video.src = url; video.load(); }); }
function createVideoPoster(url) { return new Promise((resolve) => { const video = document.createElement('video'); const canvas = document.createElement('canvas'); let settled = false; const finish = (poster = '') => { if (settled) return; settled = true; window.clearTimeout(timeout); video.removeAttribute('src'); video.load(); resolve(poster); }; const capture = () => { try { if (!video.videoWidth || !video.videoHeight) return finish(''); canvas.width = video.videoWidth; canvas.height = video.videoHeight; const context = canvas.getContext('2d'); context?.drawImage(video, 0, 0, canvas.width, canvas.height); finish(canvas.toDataURL('image/jpeg', .82)); } catch { finish(''); } }; const timeout = window.setTimeout(() => finish(''), 6000); video.preload = 'auto'; video.muted = true; video.playsInline = true; video.onloadeddata = capture; video.onerror = () => finish(''); video.src = url; video.load(); }); }
function formatVideoDuration(seconds) { const total = Math.max(0, Math.round(Number(seconds) || 0)); const minutes = Math.floor(total / 60); return `${minutes}:${String(total % 60).padStart(2, '0')}`; }
