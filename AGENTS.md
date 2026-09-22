# FACS collaboration

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
