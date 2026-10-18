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
