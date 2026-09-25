# FACS collaboration

## 최상위 공통 프로토콜

이 절은 FACS의 프론트엔드, 백엔드, 디자인, 서비스 설계, QA, Git, Preview,
운영 배포를 포함한 모든 작업의 단일 정본이다. `memory-bank/team-workflow.md`의
세부 절차는 이 프로토콜을 보완할 뿐, 중복하거나 달리 해석하지 않는다. 기존 브랜치,
승인, 출시 정책은 그대로 유지하며 예외는 사용자의 명시 승인만 가능하다.

1. **분류와 원인 확인:** 요청을 `UI만 수정`, `기능 수정`, `운영 오류`로 분류하고 영향
   화면·상태·데이터 경계를 확정한 뒤, 관련 파일·최근 변경·직접 원인을 한 번의 묶음
   조사로 확인한다. 원인 변화 없이 같은 명령, 화면, URL, 로그, 스크린샷을 재실행하지
   않으며 이미 확인된 승인·브랜치·QA 설정도 재조사하지 않는다.
2. **영향 계약:** UI와 서버가 함께 바뀌면 구현 전에 데이터, 권한, 입력값, 성공·실패,
   직접 회귀 범위를 한 번에 고정한다. 계약이 불명확하면 구현을 시작하지 않는다.
   DB, RLS, Storage 변경은 UI 연결 전에 같은 권한 세션으로 관련 read/write RPC, row query,
   signed media URL(해당 시)까지 직접 데이터 경로를 한 번 확인한다.
3. **소유와 범위:** 과제는 하나의 변경 단위로 나누고, 겹치는 파일 집합은 한 명만 수정한다.
   담당자에게 완료 기준, 파일 범위, 금지 범위, 반환 증거를 한 번에 전달한다. 필요한
   독립 PM 검토만 병행하며 무관한 리팩터링을 섞지 않는다.
4. **선택 검증:** 변경 계약에 직접 연결된 테스트 2~5개와 핵심 브라우저 흐름 1회만
   실행한다. QA 데이터는 식별 조건을 먼저 기록하고 과제 생성분만 정리한다. 보안,
   인증·권한·데이터 계약처럼 위험이 큰 변경의 필요한 검증은 생략하지 않는다.
5. **반환과 재시도:** 5분 안에 끝나기 어렵거나 연결이 맞지 않으면 완료 내용, 차단 원인,
   남은 최소 단위를 반환한다. 상태 변화나 새 원인 없이 짧게 대기·polling·동일 질문·재시도를
   반복하지 않는다.
6. **Gemini 사용:** Gemini는 최신 외부 조사, 넓은 시장·경쟁 비교, 대형 다중 자료 분석,
   실질적인 제품 정책·아키텍처 대안 결정에만 PM이 결정 질문과 기대 산출물을 고정해
   한 번 사용한다. 구현, 로컬 버그·QA, UI 조정, 테스트·Git·배포에는 사용하지 않는다.
7. **승인 범위:** 전체 테스트, 전체 화면 점검, Preview, 배포는 필요 사유와 범위를 사용자가
   명시 승인한 경우에만 실행한다. 논리적 경계가 있을 때만 커밋을 나누며, 최종 보고는
   수행 내용·근거·남은 항목을 한 번에 요약한다. 사용량 자동 중단이나 근거 없는 절감률
   수치화는 만들지 않는다. 모든 사용자 점검표에는 각 항목의 점검 모드와 정확한 URL,
   또는 URL이 없는 이유를 함께 적는다.

품질 절감이 목적이 아니다. 중복 탐색·대기·무관한 검사만 줄이며, 정본 위치를 먼저
확인하고 기존 dirty 변경을 보존한다. 상세한 역할, 승인, QA, 브랜치, 출시 규칙은
`memory-bank/team-workflow.md`를 따른다.

작업 착수, 오류 수정, 국소 검증은 사용자에게 매번 승인 질문을 하지 않고 즉시 시작해
결과만 보고한다. 단, 커밋, 원격 푸시, `main` 병합, 운영 배포처럼 외부 상태를 바꾸는
행위는 사용자의 별도 배포 지시 또는 기존 긴급 배포 권한을 따른다.

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
