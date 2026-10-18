# 2026-10-18 운영 긴급 복구

권한: 사용자가 운영 오류의 긴급조치를 요청함. 무료 유지, 실제 사용자 콘텐츠의
검증 목적 영구삭제 금지. 기존 OPS-03 계획 변경은 보존하고 긴급 복구를 우선함.

## 확인한 원인과 수정

- 연령 기본 체크: `AuthEntryView` 초기값을 true로 변경. 해제 시 이메일/Google
  진입 차단 및 별도 약관 동의 절차는 유지.
- 삭제 실패: 실제 운영 RPC를 소유자 JWT 문맥에서 BEGIN/ROLLBACK으로 재현.
  `funnel_analytics_events`의 ON DELETE SET NULL이
  `funnel_analytics_events_once_per_session_idx`와 충돌해 23505 오류 발생.
  Storage 파일 삭제 이후 DB 삭제만 실패하여 미디어 없는 게시물이 남아 있었음.
  `202610180003`은 해당 게시물 분석 이벤트만 ON DELETE CASCADE로 정리함.
  별도 신고/검토 기록과 무관하며 RLS·불변 트리거·중복 방지 인덱스는 변경하지 않음.
- 재접속 피드 오류: signed URL 생성이 실패한 게시물 하나가 feed-media 오류로
  전체 피드를 중단시키는 경로 확인. 실패한 미디어만 로컬 안내 SVG로 대체하여
  게시물·소유자 삭제 동작·다른 정상 게시물은 그대로 유지. 인증 우회/평가 전
  집계 공개/새 업로드 제한 없음. iOS 브라우저 프로세스 종료 재현은 사용자 재확인 대상.
- Google: 실제 운영/스테이징 authorize 리다이렉트의 공개 client ID와 Google
  콘솔 FACtSmack 프로젝트 클라이언트가 일치함. 앱 이름은 이미 FACt.Smack.
  콘솔은 테스트 중, 개인정보/약관 URL 공란, 브랜드 미검증 상태였음.
  기존 승인 정책을 여는 `?policy=privacy` / `?policy=terms` 진입점 추가.
  브랜드 설정/검증은 Google 외부 절차이며, 서비스명 표시 완료로 보고하지 않음.
  paid custom domain 또는 유료 전환을 하지 않음.

## 검증/환경

- 선택 Node 테스트 6건 통과: 연령 기본값 1, 기존 부분삭제 재시도 1,
  피드/프로필 미디어 누락 복구 2, SQL 범위 1, 공개 정책 진입점 1.
- 스테이징 SQL: 임시 게시물 2건·같은 세션 분석 이벤트 3건을 생성해 연속 삭제,
  무관 이벤트 보존, 비인증 삭제 거부 확인. 모든 fixture는 트랜잭션 롤백.
- 운영 대상: 공개 도메인의 Vercel product-test Production URL 호스트
  rrcntobfmxlwbbjtlbge.supabase.co와 로그인된 Supabase Dashboard FACt.Smack
  ref를 대조. staging zvaheyfumpmzrolsbtrf와 구분.
- staging → production 순으로 위 외래 키만 적용. 운영 실제 오류 게시물 삭제
  RPC 성공 후 롤백; post_preserved=true와 ON DELETE CASCADE 확인.
- CLI 연결은 staging으로 복원. 전체 테스트·로컬 전체 빌드·중복 Preview 없음.
- 운영 화면 수정 배포는 이 문서를 포함한 main 커밋의 Git 자동 배포 1회로 진행.

후속: 운영 모바일 삭제/브라우저 재접속 사용자 확인, Google 브랜드 검증 완료,
그 다음 OPS-03 전송량 원인 조사. 이미 삭제된 Storage 원본 복구 가능성은 확인되지 않음.

## 후속 승인 및 Google 공개 전환

2026-10-18 사용자가 점검 항목 모두 승인. 이전 배포 커밋은
`63882f65320f2cb8d9f67f42cf37a8608825b63f`, 운영 배포
`dpl_EbarSS8fVTr3eXQ7e3qjSeSpc8vu` READY 및 공개 도메인 연결 확인 완료.
같은 항목의 재배포나 중복 테스트는 하지 않음.

- 사용자가 Google 공개 전환 확인 화면을 검토한 후 승인하여 확인을 실행함.
  콘솔 게시 상태가 ‘프로덕션 단계’로 바뀐 것을 확인.
- Google 데이터 액세스 인증은 민감/제한 범위가 없어 불필요하다고 콘솔이 표시.
  OAuth 범위·콜백·비밀키·승인된 도메인은 변경하지 않음. 과금 변경 없음.
- 브랜딩 상태는 별개로 미인증이며 ‘브랜딩 확인’을 실행함.
  Google의 ‘Verification in progress… / 최대 5분’ 응답을 확인.
- 공개 전환 증거: `/private/tmp/facs-google-production-enabled.png`.
  이 기록만을 위해 추가 Vercel 빌드를 실행하지 않음.

### 브랜드 확인 결과 — 공개 전환과 구분

Google 사전 검사가 다음 두 문제를 반환함:

1. `https://www.factsmack.com` 소유권이 현재 프로젝트 소유자 계정에 확인되지 않음.
   소유권 확인 뒤 시스템 반영을 위해 24시간 기다린 후 재시도하라고 안내함.
2. 홈페이지가 앱 목적과 Google API 사용의 적합성을 충분히 설명하는지 확인하지
   못함. 서비스 목적을 명확히 설명한 뒤 재시도하라고 안내함. 이는 Google 자동
   검사에서 확인할 수 없었다는 응답이며 실제 위반이 확인됐다는 뜻으로 보고하지 않음.

Search Console에서도 도메인 속성 `factsmack.com`과 URL-prefix
`https://www.factsmack.com/`은 미확인 상태. 기존 URL-prefix의 소유권 확인 화면에
HTML 파일·메타태그·Google Analytics·DNS 방법이 제공됨. 소유권을 새로 확정하는
동작이나 DNS 변경은 아직 실행하지 않음. 재검증/추가 검토 요청도 보내지 않음.
문제 화면 증거: `/private/tmp/facs-google-branding-issues.png`.

다음 범위: 홈페이지 소유권을 현재 Google 프로젝트 소유자 계정에 연결하고,
승인된 기존 정책은 그대로 두고 서비스 목적 설명을 홈페이지에 보강한 후
Google 안내 대기시간을 준수해 브랜드 확인 재시도. Supabase 도메인 때문에
무조건 유료 커스텀 도메인이 필요하다고 단정하지 않음.

### 승인된 소유권·홈페이지 보강

사용자가 홈페이지 소유권 확인과 서비스 목적 보강을 승인함.
Search Console의 기존 `https://www.factsmack.com/` URL-prefix 속성에 표시된
현재 계정의 HTML 메타태그를 추가함. 기존 Google/Naver 소유권 태그는 보존하고
DNS·콜백·OAuth 범위·비밀키는 변경하지 않음. 도메인 전체 DNS 속성 검증과는 구분함.

홈페이지에 사진/영상 공유와 주관적 평가 수집·결과 확인이라는 목적, Google
이메일/기본 프로필의 인증 용도, AI 이미지/영상 생성 서비스가 아니라는 설명을
한·영으로 추가함. 기존 금지 콘텐츠 원칙만 설명하며 새 기능 제한은 추가하지 않음.
React 실행 전의 HTML에도 목적과 정책 링크를 제공하고, 로그인 화면 정책 링크는
Google 설정과 같은 URL의 실제 anchor로 제공하되 기존 모달 열기 동작을 유지함.

집중 계약 테스트 3건 통과: 새 소유권 태그 및 기존 태그 보존, HTML/React의 서비스
설명, 정책 anchor와 기존 모달 계약. 로컬 실제 로그인 화면에 설명과 링크 노출 확인.
운영 product-test Production 호스트와 Supabase Dashboard의 운영 ref도 재대조함.
이 변경은 Git 자동 운영 배포 1회로 반영 후 Search Console에서 소유권 확인한다.
Google 안내의 24시간 대기 전 같은 브랜드 사전 검사를 반복 실행하지 않음.

결과 (2026-10-18 21:30 KST): Search Console이 ‘소유권이 확인됨 / HTML 태그’를
표시하여 홈페이지 URL-prefix 소유권 확인 완료. 확인 태그는 삭제하지 않음.
증거 `/private/tmp/facs-homepage-ownership-verified.png`.
홈페이지 목적 설명 배포 커밋 `1647851306313e9b906cc860e3863cd7c7ff897f`,
Vercel `dpl_ByUL45cornL9wzuvNBV1QRPWzcGZ` READY, 공개 도메인 연결 확인.
운영 HTML HTTP 200에서 기존/새 태그·목적 설명·개인정보 링크 확인;
실제 공개 로그인 화면에서도 설명과 anchor 노출 확인.
`/private/tmp/facs-homepage-purpose-live.png` 증거 보존.
최근 10분 Vercel 오류 필터에는 로그 없음(브라우저/DB 오류 전체 검증을 뜻하지 않음).
브랜드 재검증 가능 시각은 2026-10-19 21:31 KST 이후로 잡음.
아직 Google 브랜드 검증 통과 또는 서비스명 표시 완료가 아님. 이 결과 기록은
추가 빌드 방지를 위해 다음 실제 변경과 함께 커밋한다. 반복 검증 자동화는 만들지 않음.

### 사용자 요청에 따른 재검증 예약 및 최종 배포 대조

2026-10-18 후속 사용자 요청: 10월 19일 21:31 KST 이후 Google 브랜드 재검증,
완료됐지만 미배포인 승인 항목의 커밋·푸시·main 반영·운영 배포.

- 현재 대화에 연결한 일회 예약 `facs-google` 생성. 2026-10-19 21:31 KST에
  브랜드 검증을 다시 진행하고 실제 결과를 보고한다. Google 로그인 등 사람이
  필요한 경우만 조치를 요청하며, 임의의 반복 검사나 새 배포는 하지 않는다.
  기존 별도 FACS 승인·비용 알림 자동화는 변경하지 않음.
- 이번 승인 범위의 앱 코드·SQL·Google 외부 설정은 이미 반영되어 있었음.
  원격 main과 운영 READY 배포의 앱 커밋은 1647851로 일치.
- 미커밋 변경은 이 문서의 최종 소유권 확인·배포 결과 기록뿐임. 문서만 커밋해
  main에 푸시하고 사용자 요청에 따른 Git 자동 운영 배포로 마무리한다.
  별도 병합할 최신 승인 브랜치는 없음. 오래된 실험/QA 브랜치는 섞지 않음.
- 런타임 코드 변경이 없으므로 동일 테스트·로컬 빌드·Preview는 재실행하지 않음.
