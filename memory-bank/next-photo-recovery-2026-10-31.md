# 다음 사진 이동 시 카드 상단 가림 수정 — 2026-10-31

## 요청·증거
사용자 IMG_7745.jpg에서 다음 사진 이동 후 작성자·카테고리 영역이 상단 고정 영역에 가림. RatingParticipation의 moveTo는 element.scrollIntoView(block:start)를 호출하고 고정 category rail의 높이를 빼지 않았다. 이 API는 상위 문서/숨김 프레임도 스크롤할 수 있다.

## 수정 경계
실제 overflowY auto/scroll 피드 소유자만 찾아 scrollTo. owner clientTop, 현재 scrollTop, 카드 좌표, 헤더 하단과 owner 안의 sticky rail 높이를 반영하고 8px 여유를 둔다. 바깥 document/body/canvas는 이동하지 않음. 내부 feed가 독립 스크롤하는 가로/PC에서는 바깥 rail 높이를 중복 차감하지 않음. 첫/마지막 경계 clamp, reduced motion은 auto. 데모 사진 보기·평가 전/후 다음 사진이 같은 함수를 사용. 이전 067a086의 스크롤 영역 안정화 CSS, 헤더 토글·평가·업로드·PWA 언어는 수정하지 않는다.

## 집중 검증 5개
1. 세로: sticky rail 아래 목표 위치 계산.
2. 가로/PC: 내부 피드만 이동, 외부 rail 중복 차감 없음.
3. 첫/마지막 카드 경계와 reduced motion.
위 Node 테스트 3개 통과.
4. 실제 CSS/이동 함수 및 현재 App의 헤더 스크롤 핸들러로 만든 390×700 세로 iframe 비교. 기존 카드 상단 56px / 보이는 영역 시작 84px / 가림 28px. 수정 후 카드 상단 100px / 보이는 영역 시작 84px / 여유 16px. 기존 scrollIntoView 비교 동작이 검증 페이지의 상위 문서까지 이동시키는 것도 화면에서 확인. 수정 함수는 owner만 조작.
5. 844×390 가로 iframe 비교: 기존 여유 0px → 수정 후 8px. 수정 후 canvasOffset/documentOffset 0.
브라우저 검증은 단순화한 로컬 레이아웃이며 아이폰 실기·운영 인증/투표 테스트로 표현하지 않는다. 증빙은 작업공간 next-photo-recovery-2026-10-31/geometry-proof.png. 전체 테스트·전체 로컬 빌드·반복 운영 미디어 QA·DB 변경 없음.

## 대상·배포
공개 도메인 연결 프로젝트 prj_TO6nO7SfgNp0rzrBpxNDK1DMTrJq / Production Supabase URL rrcntobfmxlwbbjtlbge.supabase.co를 기존 CLI로 확인. 열린 Dashboard ref rrcntobfmxlwbbjtlbge와 일치. 이번 이동 함수·연결부·테스트·기록만 main 반영, 단일 Git 운영 배포. 이후 사용자 요청의 유입·등록·평가 확대 대안은 리서치 제안만 하고 승인 없이 추가 구현하지 않는다.
