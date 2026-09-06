# FACS collaboration

Read `memory-bank/team-workflow.md` before accepting or routing work.
The master is the Codex task titled `★ PM ★` in the ChatGPT project `창업`.
The actual repository is this directory, not the old vercel-vercel or product-test directories.

The operating roles are: `★ PM ★` for requirements, task routing, release decisions,
and user reporting; `(00) 에이전트 세팅` for collaboration rules and independent
review; `(01) Code 개발` for implementation, tests, fixes, and documentation;
`(02) 디자인 시스템` for visual UI, components, readability, responsive presentation,
and interaction expression; `(03) 서비스 설계` for journeys, requirements, product
policy, priorities, cash flow, and metrics. Antigravity is report-only browser QA,
and GitHub CI runs repeatable checks. The PM must re-check available tasks and their
actual scope before routing new work because the project spaces can change.

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

Never implement directly on `main`. Create a task branch, commit and push it,
open a draft PR to `main`, and use its Vercel Preview URL for review. Code or UI
changes require passing CI, Antigravity QA, and explicit user approval in `★ PM ★`
before merge. A blocked or incomplete QA result is not approval. Do not start the
next ordered task until the current task is approved and merged. Direct pushes to
`main` are reserved for a user-approved emergency fix and must be documented.

Run `npm test` and `npm run build` for implementation changes. The PM may request
independent design and review work in parallel, but must check active tasks first.
Do not recursively send routing requests back to the master; return results once.
For each screen, UI, or behavior that needs user approval, open the relevant local,
Preview, or `main` URL in a new external Google Chrome window or tab. Do not use the
Codex in-app browser or panel as the approval surface. Record the URL, source branch,
and commit with the approval request. Do not start the next implementation task until
the user has approved that exact visual-review target in `★ PM ★`.
