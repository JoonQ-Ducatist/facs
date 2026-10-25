# 승인된 검색·분석·PWA 운영 반영 (2026-10-25)

## 승인과 범위

사용자가 PWA 피드·랭킹·프로필 노출을 확인하고 5초 지연 변경을 승인했으며, 지금까지 완료·승인된 항목의 커밋·푸시·main 병합·운영 배포를 명시 요청했다.

- DISC-02: 영어·한국어 서비스 소개/FAQ, 정적 본문·메타·WebPage, robots 절대 sitemap 주소.
- ANA-04: 첫 평가의 전체 평가 이벤트 보완, 운영 호스트 제한, referrer/URL 정보 최소화와 실패 격리.
- PWA: 한·영 5초 안내, 세로·가로 반응형, 방문 닫기·당일 숨김, 업로드 제외, 언어별 manifest·기존 아이콘·network-only 서비스워커.
- 기존 기록 커밋 `6367000`도 현재 운영 `646ceee` 이후 변경이므로 함께 포함한다.

기존 선택 테스트와 사용자 화면 확인 결과를 재사용한다. 전체 테스트·로컬 전체 빌드·새 Preview를 중복 생성하지 않는다. 작업 브랜치에 커밋 후 main으로 병합하고 Git 연동 운영 배포 한 번만 사용한다. DB·OAuth·DNS·요금제 변경은 없다.

## 운영 대상 사전 대조

- Vercel API: 팀 `team_73YMuIOoV5ob2rEKH6sRsquE`, 프로젝트 `prj_TO6nO7SfgNp0rzrBpxNDK1DMTrJq` (`product-test`), 저장소 `JoonQ-Ducatist/facs`, Production 브랜치 `main`, 현재 운영 도메인 `www.factsmack.com` 확인.
- 해당 프로젝트의 Production `VITE_SUPABASE_URL` 호스트: `rrcntobfmxlwbbjtlbge.supabase.co`.
- 로그인된 Supabase Dashboard의 프로젝트 `FACt.Smack`, ref `rrcntobfmxlwbbjtlbge`, 화면의 공개 URL과 일치 확인.
- 연결 Vercel MCP의 팀 접근 403 때문에 기존 인증 CLI로 동일 팀·프로젝트를 읽기 전용 확인했다. 새 권한 부여나 인증 변경은 하지 않았다.

## 검증 기록

기존 DISC-02/ANA-04 집중 테스트 5개, PWA 계약 3개와 초기화 후속 테스트 2개, 5초 타이머·허용 화면 확인 2개 및 사용자 피드·랭킹·프로필 확인을 참조한다. 각 수정 시점의 결과이며 반복 실행한 총 테스트 수로 해석하지 않는다. 릴리스 후 원격 배포 상태와 공개 HTML/robots/PWA 파일을 좁혀 확인하고 결과를 이어 기록한다.
