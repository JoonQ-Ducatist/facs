# Production share and scrolling recovery — 2026-11-02

User requested all three fixes and production deployment. Owner: Codex. Previous dirty UX/participation work remains in its original worktree/branch; this release is based on main 0b41d05 and contains only this incident.

Evidence: supplied video1 (5.30 seconds) shows the next article painting over a card-contained fixed share preview, and Valid ratings 0 / NO 100%. Feed articles use overflow clipping and inline-size containment; share dialog was rendered inside that article. The percentage complement was unconditional. Video2 (9.77 seconds) shows a persistent header and categories retreating/returning with scrolling direction.

Changes:
- Share preview uses the existing Radix Dialog body portal with modal focus/scroll isolation, Escape/outside dismissal and bounded internal overflow. Dialog touch/pointer events do not reach the card/media/tab gestures.
- Share display derives exclusively from actual card aggregates. Zero counts show no percentages or age; unavailable aggregate data is distinct from zero. Binary proportions use actual positive/negative counts, age uses the actual average only when present. Existing pre-rating result hiding applies to share previews too; authors retain result access. Shared URL/callback unchanged.
- Portrait header remains fixed. Downward feed scroll hides the category rail; upward scroll or feed top shows it. Four-pixel movement threshold ignores tiny jitter. No timeout-driven header movement or scrollport geometry changes. Desktop/landscape layout and bottom navigation are unchanged.

Focused verification: exactly four selected cases, no full suite/full local build/Preview deployment.
1. Data states: zero, missing, before vote, actual binary and age aggregates — PASS.
2. Share portal/callback/result permission wiring contract — PASS.
3. Portrait shell/category-only movement contract — PASS.
4. Browser component flow at 390x760: actual FeedView/ShareResultCard/Dialog/global CSS, App's exact scroll handler in a local shell fixture. Down hides categories, up restores, header remains. Share portal parent BODY, card bounds x16..374/y268.5..491.5; repeated modal/edge scrolling leaves main.scrollTop 266. Share callback reached, Escape closes and feed returns — PASS.

Case4 is an isolated component fixture with synthetic local cards, not real authentication, upload/vote storage, an iPhone Safari/PWA run, or an external message send. No production user data was changed. JSX parse and diff whitespace checks passed.

Release target: actual Vercel domain www.factsmack.com -> product-test prj_TO6nO7SfgNp0rzrBpxNDK1DMTrJq / team_73YMuIOoV5ob2rEKH6sRsquE. Its Production VITE_SUPABASE_URL host rrcntobfmxlwbbjtlbge.supabase.co matches the live Supabase Dashboard ref and displayed project URL. Vercel connector returned403; existing authorized CLI supplied the same read-only target confirmation. No DB migration or permission changes required.

Artifacts: /Users/joonkyou.park/.codex/visualizations/2026/10/14/01a13ab1-2cda-7c01-83bb-823c08d8f48e/share-scroll-fix-2026-11-02/ . Main Git push is the sole production deployment trigger. Do not issue an additional CLI deploy for the same SHA.
