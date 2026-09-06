/** 정의: 브라우저 목업용 카드 데이터를 localStorage에 격리하는 개발 전용 저장소다. */
import { initialCards } from '../data/cards.js';

// 정의: 서울 카테고리 앨범 목업을 별도 버전으로 보관해 이전 개발 목업을 덮어쓰지 않는다.
const STORAGE_KEY = 'facs_cards_v8';

/** 정의: 저장된 카드가 있으면 읽고, 없거나 손상됐으면 초기 목업을 반환한다. @returns {Array<object>} 개발 전용 카드 목록 */
export function loadCards() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return initialCards;
    const cards = JSON.parse(stored);
    return cards;
  } catch {
    return initialCards;
  }
}

/** 정의: 카드 목록을 개발용 localStorage에 저장한다. @param {Array<object>} cards 저장할 카드 목록 */
export function saveCards(cards) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
}
