# FACS collaboration

## 최상위 필수 핵심 규칙 — 효율적 검증과 출시

이 절은 FACS의 프론트엔드, 백엔드, 디자인, 서비스 설계, QA, Git, Preview,
운영 배포를 포함한 모든 작업에 최우선으로 적용한다. 다른 절차와 충돌하면 이 절을
우선하며, 예외는 사용자의 명시적인 승인만 가능하다.

1. 모든 요청은 시작 전에 `UI만 수정`, `기능 수정`, `운영 오류` 중 하나로 분류하고,
   영향 화면·상태·데이터 경계를 한 번만 확정한다.
2. 직접 원인과 관련 파일·최근 변경은 한 번의 집중 조사로 확인한다. 같은 명령, 화면,
   URL, 로그, 스크린샷을 원인 변화 없이 반복하지 않는다.
3. 수정은 해당 기능 경계 안에서 최소화한다. 공용 자산·상태·계약을 건드릴 때만 그
   인접 범위를 함께 확인한다.
4. 일반 UI 수정은 반드시 `원인 확인 → 최소 수정 → 관련 테스트 → 로컬 시각 확인`으로
   끝낸다. **전체 테스트, 전체 화면 점검, 반복 Preview 생성은 기본 절차에서 제외한다.**
5. 회귀 검증은 변경과 직접 연결된 테스트와 핵심 브라우저 흐름 한 번만 실행한다.
   전체 테스트·전체 화면 점검·운영 빌드는 사용자가 필요 사유와 범위를 들은 뒤
   명시 승인한 경우에만 한 번 실행한다.
6. 사용자의 로컬 확인이 필요한 UI는 기존 개발 서버·열린 탭·고정 URL을 재사용한다.
   확인 승인 후에만 커밋 묶음과 배포 절차로 이동하며, 새 Preview를 습관적으로 만들지
   않는다.
7. 운영 배포는 승인된 고정 커밋 묶음에 대해 한 번만 수행하고, 변경 기능의 운영 핵심
   흐름 한 번으로 확인한다. 재발한 원인은 관련 회귀 검증으로만 추가해 다음 작업에서
   같은 조사·검증을 반복하지 않는다.

이 규칙은 사용량에 따른 자동 중단 규칙을 만들지 않는다. 목표는 작업을 멈추는 것이
아니라 무관한 전체 검사, 반복 브라우저 호출, 새 Preview·재배포를 제거해 품질과 속도를
함께 지키는 것이다.

Read `memory-bank/team-workflow.md` before accepting or routing work.

## 작업 시간·사용량 절감 규칙

FACS의 모든 작업공간은 아래 실행 기준을 함께 적용한다.

- 과제 착수 때 이미 확인된 승인, 브랜치, 로컬 QA 설정을 다시 조사하지 않는다. 필요한 경우 상태 조회를 한 번에 묶는다.
- 구현은 역할별 기존 작업공간에 한 명의 담당자를 지정해 전달한다. 전달문에는 완료 기준, 수정 경계, 금지 범위, 반환 증거를 한 번에 적는다.
- 독립적으로 할 수 있는 PM 검토는 담당자 작업과 병행한다. 상태 변화가 없는 짧은 간격의 대기·재질문·동일 명령 반복을 하지 않는다. 장시간 작업은 한 번의 적절한 대기 후 결과가 없으면 확인 가능한 현황과 차단 요인을 보고한다.
- 회귀 검증은 바뀐 계약에 직접 연결된 테스트와 핵심 흐름만 한 번 실행한다. 전체 테스트·화면 점검·빌드는 명시 승인된 필요 사유와 범위가 있을 때만 진행한다.
- 테스트 파일에 무관한 사례가 섞여 있으면 파일 전체 대신 변경 계약의 테스트 이름을 골라 실행한다. 팔로워 전용 평가·새로고침 복구는 Storage 접근 계약, 중복 투표·내 투표 상태·집계 복구의 관련 사례와 실제 2계정 흐름으로 확인한다. 테스트 개수 자체를 목표로 삼지 않는다.
- 일반 오류 수정은 실행 전에 증상과 직접 연결된 테스트 이름을 먼저 고정하고 기본 2~5개만 한 번 실행한다. 같은 위험을 실제 사용자 흐름에서 확인했다면 이를 반복하는 유사 단위 테스트를 더하지 않는다. 5개를 넘겨야 할 때는 공용 계약 영향과 추가할 정확한 테스트를 사용자에게 먼저 설명하고 승인을 받은 뒤 실행한다.
- QA 데이터는 생성 전에 식별 조건을 기록하고, 테스트가 끝나면 그 과제에서 만든 데이터만 한 번에 정리한다. 실제 사용자 데이터를 추측해 지우지 않는다.
- 저장소·백로그·협업공간은 정본 위치를 먼저 확인하고, 필요한 문서와 파일만 읽는다. 광범위 검색과 이미 확인된 정보의 재수집은 피한다.
- 커밋 전에 승인된 변경만 묶고, 논리적으로 구분이 필요한 경우에만 별도 커밋한다. 중복된 staged diff 검사·상태 확인은 줄인다.
- 사용자 보고에는 수행 사실, 검증 근거, 미완료 항목을 한 번에 요약한다. 단계별 중간 보고와 사용량 절감률을 근거 없이 수치화하지 않는다.
- 역할 작업공간은 한 턴에 구현 단위 하나만 맡는다. 5분 안에 완료하기 어렵다면 무응답 상태로 조사·재시도를 계속하지 말고, 그 시점의 완료 내용·차단 원인·남은 최소 단위를 즉시 PM에 반환한다. PM은 반환된 증거로 다음 단위를 다시 배정한다.
- 백엔드는 마이그레이션·API·UI·실계정 E2E를 한 턴에 모두 묶지 않는다. 계약/마이그레이션, API 연결, 실제 흐름 검증을 각각 독립 단위로 수행한다. 프론트엔드는 국소 수정 한 묶음과 직접 테스트만 수행하며, 단순 CSS는 `git diff --check`로 끝낸다.

시간 또는 사용량 절감을 이유로 필요한 보안·기능 검증을 생략하지 않는다. 절감은 중복 탐색, 대기, 보고, 무관한 검사 제거로 달성한다.

The master is the Codex task titled `★ PM ★` in the ChatGPT project `창업`.
The actual repository is this directory, not the old vercel-vercel or product-test directories.

The operating roles are: `★ PM ★` for requirements, task routing, release decisions,
and user reporting; `(00) 에이전트 세팅` for collaboration rules and independent
review; `(01) 프론트엔드 작업` for implementation, tests, fixes, and documentation;
`(02) 디자인 시스템` for visual UI, components, readability, responsive presentation,
and interaction expression; `(03) 서비스 설계` for journeys, requirements, product
policy, priorities, cash flow, and metrics; `(04) 백엔드 작업` for Supabase schema,
RLS, Storage, server contracts, and data-path verification. Antigravity is report-only
browser QA, and GitHub CI runs repeatable checks. The PM must re-check available tasks
and their actual scope before routing new work because the project spaces can change.

Read the current user request, then `memory-bank/service-design-rule.md`,
`memory-bank/TECH-AGENTS.md`, and relevant API/result contracts. Product decisions
and implementation status are different: reconcile stale status against code and
evidence; do not silently reinterpret product policy.

Implementation has one owner per overlapping file set. Preserve existing dirty
changes. Antigravity is report-only QA; findings return to Codex for fixes.
Do not mark mock tests as real Auth/DB/Storage validation.
Every handoff and QA result names its task ID, commit, mode, and evidence.
Product-flow findings go to `(03)`; visual findings go to `(02)`; implementation
findings go to `(01)`. A task may involve all three, but only one implementation
owner may change a given file set.

If an Antigravity QA session ends, times out, or returns no report, the PM first
checks whether the CLI session can be recovered or needs re-authentication. Run a
minimal response probe successfully, then repeat QA against the same commit, URL,
and scope. Without a valid PASS, FAIL, or BLOCKED report and its evidence, do not
request user visual review or merge to `main`. Ask the user only when recovery needs
their login or another external-state change.

When a delegated task completes, its owner returns the result, artifacts to review
(local paths, PRs, or URLs), and the exact user-approval wording needed to `★ PM ★`.
The user does not approve work inside a delegated task. The PM tells the user what to
review and where, then records the only final approval in `★ PM ★`.

Never implement directly on `main`. Create a task branch, commit and push it,
open a draft PR to `main`, and use its Vercel Preview URL for review. Code or UI
changes require passing CI, Antigravity QA, and explicit user approval in `★ PM ★`
before merge. A blocked or incomplete QA result is not approval. Do not start the
next ordered task until the current task is approved and merged. Direct pushes to
`main` are reserved for a user-approved emergency fix and must be documented.

Follow `memory-bank/team-workflow.md`'s risk-based verification rules: run focused
tests and checks for the affected behavior during implementation. Low-risk isolated
UI changes do not require the full suite or a production build. A full suite or
production build is never automatic, including for a release: the PM must first
state why it is necessary and receive the user's explicit approval for that exact
full check. Then repeat only the affected checks if source changes after that gate. The PM may request
independent design and review work in parallel, but must check active tasks first.

For a reported production defect, once concrete runtime evidence, its direct cause,
and focused regression checks are complete, the user has pre-approved the fix through
commit, main merge, and production deployment. Do not wait for a second deployment
approval. This does not authorize a full suite or production build.

Gemini is an opt-in research specialist for FACS, not a per-task implementation
step. Use it only for time-sensitive external research, broad competitor or market
comparison, large or multimodal source analysis, a material product-policy choice,
or an architecture decision with credible alternatives. Do not invoke it for a
specified implementation, local bug reproduction, styling adjustment, test/build/CI,
Git operation, deployment procedure, or repeated QA. One bounded pass may support
one decision packet; later edits and checks under the same decision reuse that result.
If unavailable, record the reason once for that decision packet and continue without
retrying it.
Do not recursively send routing requests back to the master; return results once.
For each screen, UI, or behavior that needs user approval, use the relevant local,
Preview, or `main` URL in external Google Chrome. Reuse an already open task tab with
refresh or hard refresh; open a new tab only when no suitable tab exists or isolation
is required. Do not use the Codex in-app browser or panel as the approval surface.
Record the URL, source branch, and commit with the approval request. Do not start the
next implementation task until the user has approved that exact visual-review target
in `★ PM ★`.
