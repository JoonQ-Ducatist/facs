# FACt.Smack 아키텍처

> 기준 문서: service-design-rule.md, TECH-AGENTS.md, 90-day-cash-loop-plan.md, progress.md

## 1. 현재 실행 구조

현재 활성 실행 화면은 Vite가 제공하는 React 기반 Feed 전환본이다. 기존 UI 기준을 보존하며 `index.html`이 `src/main.jsx`를 로드한다. 브라우저 저장소는 개발용 목업에만 사용한다.

~~~
브라우저
  └─ index.html
      ├─ src/main.jsx               # React 진입점
      ├─ src/App.jsx                # 헤더·피드·내비게이션 상태 조합
      ├─ src/features/feed/         # 현재 전환된 Feed 화면
      └─ assets/images/             # 검증 기준 샘플 이미지
~~~

### 현재 핵심 파일 역할

| 파일·디렉터리 | 역할 | 주의점 |
| --- | --- | --- |
| index.html | React mount 지점과 Tailwind CDN 설정 | 현재 UI 기준의 실제 엔트리 포인트다. |
| src/App.jsx | 헤더·하단 내비게이션과 React Feed 상태 | Upload·Ranking·Profile은 Feed 검증 후 순차 전환한다. |
| src/features/feed/FeedView.jsx | 카테고리 필터, 카드 탐색, 목업 투표와 결과 UI | 기존 Feed UI 동등성을 사용자 수동 검증으로 확인한다. |
| src/styles/global.css | React 전용 최소 전역 스타일과 모션 | UI 기준 변경은 사용자 요청 후에만 한다. |
| assets/images/ | 기존 샘플 카드 이미지 | 사용자 사진이나 비밀 정보를 넣지 않는다. |
| dist/ | Vite 빌드 산출물 | 소스가 아니라 빌드 결과이며, 현재 활성 HTML과 다를 수 있다. |
| memory-bank/ | 서비스·기술·계획·진행 기준 문서 | 구현과 같은 변경 흐름에서 최신화한다. |

## 2. 현재 UI 규칙

- 메인 카드 헤더는 좌측 카테고리, 우측 사용자 ID, 그 아래 질문 순서다.
- 카테고리 색상은 피드 헤더·배지·탐색 제어·YES/NO 버튼·YES 결과 막대에 연결한다.
- YES는 카테고리 색상의 채움형 주 동작, NO는 같은 색상의 윤곽선형 보조 동작이다.
- 메인 피드 카드의 외곽선은 rounded-xl 수준의 작은 라운드를 사용한다.
- 수동 테스트 결과는 2026-08-23 기준 **적합**이다.

## 3. React 전환 구조

React Feed는 현재 활성화됐으며 프로덕션 빌드를 통과했다. 기존 프로토타입과의 화면·동작 동등성은 사용자 수동 검증 대기 중이며, Upload·Ranking·Profile 전환은 그 결과가 `적합`일 때만 시작한다.

~~~
src/
├─ main.jsx                   # React 진입점
├─ App.jsx                    # 앱 조합
├─ data/cards.js              # 목업 카드 데이터
├─ services/cardStore.js      # 개발용 카드 저장 어댑터
├─ features/
│  ├─ feed/FeedView.jsx       # 피드 화면 초안
│  ├─ upload/UploadView.jsx   # 업로드 화면 초안
│  ├─ ranking/RankingView.jsx # 랭킹 화면 초안
│  └─ profile/ProfileView.jsx # 프로필 화면 초안
└─ styles/global.css          # React 전용 전역 스타일 초안
~~~

## 4. 목표 구조와 경계

~~~
React UI → 서비스 어댑터 → 인증된 API → DB / 객체 스토리지 / 비동기 작업
~~~

- React 화면은 표시·입력·상태 표현에 집중한다.
- 서비스 어댑터만 API 통신을 담당한다.
- API가 인증·인가·입력 검증·중복 투표 방지·집계를 책임진다.
- 객체 스토리지와 DB는 브라우저에서 직접 접근하지 않는다. 업로드는 짧은 수명 서명 URL만 사용한다.
- 원본과 파생본은 `uploads/{UTC-YYYY}/{MM}/{DD}/{image|video}/{postId}/{assetId}/...`로 분리 저장하고, 사용자 식별 정보는 객체 키에 포함하지 않는다. 검색·보존·삭제는 DB의 Media 레코드가 기준이다.
- 관리자 UI는 일반 사용자 UI와 라우트·권한을 분리하며, 카테고리 설정과 미디어 최적화·보존 정책 변경은 관리자 API와 감사 로그를 통해서만 처리한다.
- 실제 백엔드는 P1 정책이 확정됐으므로 React 전환 단계의 사용자 검증 완료 후 인증·권한부터 시작할 수 있다.

## 5. 다음 작업 시작 기준

1. 이 문서와 progress.md의 ‘적합’ 검증 기록을 확인한다.
2. feature-backlog.md에서 이번 작업의 범위·의존성·검증 기준을 확인한다.
3. React 엔트리 포인트 전환 범위와 기존 UI 동등성 기준을 합의한다.
4. Feed, Upload, Ranking, Profile을 한 화면씩 전환하고 수동 테스트·빌드·테스트 도구 검증을 기록한다.
5. Feed 사용자 검증이 `적합`이 되기 전에는 Upload·Ranking·Profile의 React 전환을 시작하지 않는다.
6. 관리자 기능은 백엔드 기반 이후에 카테고리 관리와 미디어 처리·저장 정책부터 단계적으로 구현한다.

## 6. 변경 기록

| 날짜 | 변경 | 이유 |
| --- | --- | --- |
| 2026-08-23 | architecture.md 생성 | 수동 테스트 ‘적합’ 후 현재 실행 구조와 목표 React 구조, 다음 전환 경계를 명확히 하기 위해 |
| 2026-08-25 | React Feed 활성 전환 및 미디어 객체 스토리지 경계 반영 | UI 동등성 검증과 향후 이미지·동영상 보관 구조를 현재 아키텍처 기준에 맞추기 위해 |
