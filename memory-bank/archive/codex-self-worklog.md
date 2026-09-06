# Codex 자율 실행 작업 기록

> 표기 규칙: `Codex셀프 완료`는 사용자 승인 완료와 구분되는, 코드·문서·자동 검증으로 독립 완료 가능한 범위다. 실제 사용자·외부 계정·결제·개인정보 처리·법률 판단이 필요한 작업은 완료로 기록하지 않는다.

| 번호 | 자율 작업 | 완료 근거 | 상태 |
| ---: | --- | --- | --- |
| 01 | 방문 이벤트 계약 | `visitor_opened` 이벤트 | Codex셀프 완료 |
| 02 | 가입 이벤트 계약 | `signup_completed` 이벤트 | Codex셀프 완료 |
| 03 | 첫 투표 이벤트 계약 | `first_vote` 이벤트 | Codex셀프 완료 |
| 04 | 반복 투표 이벤트 계약 | `vote_completed` 이벤트 | Codex셀프 완료 |
| 05 | 업로드 이벤트 계약 | `upload_completed` 이벤트 | Codex셀프 완료 |
| 06 | 결과 조회 이벤트 계약 | `result_viewed` 이벤트 | Codex셀프 완료 |
| 07 | 공유 요청 이벤트 계약 | `share_requested` 이벤트 | Codex셀프 완료 |
| 08 | 이벤트 데이터 최소화 | 사진·문구·핸들 미수집 | Codex셀프 완료 |
| 09 | 이벤트 보관 상한 | 최근 500건 제한 | Codex셀프 완료 |
| 10 | 로컬 QA 한국어 기본 | localhost 한국어 강제 | Codex셀프 완료 |
| 11 | 영어 쿼리 언어 선택 | `?locale=en` 지원 | Codex셀프 완료 |
| 12 | 헤더 언어 전환 | 한국어·영어 직접 전환 | Codex셀프 완료 |
| 13 | URL 상태 보존 | 언어 전환 시 post 유지 | Codex셀프 완료 |
| 14 | 브라우저 영어 제안 | 운영 환경 보조 신호 | Codex셀프 완료 |
| 15 | IP 추론 미사용 | 개인정보 경계 문서화 | Codex셀프 완료 |
| 16 | 언어 기본값 테스트 | localhost 테스트 | Codex셀프 완료 |
| 17 | 언어 우선순위 테스트 | URL 우선 테스트 | Codex셀프 완료 |
| 18 | 언어 URL 테스트 | 경로·쿼리 유지 테스트 | Codex셀프 완료 |
| 19 | 표본 10 기준 테스트 | 초기 경향 경계 | Codex셀프 완료 |
| 20 | 표본 30 기준 테스트 | 기본 결과 경계 | Codex셀프 완료 |
| 21 | 표본 100 기준 테스트 | 확장 표본 경계 | Codex셀프 완료 |
| 22 | YES 집계 테스트 | 선택 항목만 증가 | Codex셀프 완료 |
| 23 | NO 집계 테스트 | 긍정률 재계산 | Codex셀프 완료 |
| 24 | 나이 범위 검증 | 최소·최대 범위 차단 | Codex셀프 완료 |
| 25 | 나이 평균 계산 | 가중 평균 재계산 | Codex셀프 완료 |
| 26 | 중복 투표 차단 | `ALREADY_VOTED` 테스트 | Codex셀프 완료 |
| 27 | 실제 나이 비노출 | Aggregate 계약 테스트 | Codex셀프 완료 |
| 28 | 카테고리·평가 유형 분리 | BINARY·NUMERIC_AGE 계약 | Codex셀프 완료 |
| 29 | 제목 SEO | 한국어·영어 문서 제목 | Codex셀프 완료 |
| 30 | 설명 SEO | 언어별 description | Codex셀프 완료 |
| 31 | Open Graph 제목 | `og:title` | Codex셀프 완료 |
| 32 | Open Graph 설명 | `og:description` | Codex셀프 완료 |
| 33 | Open Graph URL | 현재 공유 URL 동기화 | Codex셀프 완료 |
| 34 | X 카드 타입 | `summary` 메타 | Codex셀프 완료 |
| 35 | X 제목·설명 | 공유용 메타 | Codex셀프 완료 |
| 36 | robots 정책 | index/follow 기본값 | Codex셀프 완료 |
| 37 | sitemap 제공 | 루트 URL sitemap | Codex셀프 완료 |
| 38 | 구조화 데이터 | WebApplication JSON-LD | Codex셀프 완료 |
| 39 | GEO 주관성 명시 | 객관 판단 아님을 JSON-LD 명시 | Codex셀프 완료 |
| 40 | SEO/GEO 백로그 등록 | SEO-01·GEO-SEO-01 | Codex셀프 완료 |
| 41 | 피드 표본 수 규칙 | 1~5장 카드 데이터 유지 | Codex셀프 완료 |
| 42 | 사진 중복 방지 규칙 | 자산 레지스트리 단일 배정 | Codex셀프 완료 |
| 43 | 7개 카테고리 표본 | 카테고리별 5카드 목업 | Codex셀프 완료 |
| 44 | 결과 Boost 경계 | 10~99 표본만 제안 | Codex셀프 완료 |
| 45 | Boost 결과 불변 원칙 | UI 안내 문구·이벤트 분리 | Codex셀프 완료 |
| 46 | iOS 복귀 헤더 방어 | pageshow·focus·viewport 복구 | Codex셀프 완료 |
| 47 | 메뉴 이동 스크롤 초기화 | 화면 상단 재배치 | Codex셀프 완료 |
| 48 | 코드 스타일 기본 검사 | `git diff --check` | Codex셀프 완료 |
| 49 | 자동 회귀 테스트 | Node 테스트 9건 | Codex셀프 완료 |
| 50 | 프로덕션 빌드 검증 | Vite production build | Codex셀프 완료 |
