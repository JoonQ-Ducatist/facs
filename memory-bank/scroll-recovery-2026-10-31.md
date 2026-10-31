# 운영 모바일 피드 떨림 긴급 수정 / PWA 언어 읽기 전용 확인 — 2026-10-31

## 요청과 경계
운영에서 위아래 떨림 원인 조사·즉시 수정 요청. 첨부 /private/tmp/ScreenRecording_10-31-2026 18-13-14_1.MP4 (4.56초). PWA 아이콘 한국어 시작은 확인만 요청하여 언어·manifest·SEO·설치 로직을 변경하지 않는다.

## 증거·원인
로컬 AVFoundation으로 영상 0.5초 간격 10프레임 추출. 미디어·계정·게시물·결과가 바뀌지 않는 같은 위치에서 헤더 일부가 보였다 가려지고 카드 경계가 함께 이동함. 운영 코드 handleMainScroll은 세로 모바일 스크롤 시 헤더를 숨기고 마지막 이벤트 후 220ms에 복원한다. 이전 CSS는 헤더 숨김 상태에 맞춰 feed main inset을 헤더 높이 44px에서 0으로 전환하고 .2초 애니메이션을 적용했다. 스크롤 영역 이동/리사이즈가 iOS 스크롤 보정과 결합해 재스크롤·헤더 상태 반복을 유발할 수 있는 구조였다.

## 최소 수정
src/styles/global.css에서 헤더 상태에 따른 피드 inset 변경과 inset 애니메이션만 제거. 헤더 transform 숨김·220ms 복원, 탭·스크롤·평가·참여 인원·다음 사진·업로드 동작은 유지. 공유 main에는 새 강제 높이·overflow 우회·스크롤 강제 초기화·타이머를 추가하지 않는다.

## 집중 검증 2개
1. 기존 모바일 헤더 계약 테스트 이름 필터 1개: 통과. 기존 헤더/내비/화살표 유지 및 헤더 상태가 main을 이동시키지 않는 조건 확인.
2. 실제 운영 CSS 변경 전·후를 각각 390×700 세로 iframe에서 구동. 같은 헤더 상태를 6회 전환하고 DOM 좌표 측정. 변경 전 main topRange 44px / heightRange 44px / contentRange 44px, 변경 후 모두 0px. headerChanges는 양쪽 모두 2이므로 헤더 숨김·표시는 유지. 모의 CSS 지오메트리 검증이며 아이폰 실기에서 같은 녹화를 재현·해결 확인했다고 주장하지 않는다.

증빙은 작업공간 scroll-recovery-2026-10-31/contact.png 및 geometry-proof.png. 전체 테스트·전체 로컬 빌드·반복 운영 미디어 QA 없음.

## PWA 확인만 수행
운영 GET /는 /manifest.webmanifest를 링크하며 lang=en, start_url=/?source=pwa. /ko/는 /manifest-ko.webmanifest를 링크하며 lang=ko, start_url=/ko/?source=pwa. 두 manifest id는 /로 동일. resolveLocale의 기본값은 en이며 /ko/ 경로는 ko를 우선한다. 한국어 페이지에서 설치한 아이콘의 한국어 시작은 현재 언어별 설치 설계에 해당하며 모든 PWA를 한국어로 강제하는 기본값은 없다.

추가 확인: 화면 언어 전환 switchLocale→applySeoMetadata는 페이지 URL/문서언어 등을 바꾸지만 manifest 링크는 갱신하지 않는다. /ko/에서 처음 연 페이지를 SPA로 영어 전환한 뒤 설치하면 화면은 영어여도 한국어 manifest가 남는 경로가 있다. 아이폰에 이미 설치된 해당 아이콘의 실제 시작 URL·설치 시점은 원격 확인 불가하므로 어느 경로였는지는 단정하지 않는다. 영문 기본 정책과 별개로 설치 당시 문서/manifest·기존 아이콘 정보의 영향을 받는다. 수정·재설치·설정 변경 없음.

## 운영 대상·반영
공개 도메인 프로젝트 prj_TO6nO7SfgNp0rzrBpxNDK1DMTrJq 및 Production Supabase URL rrcntobfmxlwbbjtlbge.supabase.co를 읽기 전용 확인했고 열린 Dashboard ref와 일치. DB 변경 없음. CSS·해당 테스트·이 기록만 main 반영하며 완료 증거는 작업공간 scroll-recovery-2026-10-31/completion.md에 기록한다.
