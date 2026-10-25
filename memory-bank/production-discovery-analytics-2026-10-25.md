# DISC-02 / ANA-04 운영 검색·GA4 보완 (2026-10-25)

사용자 요청: 영어/한국어 SEO·GEO, HTML 메타, robots/sitemap, GA4 점검과 보완.
기존 DISC-01/ANA-01 완료 이력과 구분한 후속이다. 로컬 수정·집중 검증 완료이며
아직 커밋·push·운영 배포하지 않았다. 기존 문서 커밋 `6367000`은 보존했다.

## 실제 운영 관측 — 미디어 요청 0회

| 대상 | 결과 |
| --- | --- |
| `/`, `/ko/` | 모두 200·canonical/hreflang 존재. KO는 lang/메타만 한국어, 초기 본문·h1은 영어 |
| robots.txt | 200 text/plain, Sitemap이 상대경로여서 표준의 완전한 URL 요구와 불일치 |
| sitemap.xml | 200 XML, 영어·한국어 2 URL 및 상호 hreflang 정상 |
| robot.txt | SPA HTML 200. 표준 이름은 robots.txt이며 별도 singular 파일을 만들지 않음 |
| 리디렉트 | HTTP www→HTTPS 308, HTTPS apex→www 307. /ko HEAD 200 |
| 공유 아이콘·manifest | HEAD 200, image/png·application/manifest+json |

Search Console의 기존 `https://www.factsmack.com/` 속성 확인:
사이트맵 제출 10월 12일, 마지막 읽음 10월 22일, 성공·발견 2개.
색인 생성 2개, 제외 1개의 이유는 ‘적절한 표준 태그가 포함된 대체 페이지’다.
이를 오류로 오인해 재등록/검증/중복 제출하지 않았다. Naver/Bing의 현재 콘솔이나
검색어별 순위·AI 인용 여부는 새로 검증하지 않았다.

GA4 속성 557370310 / stream 16043397486(FACt.Smack Web)은 공개 번들의
측정 ID `G-MXK6W58WK9`와 일치한다. 홈 지난 7일 집계는 사용자 4·조회수 67·
세션 20이며 accounts.google.com/referral이 18세션이었다. 순수 마케팅 유입이나
신규 가입자로 해석하지 않는다. 동시에 스트림은 **최근 48시간 데이터 미수신 /
데이터 수집 활성화되지 않음** 경고를 표시했다. 과거 집계/실시간 카드와 구분하며
현재 실제 collect 수신 성공을 입증한 것으로 보고하지 않는다. 자동 측정은 사용 중.
증거: `/private/tmp/facs-ga4-stream-audit-2026-10-25.png`.

## 로컬 보완

### DISC-02

- robots의 Sitemap을 `https://www.factsmack.com/sitemap.xml`로 수정.
- 한·영 설명형 title·description·OG/X 메타, 이미지 크기/alt 보완.
  이번 SEO 요청에 맞춰 런타임 title도 브랜드만의 짧은 값에서 설명형으로 바꾼다.
- `discoveryContent.js`를 서비스 소개·FAQ의 정본으로 두고 실제 로그인 화면과
  빌드된 정적 HTML에 동일한 언어별 사실을 제공. real en/ko 링크를 함께 제공한다.
- KO 생성기가 메타만 번역하던 결함을 실제 초기 본문·FAQ·title·WebPage JSON-LD까지
  번역하도록 수정. 영어 출력도 같은 pure helper로 정규화한다. 필수 필드 누락 시 실패.
- Organization/WebSite/WebApplication·기존 canonical/hreflang/x-default 및 모든
  Google/Naver 검증 토큰 보존. locale별 WebPage 추가, 언어 전환 때 메타와 동기화.
- FAQ는 실제 보이는 details이며 FAQPage/AggregateRating은 추가하지 않는다.
  UGC sitemap 추가·RLS/로그인/정책 제한·AI 생성 주장·별점 조작·유료 도구 없음.

### ANA-04

- 기존 첫 평가 분기가 first_vote만 보내 전체 vote_completed 건수에서 빠졌다.
  GA4에서 첫 평가에 두 기존 이벤트를 전송하고 이후 평가는 vote_completed만 전송.
  서버 분석·실제 투표·중복 평가 방지는 변경하지 않는다.
- HTTPS 운영 www/apex에서만 GA4를 초기화하여 localhost/Preview 혼입을 막는다.
- 보고 URL은 기존 고지대로 루트, page_title은 브랜드로 고정. referrer는 origin만
  허용하여 query/hash/인증 코드/검색어 노출을 줄인다. Google 인증·정확한 운영
  Supabase에서 돌아온 경우에만 ignore_referrer를 추가한다. 일반 검색 referrer는 유지.
- 태그 초기화/이벤트 예외를 호출부로 전파하지 않아 투표·업로드를 중단하지 않는다.
  광고 차단기 우회나 수신 보장 기능은 아니다.
- 회원/게시물 ID·이메일·질문·signed URL·새 자유 입력 속성 없음.
  Signals/광고 개인화 꺼짐·기존 자동 측정 유지·보존 설정은 변경하지 않았다.

## 검증과 남은 확인

선택 Node **5건 통과**: 정적 en/ko·schema·robots 계약 1, 런타임 메타 1,
GA4 운영 호스트/ID 게이트 1, 첫 평가·허용 이벤트·URL 보호 1, referrer/안전 실패 1.
최종 메타 보완 후 같은 5건으로 확인했다. AuthEntryView 단일 JSX 변환·diff check 통과.
전체 테스트/build/Preview/DB/미디어 다운로드·실제 업로드·평가 QA·새 배포는 없음.

배포 승인 후 기존 문서 커밋과 함께 main Git 배포 1회. 배포 직전 운영 대상 대조,
배포 뒤 en/ko 초기 HTML·robots 각 1회 및 GA4 실제 page_view 수신/경고 확인 필요.
로컬 검증으로 운영 수신이나 검색 재색인 완료를 대신하지 않는다. 사이트맵 재제출,
새 소유권 등록, 호스팅 리디렉트/404 전면 변경은 이번에 실행하지 않았다.

기존 의미/수집 경계도 기록한다:
- signup_completed는 ‘세션의 첫 인증 완료’이며 실제 신규 가입 수가 아니다.
- React state 탭 이동별 virtual page_view는 직접 전송하지 않는다. screen parameter와
  수집 안내를 늘리는 변경은 기존 루트 URL/제한 이벤트 정책과 별도 합의가 필요하다.
- UTM query도 기존 보고 URL에서 제거된다. 캠페인 필드를 별도 전송하는 수집 확대는 없음.
- 이번 수신 경고의 정확한 원인(방문 부재·차단·태그 실행/전송)은 아직 미확정이다.
  광고 차단/프라이버시 보호를 우회하거나 미수신 경고 해소를 선행 주장하지 않는다.

## 공식 근거

- https://developers.google.com/search/docs/specialty/international/localized-versions
- https://developers.google.com/search/docs/appearance/title-link
- https://developers.google.com/crawling/docs/robots-txt/robots-txt-spec
- https://developers.google.com/search/docs/appearance/ai-features
- https://developers.google.com/analytics/devguides/collection/ga4/single-page-applications
- https://support.google.com/analytics/answer/10327750

Gemini는 최신 외부 지침의 짧은 조사 1회에만 사용. robots로 개인정보 보호,
noarchive의 포괄 AI 차단, 구조화 데이터가 AI 포함의 필수조건이라는 제안은 채택하지
않았다. 직접 확인한 Google 원문은 기본 SEO·색인/스니펫 적격성을 말하며 특별 AI
파일/schema나 노출 보장은 없다. 구현·QA·Git·배포는 위임하지 않았다.
