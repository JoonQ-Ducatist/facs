import { useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';

/** A separate view selector: the existing Feed button keeps its navigation action. */
export default function FeedViewMenu({ locale = 'en', mode = 'all', wide = false, onSelect }) {
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState({ left: 0, top: 0 });
  const trigger = useRef(null);
  const en = locale === 'en';
  const title = en ? 'Feed view' : '피드 보기';
  function changeOpen(value) {
    if (value && wide) {
      const rect = trigger.current?.getBoundingClientRect();
      if (rect) setAnchor({ left: Math.max(8, Math.min(window.innerWidth - 308, rect.right + 12)), top: Math.max(8, Math.min(window.innerHeight - 260, rect.top)) });
    }
    setOpen(value);
  }
  const options = [
    { id: 'all', label: en ? 'All photos' : '전체 피드' },
    { id: 'waiting', label: en ? 'Needs feedback' : '평가가 적은 사진', description: en ? 'Public photos with 10 or fewer ratings that you have not rated.' : '평가 10개 이하인 공개 사진 중 아직 평가하지 않은 사진' },
  ];
  return <Dialog.Root open={open} onOpenChange={changeOpen}>
    <Dialog.Trigger asChild><button ref={trigger} type="button" className="feed-view-trigger" aria-label={`${title}: ${options.find(option => option.id === mode)?.label ?? options[0].label}`}><span aria-hidden="true">{en ? 'View' : '보기'}⌄{mode === 'waiting' ? '·' : ''}</span></button></Dialog.Trigger>
    <Dialog.Portal>
      <Dialog.Overlay className={`feed-view-overlay${wide ? ' feed-view-overlay--wide' : ''}`} />
      <Dialog.Content className={`feed-view-picker${wide ? ' feed-view-picker--wide' : ''}`} style={wide ? anchor : undefined} aria-describedby="feed-view-hint">
        <div className="feed-view-picker__heading"><Dialog.Title>{title}</Dialog.Title><Dialog.Close asChild><button type="button" aria-label={en ? 'Close feed view' : '피드 보기 닫기'}>×</button></Dialog.Close></div>
        <p id="feed-view-hint">{en ? 'Your selected category stays the same.' : '선택한 카테고리는 그대로 유지돼요.'}</p>
        <div role="group" aria-label={title}>{options.map(option => <button key={option.id} type="button" aria-pressed={mode === option.id} onClick={() => { onSelect(option.id); setOpen(false); }}><span>{option.label}</span><span aria-hidden="true">{mode === option.id ? '✓' : ''}</span>{option.description && <small>{option.description}</small>}</button>)}</div>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}
