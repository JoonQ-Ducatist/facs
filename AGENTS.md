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
