# FACS Antigravity QA 실행

## 설치와 역할

- 기존 IDE: `/Applications/Antigravity IDE.app`
- 공식 CLI: `/Users/joonkyou.park/.local/bin/agy` (설치 manifest 1.1.27).
- 공식 설치기의 SHA512 검증 완료. 셸 PATH는 공식 설치기가 추가했다.
- 최초 온보딩에서 Google Interactions data 제공 선택은 해제했다.
- 인증 후 최소 응답 `FACS_QA_READY`를 실제 수신했다.
- Antigravity는 소스/정책 수정 없이 브라우저 QA와 독립 의견을 반환한다.
- QA 관찰 페르소나는 서울에 거주하며 패션·뷰티·운동과 다양한 취미를 즐기고 SNS를 자주 사용하는 트렌디한 20~30대 직장인 여성이다. 작은 시각적 어색함, 조작의 망설임, 피드 맥락이 끊기는 순간을 결함으로 본다.
- 사용자에게 브라우저 점검을 요청할 때는 반드시 Markdown 표로 제공한다. 열은 `점검 항목 | 클릭 순서 | 정상 기준`으로 고정하고, 클릭 순서는 `A → B → C` 화살표 표기만 사용한다. 두 계정이나 실제 휴대폰처럼 준비가 필요한 경우에는 표 첫 행에 준비 단계를 넣는다.
- 공개 화면 QA 권한은 승인된 서비스 도메인에만 한정한다. 그 외 웹사이트, 로컬
  소스, 기획 문서, 비밀값은 별도 명시적 승인이 없으면 전달하거나 읽지 않는다.

## 판정 경계

- Antigravity는 독립 화면 QA 담당이다. 화면의 가독성, 터치 동선, 빈 상태, 반응형, 언어 전환과 접근성 관찰을 판정한다.
- 실제 인증, 메일 수신, 사진 업로드, 투표·스크랩 제출, 데이터 저장과 실시간 집계는 별도 격리 브라우저 흐름 QA가 판정한다. Antigravity 결과만으로 이 기능들을 통과로 표기하지 않는다.
- 실제 휴대폰 Chrome/Safari의 키보드, 가로 회전, 안전 영역, 브라우저 바 변화는 실기기 QA가 판정한다. Antigravity의 모바일 화면 관찰은 보조 증거다.
- 보고서는 항상 `독립 화면: PASS/FAIL/BLOCKED`, `기능 흐름: 별도 결과 참조`, `실기기: PASS/FAIL/PENDING`을 구분해 기록한다.

## PM 실행

현재 소스/기획 문서의 Google 전달은 자동 승인 검토에서 차단되었으며 사용자의
구체적 승인 대기 상태다. 승인 전에는 아래 공개 화면 전용 모드만 사용한다.

```sh
node scripts/qa/antigravity.mjs --url https://product-test-eosin.vercel.app/ --task FACS-PUBLIC-QA-001 --mode public
```

public 모드는 로컬 소스/기획/Git을 읽거나 복사하지 않고 URL과 일반 동선만 전달한다.
로그인, 평가 제출, 업로드, 결제 없이 탐색·관찰만 한다. 브라우저 도구가 불가하면
BLOCKED로 보고한다. 공개 화면 QA는 실제 인증·저장·집계 검증을 대신하지 않는다.

공개 화면 관찰에서 발견된 사용자 여정·수익화·지표 관련 항목은 `(03) 서비스 설계`로,
화면 표현·반응형·가독성 관련 항목은 `(02) 디자인 시스템`으로 보낸다. 구현 수정은
`(01) Code 개발`만 수행한다.

### 소스 전달 승인 후 사용

구현 담당에게 실제 미리보기 주소와 소스 상태를 받은 뒤 저장소에서 실행한다.

```sh
node scripts/qa/antigravity.mjs --url http://localhost:5173 --task FACS-20260905-001 --mode mock
```

- `--prepare-only`: 모델 호출 없이 전달 자료만 생성.
- `--brief-file /absolute/path.md`: PM의 상세 검증 지시 추가.
- `--output /absolute/new-directory`: 새 결과 디렉터리 지정.
- `--mode staging`: 별도 승인된 테스트 환경에만 사용. 운영 URL을 넘기지 않는다.

스크립트는 서버를 시작하지 않는다. 각 실행은 별도 임시 작업 폴더에 선택된
src 코드와 memory-bank 문서를 복사하며 `.env`와 인증 정보는 복사하지 않는다.
plan 모드를 쓰고 권한 우회 플래그를 쓰지 않는다. 이 모드는 OS 수준의 읽기
전용 보장이 아니므로 격리된 폴더와 보고 전용 지시를 함께 적용한다.

## 결과

- manifest.json: commit, 선택 소스 fingerprint, dirty 상태, URL, 모드, 복사 파일 목록.
- report.json / report.md: 관찰과 제안, 파일/라인, 지표, 검증 모드, 미검증 항목.
- status.json: PASS/FAIL/BLOCKED/INCOMPLETE/STALE_SOURCE 및 실행 실패 원인.
- agent-output.json / diagnostics.log: 로컬 진단 파일. 공개 Git에 올리지 않는다.
- workspace/: 동결된 코드/계약 사본 및 브라우저 증거.

브라우저 불가 시 CODE_REVIEW_ONLY로 보고하며 코드 리뷰를 브라우저 PASS로
취급하지 않는다. 실행 중 소스가 변하면 STALE_SOURCE이며 재검증이 필요하다.
dirty 소스의 결과는 개발 QA이고 출시 승인이 아니다. 로컬 fingerprint만으로
미리보기 URL이 같은 코드를 제공함을 증명할 수 없다.

UI/목업 QA는 실제 로그인 이메일 전송, 실사진 업로드, 결제, 운영 데이터 변경을
하지 않는다. 실제 Auth/DB 검증은 별도 테스트 계정과 시나리오로 분리한다.

## 세션 복구

세션 종료, 타임아웃, 빈 응답은 QA 결과가 아니다. PM은 CLI 세션을 복구하거나
재인증 필요 여부를 먼저 확인하고, 파일·브라우저 조작 없는 최소 응답 probe를
성공시킨다. 이후 동일한 커밋, URL, 범위로 QA를 다시 실행한다. 유효한
`PASS`·`FAIL`·`BLOCKED` 보고서와 증거가 없으면 사용자 시각 검토와 `main` 병합을
진행하지 않는다. 사용자 로그인이나 외부 상태 변경이 필요한 경우에만 필요한
조치와 함께 `BLOCKED`로 사용자에게 알린다.
