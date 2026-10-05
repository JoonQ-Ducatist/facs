# 공개 MVP 발견성과 분석 계획

작성일: 2026-10-05

이 문서는 검색 순위를 보장하거나 자동 생성 콘텐츠를 늘리기 위한 문서가 아니다.
검색·AI 응답·공유 미리보기가 서비스의 실제 성격을 정확히 이해하도록 하고, 공개 MVP의
유입과 핵심 여정을 최소한으로 관찰하기 위한 출시 전 작업 기록이다.

## 1. 현재 확인된 기반

- `robots.txt`, `sitemap.xml`, 한·영 기본 title/description, Open Graph·X 메타와
  `WebApplication` JSON-LD는 이미 제공한다.
- 공개 피드의 사용자 게시물은 개인정보와 UGC 위험 때문에 색인 단위로 추가하지 않는다.
- 서버 퍼널 이벤트와 관리자 전용 합계 RPC는 이미 있고, GA4는 아직 연결하지 않았다.

## 2. 검색어·질문 묶음

아래는 키워드 삽입 목록이 아니라 페이지 제목·설명·도움말·FAQ의 실제 사용자 언어 후보이다.
문맥과 맞지 않거나 결과를 객관적 판단처럼 보이게 하는 표현은 사용하지 않는다.

| 목적 | 한국어 후보 | 영어 후보 | 적용 위치 |
| --- | --- | --- | --- |
| 서비스 발견 | 사진 피드백, 사진 평가, 사람들의 주관적 평가 | photo feedback, community photo feedback | 홈 title·description·소개 |
| 스타일 | 오늘의 룩 평가, 스타일 피드백, 코디 피드백 | outfit feedback, style feedback | 카테고리 안내 |
| 첫인상 | 첫인상 피드백, 프로필 사진 피드백 | first impression feedback, profile photo feedback | 도움말·공유 설명 |
| 연령 인상 | 몇 살로 보여?, 나이 들어 보이나요? | how old do I look, perceived age feedback | 연령 카테고리 안내와 안전 문구 |
| 질문형 AEO/GEO | 사진에 대한 피드백을 어떻게 받을 수 있나요?, 오늘의 룩에 대한 다양한 시선을 받을 수 있나요? | How can I get feedback on a photo?, How can I get feedback on my outfit? | 사람 우선 FAQ |

## 3. 출시 전 구현 단위

| ID | 범위 | 완료 기준 | 외부 의존성 |
| --- | --- | --- | --- |
| DISC-01 | SEO·AEO·GEO | canonical URL, 브랜드·서비스 설명 JSON-LD, 한·영 공유 메타, 사람 우선 FAQ·안전 문구를 실제 페이지와 일치시킨다. Search Console·Naver Search Advisor에 sitemap을 등록한다 | Google/Naver 소유권 확인 |
| ANA-01 | GA4 수집 | 동의 후에만 GA4를 초기화하고 `page_view`, 로그인, 업로드 완료, 첫 평가, 결과 조회, 공유 요청만 익명 이벤트로 전송한다. 이메일·공개 아이디·사진 URL·원문 질문은 보내지 않는다 | GA4 속성·측정 ID, 분석 동의와 정식 처리방침 |
| ANA-02 | 관리자 분석 뷰 | admin 역할만 MAU/DAU, 신규 가입, 활성 업로더·평가자, 이탈 구간, 유입 경로의 집계만 본다. 원문 사용자 식별자나 콘텐츠는 노출하지 않는다 | GA4 Data API 서비스 계정 또는 서버 전용 조회 자격 증명 |
| BRAND-01 | 파비콘 | 기존 승인 나방 심벌로 16/32/180/192/512 아이콘과 manifest를 제공하고 모든 브라우저 탭·홈 화면에서 확인한다 | 없음 |
| PROF-01 | 프로필 사진·소개 | 본인만 변경 가능한 프로필 이미지와 160자 이내 소개를 Storage·RLS·입력 검증으로 저장하고 프로필 카드에 표시한다 | 운영 Supabase 마이그레이션·Storage 정책 적용 |

## 4. 근거

- Google은 사용자에게 도움이 되는 원본·신뢰 가능한 내용을 우선하며, 키워드 반복을 권장하지 않는다. https://developers.google.com/search/docs/fundamentals/creating-helpful-content
- 검색은 명확한 제목·설명, 크롤러가 접근 가능한 자원, sitemap과 정확한 구조화 데이터를 권장한다. https://developers.google.com/search/docs/fundamentals/seo-starter-guide
- GA4는 이벤트 기반 수집이며, 관리자 화면의 실제 지표 조회에는 Google Analytics Data API가 필요하다. https://developers.google.com/analytics/devguides/collection/ga4/events

