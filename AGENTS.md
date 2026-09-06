# FACt.Smack collaboration

Read `memory-bank/team-workflow.md` before accepting or routing work.
The master is the Codex task titled `★ PM ★` in the ChatGPT project `창업`.
The actual repository is this directory, not the old vercel-vercel or product-test directories.

Read the current user request, then `memory-bank/service-design-rule.md`,
`memory-bank/TECH-AGENTS.md`, and relevant API/result contracts. Product decisions
and implementation status are different: reconcile stale status against code and
evidence; do not silently reinterpret product policy.

Implementation has one owner per overlapping file set. Preserve existing dirty
changes. Antigravity is report-only QA; findings return to Codex for fixes.
Do not mark mock tests as real Auth/DB/Storage validation.
Every handoff and QA result names its task ID, commit, mode, and evidence.

Never implement directly on `main`. Create a task branch, commit and push it,
open a draft PR to `main`, and use its Vercel Preview URL for review. Code or UI
changes require passing CI, Antigravity QA, and explicit user approval in `★ PM ★`
before merge. A blocked or incomplete QA result is not approval. Do not start the
next ordered task until the current task is approved and merged. Direct pushes to
`main` are reserved for a user-approved emergency fix and must be documented.

Run `npm test` and `npm run build` for implementation changes. The PM may request
independent design and review work in parallel, but must check active tasks first.
Do not recursively send routing requests back to the master; return results once.
After every local, remote-branch, or `main` deployment handoff, open the relevant
live URL in a new Chrome tab for the user. Treat that browser tab as the shared
visual-review surface; record which source and URL it represents.
